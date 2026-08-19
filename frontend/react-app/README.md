# Study Buddy AI - React Frontend

A modern React-based AI-powered exam preparation system with PDF upload, question generation, study schedules, mock exams, and interactive chat.

## Features

- 📖 **PDF Upload & Extraction**: Upload study notes in PDF format
- 📚 **Practice Questions**: Generate questions with different difficulty levels
- 📝 **Smart Summarization**: Get topic-specific summaries from your notes
- 📅 **Study Schedule**: Create personalized study plans
- 🏆 **Mock Exams**: Take full practice exams with instant feedback
- 🧠 **AI Chat**: Interactive chat assistant for questions

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend server running on `http://localhost:5000`

## Installation & Setup

### 1. Install Dependencies

```bash
cd frontend/react-app
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port)

### 3. Build for Production

```bash
npm run build
```

### 4. Preview Production Build

```bash
npm run preview
```

## Backend Setup

Make sure the backend server is running on port 5000:

```bash
cd backend
npm install
npm start
```

## Project Structure

```
react-app/
├── src/
│   ├── components/
│   │   ├── Header.jsx          # App header
│   │   ├── Loading.jsx         # Loading spinner component
│   │   ├── UploadSection.jsx   # PDF upload section
│   │   ├── ToolsSection.jsx    # Summarize & Schedule tools
│   │   ├── PracticeSection.jsx # Main practice section with tabs
│   │   ├── QuestionsTab.jsx    # Practice questions tab
│   │   ├── ExamTab.jsx         # Mock exam tab
│   │   └── ChatTab.jsx         # AI chat tab
│   ├── utils/
│   │   └── api.js              # API utility functions
│   ├── App.jsx                 # Main app component
│   ├── App.css                 # Main styles
│   ├── index.css               # Global styles
│   └── main.jsx                # App entry point
├── index.html
├── package.json
└── vite.config.js
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technologies Used

- **React** - UI library
- **Vite** - Build tool and dev server
- **Modern ES6+** - JavaScript features
- **Fetch API** - HTTP requests
- **CSS3** - Styling with animations

## API Endpoints

The frontend connects to these backend endpoints:

- `POST /upload` - Upload PDF file
- `POST /generate-questions` - Generate practice questions
- `POST /summarize` - Summarize topic
- `POST /study-schedule` - Create study schedule
- `POST /mock-exam` - Generate mock exam
- `POST /chat` - Chat with AI assistant

## Customization

To change the API URL, edit the `API_URL` constant in `src/utils/api.js`:

```javascript
const API_URL = 'http://localhost:5000';
```

## Design

The app features a cyberpunk/hacker-inspired design with:
- Neon green (#00ff41) and cyan (#00d4ff) color scheme
- Dark theme optimized for long study sessions
- Smooth animations and transitions
- Responsive design for mobile and desktop

## Troubleshooting

### Port already in use
If port 5173 is already in use, Vite will automatically try the next available port.

### CORS Issues
Make sure the backend has CORS enabled for `http://localhost:5173`

### API Connection Failed
Verify that the backend server is running on `http://localhost:5000`

## License

MIT
