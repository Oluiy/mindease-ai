const { GoogleGenerativeAI } = require('@google/generative-ai');
const { logger } = require('../utils/logger');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    
    this.systemPrompts = {
      en: `You are MindEase, a compassionate AI mental health companion. Your role is to:
      - Provide empathetic, supportive responses
      - Offer evidence-based coping strategies
      - Help users understand their emotions
      - Recognize crisis situations and provide appropriate resources
      - Never diagnose or replace professional help
      - Always encourage seeking professional help when needed
      - Be culturally sensitive and inclusive
      - Use a warm, understanding tone
      
      Crisis keywords to watch for: suicide, kill myself, end it all, not worth living, hopeless, can't go on
      
      If crisis detected, immediately provide:
      1. Validation of their feelings
      2. Crisis hotline numbers
      3. Breathing exercises
      4. Encourage immediate professional help`,
      
      es: `Eres MindEase, un compañero de IA compasivo para la salud mental. Tu papel es:
      - Proporcionar respuestas empáticas y de apoyo
      - Ofrecer estrategias de afrontamiento basadas en evidencia
      - Ayudar a los usuarios a entender sus emociones
      - Reconocer situaciones de crisis y proporcionar recursos apropiados
      - Nunca diagnosticar o reemplazar la ayuda profesional
      - Siempre alentar a buscar ayuda profesional cuando sea necesario
      - Ser culturalmente sensible e inclusivo
      - Usar un tono cálido y comprensivo`,
      
      hi: `आप MindEase हैं, एक दयालु AI मानसिक स्वास्थ्य साथी। आपकी भूमिका है:
      - सहानुभूतिपूर्ण, सहायक प्रतिक्रियाएं प्रदान करना
      - साक्ष्य-आधारित मुकाबला रणनीतियां पेश करना
      - उपयोगकर्ताओं को अपनी भावनाओं को समझने में मदद करना
      - संकट की स्थितियों को पहचानना और उपयुक्त संसाधन प्रदान करना
      - कभी भी निदान न करना या पेशेवर मदद की जगह न लेना
      - जब जरूरत हो तो हमेशा पेशेवर मदद लेने को प्रेरित करना`
    };

    this.crisisKeywords = {
      en: ['suicide', 'kill myself', 'end it all', 'not worth living', 'hopeless', 'can\'t go on', 'want to die'],
      es: ['suicidio', 'matarme', 'terminar todo', 'no vale la pena vivir', 'sin esperanza', 'quiero morir'],
      hi: ['आत्महत्या', 'खुद को मारना', 'सब कुछ खत्म', 'जीने का मतलब नहीं', 'निराशा', 'मरना चाहता हूं']
    };
  }

  async generateResponse(message, context = {}) {
    try {
      const { language = 'en', userMood, previousMessages = [] } = context;
      
      // Check for crisis indicators
      const crisisLevel = this.detectCrisis(message, language);
      
      // Build conversation context
      const conversationHistory = previousMessages
        .slice(-5) // Keep last 5 messages for context
        .map(msg => `${msg.sender}: ${msg.content}`)
        .join('\n');

      const prompt = this.buildPrompt(message, {
        language,
        userMood,
        conversationHistory,
        crisisLevel
      });

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Analyze sentiment and extract metadata
      const metadata = await this.analyzeMessage(message, response, language);

      return {
        response: response.trim(),
        metadata: {
          ...metadata,
          crisisLevel,
          language,
          confidence: this.calculateConfidence(response)
        }
      };
    } catch (error) {
      logger.error('Gemini API error:', error);
      return this.getFallbackResponse(context.language || 'en');
    }
  }

  buildPrompt(message, context) {
    const { language, userMood, conversationHistory, crisisLevel } = context;
    
    let prompt = this.systemPrompts[language] + '\n\n';
    
    if (conversationHistory) {
      prompt += `Previous conversation:\n${conversationHistory}\n\n`;
    }
    
    if (userMood) {
      prompt += `User's current mood: ${userMood}\n\n`;
    }
    
    if (crisisLevel > 0) {
      prompt += `CRISIS ALERT (Level ${crisisLevel}): This message may indicate crisis. Respond with immediate support and resources.\n\n`;
    }
    
    prompt += `User message: ${message}\n\nRespond with empathy and provide helpful guidance:`;
    
    return prompt;
  }

  detectCrisis(message, language = 'en') {
    const keywords = this.crisisKeywords[language] || this.crisisKeywords.en;
    const messageLower = message.toLowerCase();
    
    let crisisLevel = 0;
    
    for (const keyword of keywords) {
      if (messageLower.includes(keyword.toLowerCase())) {
        crisisLevel = Math.max(crisisLevel, this.getCrisisSeverity(keyword));
      }
    }
    
    // Additional pattern matching for implicit crisis indicators
    const crisisPatterns = [
      /i (can't|cannot) (take|handle) (it|this) anymore/i,
      /everything (is|feels) (hopeless|pointless)/i,
      /no one (would|will) (miss|care) (if i|about me)/i,
      /i'm (a|such a) (burden|failure)/i
    ];
    
    for (const pattern of crisisPatterns) {
      if (pattern.test(message)) {
        crisisLevel = Math.max(crisisLevel, 3);
      }
    }
    
    return Math.min(crisisLevel, 5); // Cap at level 5
  }

  getCrisisSeverity(keyword) {
    const highRisk = ['suicide', 'kill myself', 'want to die', 'suicidio', 'आत्महत्या'];
    const mediumRisk = ['hopeless', 'can\'t go on', 'end it all', 'sin esperanza', 'निराशा'];
    
    if (highRisk.some(k => keyword.toLowerCase().includes(k.toLowerCase()))) {
      return 5;
    }
    if (mediumRisk.some(k => keyword.toLowerCase().includes(k.toLowerCase()))) {
      return 3;
    }
    return 2;
  }

  async analyzeMessage(userMessage, botResponse, language) {
    try {
      const analysisPrompt = `Analyze this mental health conversation and provide JSON response:
      User: ${userMessage}
      Bot: ${botResponse}
      
      Return JSON with:
      - sentiment: "positive", "neutral", "negative", or "crisis"
      - keywords: array of important mental health related keywords
      - intent: primary user intent (support_seeking, crisis, mood_tracking, resource_request, general_chat)
      - emotions: array of detected emotions
      `;

      const result = await this.model.generateContent(analysisPrompt);
      const analysis = result.response.text();
      
      try {
        return JSON.parse(analysis);
      } catch {
        // Fallback analysis
        return {
          sentiment: this.detectSentiment(userMessage),
          keywords: this.extractKeywords(userMessage),
          intent: 'general_chat',
          emotions: ['neutral']
        };
      }
    } catch (error) {
      logger.error('Message analysis error:', error);
      return {
        sentiment: 'neutral',
        keywords: [],
        intent: 'general_chat',
        emotions: ['neutral']
      };
    }
  }

  detectSentiment(message) {
    const positiveWords = ['good', 'happy', 'better', 'great', 'wonderful', 'amazing'];
    const negativeWords = ['sad', 'depressed', 'anxious', 'terrible', 'awful', 'hopeless'];
    
    const messageLower = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => messageLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => messageLower.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  extractKeywords(message) {
    const mentalHealthKeywords = [
      'anxiety', 'depression', 'stress', 'panic', 'worry', 'fear',
      'sad', 'happy', 'angry', 'frustrated', 'overwhelmed',
      'therapy', 'medication', 'counseling', 'support'
    ];
    
    const messageLower = message.toLowerCase();
    return mentalHealthKeywords.filter(keyword => 
      messageLower.includes(keyword)
    );
  }

  calculateConfidence(response) {
    // Simple confidence calculation based on response length and structure
    const length = response.length;
    const hasResources = /http|www|call|contact/i.test(response);
    const hasEmpathy = /(understand|feel|sorry|here for you)/i.test(response);
    
    let confidence = 0.5;
    if (length > 100) confidence += 0.2;
    if (hasResources) confidence += 0.2;
    if (hasEmpathy) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  getFallbackResponse(language = 'en') {
    const fallbacks = {
      en: "I'm here to listen and support you. While I'm having technical difficulties right now, please know that your feelings are valid. If you're in crisis, please contact a crisis helpline immediately.",
      es: "Estoy aquí para escucharte y apoyarte. Aunque estoy teniendo dificultades técnicas ahora, por favor sabe que tus sentimientos son válidos.",
      hi: "मैं आपको सुनने और समर्थन करने के लिए यहां हूं। जबकि मुझे अभी तकनीकी कठिनाइयां हो रही हैं, कृपया जानें कि आपकी भावनाएं वैध हैं।"
    };

    return {
      response: fallbacks[language] || fallbacks.en,
      metadata: {
        sentiment: 'neutral',
        crisisLevel: 0,
        confidence: 0.3,
        language,
        isFallback: true
      }
    };
  }

  async transcribeAudio(audioBuffer, language = 'en') {
    // Note: Gemini doesn't directly support audio transcription
    // This would need to be implemented with another service like Google Speech-to-Text
    // For now, returning a placeholder
    throw new Error('Audio transcription not implemented yet');
  }
}

module.exports = new GeminiService();