const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const geminiService = require('./geminiService');
const { logger } = require('../utils/logger');

class SocketService {
  constructor() {
    this.activeUsers = new Map(); // Store active socket connections
  }

  initializeSocket(io) {
    this.io = io;

    // Authentication middleware for socket connections
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password -refreshToken');
        
        if (!user || !user.isActive) {
          return next(new Error('Authentication error: Invalid user'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    return io;
  }

  handleConnection(socket) {
    const userId = socket.userId;
    
    // Add user to active users
    this.activeUsers.set(userId, {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date()
    });

    logger.info(`User connected: ${socket.user.email} (${socket.id})`);

    // Join user to their personal room
    socket.join(`user_${userId}`);

    // Handle chat events
    socket.on('join_chat', this.handleJoinChat.bind(this, socket));
    socket.on('send_message', this.handleSendMessage.bind(this, socket));
    socket.on('typing_start', this.handleTypingStart.bind(this, socket));
    socket.on('typing_stop', this.handleTypingStop.bind(this, socket));
    socket.on('voice_message', this.handleVoiceMessage.bind(this, socket));
    socket.on('message_read', this.handleMessageRead.bind(this, socket));

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to MindEase chat service',
      user: socket.user,
      serverTime: new Date()
    });
  }

  async handleJoinChat(socket, data) {
    try {
      const { sessionId } = data;

      // Validate session belongs to user
      const session = await ChatSession.findOne({
        sessionId,
        userId: socket.userId,
        isActive: true
      });

      if (!session) {
        socket.emit('error', { message: 'Chat session not found or access denied' });
        return;
      }

      // Join the chat room
      socket.join(`chat_${sessionId}`);
      socket.currentChatSession = sessionId;

      // Send session data
      socket.emit('chat_joined', {
        session,
        message: 'Successfully joined chat session'
      });

      logger.info(`User ${socket.user.email} joined chat session: ${sessionId}`);
    } catch (error) {
      logger.error('Error joining chat:', error);
      socket.emit('error', { message: 'Failed to join chat session' });
    }
  }

  async handleSendMessage(socket, data) {
    try {
      const { sessionId, content, messageType = 'text', voiceData } = data;

      if (!content || content.trim().length === 0) {
        socket.emit('error', { message: 'Message content cannot be empty' });
        return;
      }

      // Validate session
      const session = await ChatSession.findOne({
        sessionId,
        userId: socket.userId,
        isActive: true
      });

      if (!session) {
        socket.emit('error', { message: 'Chat session not found' });
        return;
      }

      // Create user message
      const userMessage = {
        sender: 'user',
        content: content.trim(),
        messageType,
        voiceData: messageType === 'voice' ? voiceData : undefined,
        timestamp: new Date()
      };

      session.messages.push(userMessage);

      // Emit user message to all clients in the chat room
      this.io.to(`chat_${sessionId}`).emit('new_message', {
        message: userMessage,
        sessionId
      });

      // Prepare context for AI response
      const context = {
        language: session.language,
        userMood: socket.user.moodBaseline?.overall,
        previousMessages: session.messages.slice(-10)
      };

      // Show typing indicator for bot
      this.io.to(`chat_${sessionId}`).emit('bot_typing', { sessionId });

      try {
        // Generate AI response
        const aiResponse = await geminiService.generateResponse(content, context);

        // Handle crisis detection
        if (aiResponse.metadata.crisisLevel >= 3) {
          await this.handleCrisisDetection(socket, session, content, aiResponse.metadata);
          session.context.crisisLevel = aiResponse.metadata.crisisLevel;
          session.sessionType = 'crisis';
        }

        // Create bot message
        const botMessage = {
          sender: 'bot',
          content: aiResponse.response,
          messageType: 'text',
          metadata: aiResponse.metadata,
          timestamp: new Date()
        };

        session.messages.push(botMessage);

        // Update session context
        session.context = {
          ...session.context,
          userMood: aiResponse.metadata.sentiment,
          topics: [...(session.context.topics || []), ...aiResponse.metadata.keywords]
        };

        // Update session title if needed
        if (session.messages.length <= 4 && session.title === 'New Conversation') {
          session.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
        }

        await session.save();

        // Stop typing indicator
        this.io.to(`chat_${sessionId}`).emit('bot_typing_stop', { sessionId });

        // Emit bot response
        this.io.to(`chat_${sessionId}`).emit('new_message', {
          message: botMessage,
          sessionId
        });

        // If crisis detected, send additional resources
        if (aiResponse.metadata.crisisLevel >= 3) {
          this.io.to(`chat_${sessionId}`).emit('crisis_resources', {
            crisisLevel: aiResponse.metadata.crisisLevel,
            resources: await this.getCrisisResources(socket.user.preferredLanguage)
          });
        }

      } catch (aiError) {
        logger.error('AI response generation error:', aiError);
        
        // Stop typing indicator
        this.io.to(`chat_${sessionId}`).emit('bot_typing_stop', { sessionId });
        
        // Send fallback message
        const fallbackMessage = {
          sender: 'bot',
          content: this.getFallbackMessage(socket.user.preferredLanguage),
          messageType: 'text',
          timestamp: new Date()
        };

        session.messages.push(fallbackMessage);
        await session.save();

        this.io.to(`chat_${sessionId}`).emit('new_message', {
          message: fallbackMessage,
          sessionId
        });
      }

    } catch (error) {
      logger.error('Error handling send message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  handleTypingStart(socket, data) {
    const { sessionId } = data;
    socket.to(`chat_${sessionId}`).emit('user_typing', {
      userId: socket.userId,
      user: socket.user.name,
      sessionId
    });
  }

  handleTypingStop(socket, data) {
    const { sessionId } = data;
    socket.to(`chat_${sessionId}`).emit('user_typing_stop', {
      userId: socket.userId,
      sessionId
    });
  }

  async handleVoiceMessage(socket, data) {
    try {
      const { sessionId, audioData, duration } = data;

      // In a real implementation, you would:
      // 1. Save the audio data temporarily
      // 2. Transcribe it using speech-to-text service
      // 3. Process the transcribed text as a regular message

      // For now, simulate transcription
      const transcript = "This is a simulated transcription of the voice message.";

      // Process as regular text message
      await this.handleSendMessage(socket, {
        sessionId,
        content: transcript,
        messageType: 'voice',
        voiceData: {
          audioData,
          duration,
          transcript
        }
      });

    } catch (error) {
      logger.error('Error handling voice message:', error);
      socket.emit('error', { message: 'Failed to process voice message' });
    }
  }

  handleMessageRead(socket, data) {
    const { sessionId, messageId } = data;
    
    // Update message read status (if implementing read receipts)
    socket.to(`chat_${sessionId}`).emit('message_read', {
      messageId,
      readBy: socket.userId,
      readAt: new Date()
    });
  }

  async handleCrisisDetection(socket, session, message, metadata) {
    try {
      const CrisisAlert = require('../models/CrisisAlert');

      // Create crisis alert
      const crisisAlert = new CrisisAlert({
        userId: socket.userId,
        triggerMessage: message,
        severity: metadata.crisisLevel >= 4 ? 'critical' : 'high',
        riskLevel: metadata.crisisLevel,
        detectedKeywords: metadata.keywords,
        aiAnalysis: {
          confidence: metadata.confidence,
          sentiment: metadata.sentiment,
          riskFactors: metadata.keywords
        }
      });

      await crisisAlert.save();

      // Send crisis alert to user
      socket.emit('crisis_alert', {
        alert: crisisAlert,
        message: 'We detected you might be in distress. Help is available.',
        emergencyContacts: this.getEmergencyContacts(socket.user.preferredLanguage)
      });

      logger.warn(`Crisis detected for user ${socket.user.email}: Level ${metadata.crisisLevel}`);

      // In production, you would also:
      // 1. Notify crisis response team
      // 2. Log to monitoring systems
      // 3. Potentially contact emergency services for critical cases

    } catch (error) {
      logger.error('Error handling crisis detection:', error);
    }
  }

  handleDisconnection(socket) {
    const userId = socket.userId;
    
    // Remove from active users
    this.activeUsers.delete(userId);
    
    logger.info(`User disconnected: ${socket.user?.email || 'Unknown'} (${socket.id})`);
  }

  // Utility methods

  async getCrisisResources(language = 'en') {
    const Resource = require('../models/Resource');
    
    return await Resource.find({
      isActive: true,
      isCrisis: true,
      language
    })
      .select('title description content type')
      .sort({ priority: -1 })
      .limit(5);
  }

  getEmergencyContacts(language = 'en') {
    const contacts = {
      en: [
        { name: 'National Suicide Prevention Lifeline', number: '988' },
        { name: 'Crisis Text Line', number: 'Text HOME to 741741' }
      ],
      es: [
        { name: 'Línea Nacional de Prevención del Suicidio', number: '988 (presiona 2)' }
      ],
      hi: [
        { name: 'आसरा हेल्पलाइन', number: '+91 9820466726' }
      ]
    };

    return contacts[language] || contacts.en;
  }

  getFallbackMessage(language = 'en') {
    const messages = {
      en: "I'm here to support you, though I'm having some technical difficulties right now. Your feelings are important and valid. If you're in crisis, please contact emergency services or a crisis hotline immediately.",
      es: "Estoy aquí para apoyarte, aunque tengo algunas dificultades técnicas en este momento. Tus sentimientos son importantes y válidos.",
      hi: "मैं आपका समर्थन करने के लिए यहां हूं, हालांकि मुझे अभी कुछ तकनीकी कठिनाइयां हो रही हैं। आपकी भावनाएं महत्वपूर्ण और वैध हैं।"
    };

    return messages[language] || messages.en;
  }

  // Public methods for external use

  sendNotificationToUser(userId, notification) {
    this.io.to(`user_${userId}`).emit('notification', notification);
  }

  broadcastSystemMessage(message) {
    this.io.emit('system_message', {
      message,
      timestamp: new Date()
    });
  }

  getActiveUsersCount() {
    return this.activeUsers.size;
  }

  isUserOnline(userId) {
    return this.activeUsers.has(userId);
  }
}

const socketService = new SocketService();

module.exports = {
  initializeSocket: (io) => socketService.initializeSocket(io),
  socketService
};