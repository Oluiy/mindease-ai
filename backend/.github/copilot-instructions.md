# MindEase Backend - Copilot Instructions

This is a comprehensive Node.js mental health chatbot backend built with modern technologies and best practices.

## Project Structure

```
src/
├── models/          # Mongoose database schemas
├── routes/          # API route handlers
├── services/        # Business logic and AI integration
├── middleware/      # Authentication and error handling
├── utils/          # Utility functions and helpers
├── scripts/        # Database seeding and maintenance
└── server.js       # Main application entry point
```

## Key Technologies

- **Node.js & Express**: RESTful API server
- **MongoDB & Mongoose**: Database and ODM
- **Socket.IO**: Real-time chat functionality
- **Google Gemini AI**: AI-powered conversations
- **JWT**: Secure authentication
- **Multer**: Voice message file handling

## Core Features Implemented

### 1. User Management
- Registration/login with JWT authentication
- User profiles with mood baselines
- Accessibility settings (WCAG 2.1 AA compliance)
- Multilingual support (English, Spanish, Hindi)

### 2. AI Chat System
- Real-time messaging via Socket.IO
- Context-aware AI responses using Gemini
- Automatic crisis detection and intervention
- Voice message support with transcription

### 3. Mood Tracking
- 30-second onboarding mood baseline
- Daily mood entries with analytics
- Trend analysis and AI-powered insights
- Sleep and activity correlation tracking

### 4. Crisis Management
- Automatic keyword-based crisis detection
- Immediate intervention resources
- Crisis hotlines by language/region
- Personal safety plan creation

### 5. Resource Library
- Curated mental health resources
- Personalized recommendations based on user data
- Multi-category filtering (anxiety, depression, etc.)
- Accessibility-enhanced content

## Development Guidelines

### Code Style
- Use async/await for asynchronous operations
- Implement comprehensive error handling
- Follow RESTful API conventions
- Maintain consistent naming conventions

### Security Best Practices
- Input validation and sanitization
- Rate limiting on API endpoints
- Secure file upload handling
- JWT token management with refresh tokens

### Database Design
- Mongoose schemas with proper validation
- Indexing for query optimization
- Referential integrity between collections
- Soft deletes where appropriate

### AI Integration
- Context-aware conversation management
- Crisis detection with configurable sensitivity
- Multilingual response generation
- Sentiment analysis and metadata extraction

## Environment Configuration

Required environment variables:
- `MONGODB_URI`: Database connection
- `JWT_SECRET`: Token signing key
- `GEMINI_API_KEY`: AI service API key
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode

## Testing & Development

### Running the Application
```bash
npm run dev          # Development server with auto-restart
npm start           # Production server
npm run seed        # Populate database with sample data
```

### API Testing
- Health check: `GET /health`
- Authentication flow: Register → Login → Access protected routes
- Real-time features: Connect via Socket.IO with JWT token
- File uploads: Use FormData for voice messages

### Database Management
- MongoDB running locally on port 27017
- Sample data seeded via `npm run seed`
- Collections: users, chatsessions, moodentries, resources, crisisalerts

## Integration Notes

### Frontend Compatibility
- CORS configured for `http://localhost:3000`
- RESTful API with consistent JSON responses
- Socket.IO events for real-time features
- File upload endpoints for voice messages

### AI Service
- Gemini AI integrated for conversation generation
- Crisis detection with keyword analysis
- Multi-language response capability
- Context preservation across conversations

### Accessibility Features
- Voice input/output support preparation
- High contrast mode compatibility
- Multilingual content and responses
- Flexible text sizing options

## Monitoring & Logging

- Winston logger for structured logging
- Health check endpoint for monitoring
- Error tracking and debugging support
- Crisis alert logging for safety monitoring

## Current Status

✅ Complete backend implementation
✅ All API endpoints functional
✅ Real-time chat system operational  
✅ Database seeded with sample data
✅ AI integration active
✅ Crisis detection system enabled
✅ Multi-language support implemented
✅ Voice messaging infrastructure ready

The backend is fully functional and ready for frontend integration. All major features have been implemented with proper error handling, security measures, and scalability considerations.