# Study Buddy AI - Backend API

A modern, structured Express.js backend for the Study Buddy AI application with GROQ AI integration.

## 🏗️ Architecture

### **New Structure (v2.0)**

```
backend/
├── config/
│   └── config.js              # Centralized configuration
├── middleware/
│   ├── errorHandler.js        # Global error handling
│   └── validator.js           # Request validation
├── routes/
│   ├── uploadRoutes.js        # PDF upload endpoint
│   ├── questionRoutes.js      # Question generation
│   ├── summaryRoutes.js       # Summarization
│   ├── scheduleRoutes.js      # Study schedule
│   ├── examRoutes.js          # Mock exam
│   └── chatRoutes.js          # AI chat
├── services/
│   ├── groqService.js         # GROQ AI integration
│   └── pdfService.js          # PDF processing
├── utils/
│   └── notesStore.js          # Notes storage
├── uploads/                    # Temporary file storage
├── server.js                   # Main application
├── package.json
├── .env                        # Environment variables (create this)
├── .env.example               # Example environment file
└── .gitignore
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### 3. Start the Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

## 📡 API Endpoints

### Health Check
```
GET /health
```
Returns server status and notes loading state.

### Upload PDF
```
POST /upload
Content-Type: multipart/form-data

Body:
- file: PDF file (max 10MB)

Response:
{
  "success": true,
  "message": "Notes uploaded successfully",
  "characterCount": 5000,
  "pages": 10,
  "preview": "..."
}
```

### Generate Questions
```
POST /generate-questions
Content-Type: application/json

Body:
{
  "difficulty": "medium",  // easy, medium, hard
  "count": 5              // 1-20
}

Response:
{
  "success": true,
  "questions": [
    {
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A",
      "explanation": "..."
    }
  ]
}
```

### Summarize Topic
```
POST /summarize
Content-Type: application/json

Body:
{
  "topic": "Machine Learning"
}

Response:
{
  "success": true,
  "summary": "..."
}
```

### Generate Study Schedule
```
POST /study-schedule
Content-Type: application/json

Body:
{
  "daysUntilExam": 7  // 1-30
}

Response:
{
  "success": true,
  "schedule": [
    {
      "day": 1,
      "topic": "...",
      "duration": "2 hours",
      "activities": ["...", "..."]
    }
  ],
  "tips": ["...", "..."]
}
```

### Generate Mock Exam
```
POST /mock-exam
Content-Type: application/json

Body:
{
  "numQuestions": 10  // 5-20
}

Response:
{
  "success": true,
  "exam": [
    {
      "id": 1,
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": "A",
      "explanation": "..."
    }
  ]
}
```

### Chat with AI
```
POST /chat
Content-Type: application/json

Body:
{
  "question": "What is machine learning?",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}

Response:
{
  "success": true,
  "answer": "..."
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | GROQ AI API key (required) | - |
| `PORT` | Server port | 5000 |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5173 |
| `NODE_ENV` | Environment | development |

### Configuration File

Edit `config/config.js` to customize:
- API endpoints
- File size limits
- AI model settings
- Upload directory
- Token limits

## 🛡️ Features

### ✅ Modular Architecture
- Separate routes, services, and middleware
- Easy to test and maintain
- Scalable structure

### ✅ Error Handling
- Global error handler
- Consistent error responses
- Detailed error logging
- Development stack traces

### ✅ Request Validation
- Input validation for all endpoints
- Type checking
- Range validation
- Custom error messages

### ✅ Security
- CORS configuration
- File type validation
- File size limits
- Automatic file cleanup

### ✅ Logging
- Request logging
- Error logging
- Notes storage logging
- Startup information

### ✅ File Management
- Automatic file deletion after processing
- Error cleanup
- Upload directory management

## 🧪 Testing

Test endpoints using curl:

```bash
# Health check
curl http://localhost:5000/health

# Upload PDF
curl -X POST http://localhost:5000/upload \
  -F "file=@notes.pdf"

# Generate questions
curl -X POST http://localhost:5000/generate-questions \
  -H "Content-Type: application/json" \
  -d '{"difficulty": "medium", "count": 5}'
```

Or use tools like:
- Postman
- Insomnia
- Thunder Client (VS Code)

## 📦 Dependencies

### Production
- **express** - Web framework
- **cors** - CORS middleware
- **dotenv** - Environment variables
- **axios** - HTTP client for GROQ API
- **multer** - File upload handling
- **pdf-parse** - PDF text extraction

### Development
- **nodemon** - Auto-reload during development

## 🔄 Migration from v1.0

The new backend maintains full backward compatibility while adding:

### Improvements
- ✅ Separated concerns (routes, services, middleware)
- ✅ Better error handling
- ✅ Request validation
- ✅ Improved logging
- ✅ Cleaner code organization
- ✅ Better maintainability
- ✅ Proper error responses
- ✅ Configuration management

### Breaking Changes
None! All endpoints remain the same.

## 🐛 Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "stack": "..." // Only in development
}
```

### Common Error Codes
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## 📊 Performance

- Request timeout: 30 seconds
- Max file size: 10MB
- Notes truncation: 3000 characters for AI
- In-memory notes storage (consider Redis for production)

## 🚦 Development Tips

### Use Nodemon
```bash
npm run dev
```
Auto-reloads on file changes.

### Check Logs
Server logs all requests and errors to console.

### Test Error Handling
Try invalid requests to see error responses:
```bash
curl -X POST http://localhost:5000/generate-questions \
  -H "Content-Type: application/json" \
  -d '{"count": 100}'  # Invalid - max is 20
```

## 🔐 Security Considerations

### Production Checklist
- [ ] Set strong `GROQ_API_KEY`
- [ ] Configure proper `CORS_ORIGIN`
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS
- [ ] Add rate limiting
- [ ] Add authentication if needed
- [ ] Monitor logs
- [ ] Use environment-specific configs

## 📈 Scaling Considerations

For production/scaling:

1. **Database** - Replace in-memory storage with MongoDB/PostgreSQL
2. **File Storage** - Use AWS S3 or similar for PDFs
3. **Caching** - Add Redis for notes caching
4. **Rate Limiting** - Implement rate limiting
5. **Load Balancing** - Use multiple instances
6. **Monitoring** - Add application monitoring
7. **Logging** - Use structured logging (Winston, Pino)

## 🤝 Contributing

1. Follow the existing structure
2. Add validation for new endpoints
3. Handle errors properly
4. Update documentation
5. Test your changes

## 📝 License

MIT

---

## 🎯 Quick Commands Reference

```bash
# Install
npm install

# Start server
npm start

# Development mode
npm run dev

# Check if running
curl http://localhost:5000/health
```

---

Made with ❤️ for efficient studying!

