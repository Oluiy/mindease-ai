# MindEase Backend - Mental Health Chatbot API

A comprehensive Node.js backend for a mental health chatbot application offering AI-powered conversations, mood tracking, crisis alerts, voice messaging, and multilingual support.

## 🌟 Features

### Core Functionality
- **AI-Powered Conversations**: Gemini AI integration for empathetic, context-aware responses
- **Real-time Chat**: Socket.IO for instant messaging and live interactions
- **Voice Messaging**: Upload, transcribe, and process voice messages
- **Mood Tracking**: Comprehensive mood baseline and daily tracking system
- **Crisis Detection**: Automatic crisis alert system with immediate intervention resources
- **Resource Library**: Curated mental health resources with personalized recommendations

### Accessibility & Inclusivity
- **Multilingual Support**: English, Spanish, and Hindi
- **WCAG 2.1 AA Compliance**: High contrast mode, voice input/output support
- **Voice Integration**: TalkBack/VoiceOver compatibility
- **Flexible Text Sizing**: Multiple font size options

### Security & Privacy
- **JWT Authentication**: Secure access and refresh token system
- **Data Protection**: XSS prevention, input sanitization, rate limiting
- **Privacy First**: Encrypted sensitive data, secure file handling

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (running locally or remote)
- Gemini AI API key

### Installation

1. **Clone and Install**
   ```bash
   cd mindease
   npm install
   ```

2. **Environment Setup**
   
   The `.env` file is already configured with your MongoDB and Gemini AI settings:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/mental_health_chatbot
   JWT_SECRET=mental_health_chatbot_super_secret_jwt_key_2024_production_ready
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start MongoDB**
   ```bash
   # Start MongoDB (you mentioned you have this running)
   mongod --dbpath ~/mongodb/data
   ```

4. **Seed Sample Data**
   ```bash
   npm run seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/preferences` - Update preferences
- `PUT /api/users/accessibility` - Update accessibility settings
- `GET /api/users/dashboard` - Get dashboard data

### Chat System
- `POST /api/chat/sessions` - Create chat session
- `GET /api/chat/sessions` - Get user's sessions
- `GET /api/chat/sessions/:id` - Get specific session
- `POST /api/chat/sessions/:id/messages` - Send message
- `GET /api/chat/search` - Search chat history

### Mood Tracking
- `POST /api/mood/baseline` - Complete onboarding baseline
- `POST /api/mood/entries` - Create mood entry
- `GET /api/mood/entries` - Get mood history
- `GET /api/mood/analytics` - Get mood analytics
- `GET /api/mood/insights` - Get AI-powered insights

### Voice Messaging
- `POST /api/voice/upload` - Upload voice message
- `GET /api/voice/:filename` - Stream audio file
- `POST /api/voice/transcribe` - Transcribe audio
- `POST /api/voice/synthesize` - Text-to-speech

### Resources
- `GET /api/resources` - Get mental health resources
- `GET /api/resources/categories` - Get resource categories
- `GET /api/resources/:id` - Get specific resource
- `GET /api/resources/recommended/for-user` - Personalized recommendations
- `GET /api/resources/crisis/hotlines` - Crisis hotlines

### Crisis Management
- `POST /api/crisis/alert` - Create crisis alert
- `GET /api/crisis/alerts` - Get user's alerts
- `GET /api/crisis/breathing-exercises` - Get breathing exercises
- `GET /api/crisis/immediate-help` - Get crisis resources
- `POST /api/crisis/safety-plan` - Create/update safety plan

## 🔌 Real-time Features (Socket.IO)

Connect to the Socket.IO server for real-time chat:

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join a chat session
socket.emit('join_chat', { sessionId: 'session-id' });

// Send a message
socket.emit('send_message', {
  sessionId: 'session-id',
  content: 'Hello!',
  messageType: 'text'
});

// Listen for new messages
socket.on('new_message', (data) => {
  console.log('New message:', data);
});

// Handle crisis alerts
socket.on('crisis_alert', (data) => {
  console.log('Crisis detected:', data);
});
```

## 🧠 AI Integration

### Gemini AI Features
- **Context-Aware Responses**: Maintains conversation context and user mood
- **Crisis Detection**: Automatically identifies risk indicators
- **Multilingual Support**: Responds in user's preferred language
- **Sentiment Analysis**: Analyzes emotional tone and provides appropriate responses

### Sample AI Interaction
```json
{
  "userMessage": "I've been feeling really anxious lately",
  "botResponse": "I understand that anxiety can feel overwhelming. It's important that you've recognized these feelings. Would you like to try a breathing exercise that might help you feel more grounded right now?",
  "metadata": {
    "sentiment": "negative",
    "crisisLevel": 1,
    "keywords": ["anxiety", "overwhelmed"],
    "confidence": 0.85
  }
}
```

## 📊 Database Schema

### Key Models

**User**
- Authentication & profile data
- Mood baseline & preferences
- Accessibility settings
- Safety plan

**ChatSession**
- Real-time conversations
- AI context & metadata
- Multi-language support

**MoodEntry**
- Daily mood tracking
- Sleep & activity data
- Trend analysis

**CrisisAlert**
- Automatic crisis detection
- Intervention tracking
- Escalation protocols

**Resource**
- Curated mental health content
- Categorized by type & difficulty
- Multi-language resources

## 🔒 Security Features

- **Rate Limiting**: Prevents API abuse
- **Input Sanitization**: XSS and injection protection
- **JWT Tokens**: Secure authentication with refresh tokens
- **Data Encryption**: Sensitive data protection
- **CORS Protection**: Controlled cross-origin requests
- **File Upload Security**: Safe voice message handling

## 🌍 Multilingual Support

### Supported Languages
- **English (en)**: Full feature support
- **Spanish (es)**: Complete translation and cultural adaptation
- **Hindi (hi)**: Native language support with cultural considerations

### Language Features
- AI responses in native language
- Localized crisis resources
- Culture-appropriate mental health guidance
- Regional emergency contacts

## 🚨 Crisis Management

### Automatic Detection
The system automatically detects crisis indicators in user messages:
- Suicide ideation keywords
- Hopelessness expressions
- Self-harm references

### Immediate Response
When crisis is detected:
1. **Immediate Resources**: Crisis hotlines and breathing exercises
2. **Professional Support**: Encouragement to seek immediate help
3. **Safety Planning**: Access to personalized safety plans
4. **Monitoring**: Alert logging for follow-up

### Crisis Resources by Region
- **US**: National Suicide Prevention Lifeline (988)
- **India**: AASRA Helpline (+91 9820466726)
- **International**: WHO crisis resources

## 🛠️ Development

### Available Scripts
```bash
npm start          # Production server
npm run dev        # Development with nodemon
npm run test       # Run test suite
npm run lint       # ESLint checking
npm run seed       # Seed sample data
```

### Development Workflow
1. Make changes to source files
2. Server automatically restarts (nodemon)
3. Test API endpoints with tools like Postman
4. Monitor logs in terminal
5. Use MongoDB Compass to view database

### Testing the API
```bash
# Health check
curl http://localhost:3001/health

# Register a new user
curl -X POST http://localhost:3001/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "password": "Test123",
    "name": "Test User",
    "preferredLanguage": "en"
  }'
```

## 📱 Frontend Integration

### Connection Setup
```javascript
// Base API configuration
const API_BASE = 'http://localhost:3001/api';

// Socket.IO connection
const socket = io('http://localhost:3001');

// Authenticated requests
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

### Key Integration Points
- **Authentication Flow**: Register → Login → Onboarding → Main App
- **Real-time Chat**: Socket.IO for instant messaging
- **File Uploads**: FormData for voice messages
- **State Management**: JWT token refresh handling

## 🔧 Configuration

### Environment Variables
- `MONGODB_URI`: Database connection string
- `JWT_SECRET`: JWT signing key
- `GEMINI_API_KEY`: Google Gemini AI API key
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: CORS origin URL

### Production Deployment
1. Set `NODE_ENV=production`
2. Use secure JWT secrets
3. Configure MongoDB Atlas or secure local instance
4. Set up SSL/TLS certificates
5. Configure proper logging and monitoring

## 📈 Monitoring & Analytics

### Health Monitoring
- `/health` endpoint for uptime checks
- MongoDB connection status
- Active user tracking via Socket.IO

### Logging
- Winston logger with different levels
- Error tracking and debugging
- Crisis alert monitoring

## 🤝 Contributing

### Code Style
- ESLint configuration for consistent code style
- Async/await for promises
- Comprehensive error handling
- Clear variable and function naming

### Adding Features
1. Create appropriate models in `src/models/`
2. Implement routes in `src/routes/`
3. Add middleware if needed
4. Update API documentation
5. Add tests for new functionality

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support & Resources

### Mental Health Resources
- **Crisis Text Line**: Text HOME to 741741
- **National Suicide Prevention Lifeline**: 988
- **International**: Contact local emergency services

### Technical Support
- Check server logs for error details
- Verify MongoDB connection
- Ensure all environment variables are set
- Test API endpoints individually

---

**⚡ Server Status**: The development server is currently running on `http://localhost:3001`

**🗄️ Database**: Connected to MongoDB with sample resources loaded

**🔑 Next Steps**: 
1. Test the API endpoints using Postman or curl
2. Build your frontend to connect to these APIs
3. Customize the AI responses and resources for your needs

This backend provides a solid foundation for a comprehensive mental health application with enterprise-level features and security.