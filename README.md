# Study Buddy AI 🎓

Study Buddy AI is an intelligent, full-stack web application that acts as your personal AI tutor. By uploading your study materials (PDFs), the AI automatically processes the content and provides a suite of interactive learning tools to help you master the material.

## 🌟 Features

- **📄 Document Upload:** Upload your PDF study notes. The AI extracts and understands the context.
- **❓ Practice Questions:** Automatically generate multiple-choice questions based on your notes at various difficulty levels.
- **📝 Mock Exams:** Create comprehensive mock exams to test your overall understanding.
- **💬 Chat Assistant:** Chat directly with your notes! Ask questions and get answers cited from your material.
- **✍️ Written Evaluation:** Upload images of your handwritten answers. The AI uses multimodal vision to read your handwriting, compare it to the notes, and grade it out of 10 with feedback.
- **🎙️ Voice Viva Simulator:** Practice for oral exams. The AI speaks questions aloud, listens to your spoken answers via the microphone, and provides instant verbal grading.
- **⏱️ Pomodoro Timer:** A built-in, floating Pomodoro clock to track your study sessions and total study time.

## 🚀 Tech Stack

- **Frontend:** React (Vite), JavaScript, HTML5, CSS3 (Glassmorphism UI)
- **Backend:** Node.js, Express.js
- **AI Integration:** Google Gemini API (Text & Multimodal Vision)
- **File Handling:** Multer, `pdf-parse`
- **Deployment:** Docker & Docker Compose

## 🛠️ Setup & Installation

### Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose installed on your machine.
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey).

### 1. Clone the repository
```bash
git clone https://github.com/your-username/studybuddyai.git
cd studybuddyai
```

### 2. Configure Environment Variables
Navigate to the `backend` directory and create a `.env` file based on the provided example:
```bash
cd backend
cp .env.example .env
```
Open the `.env` file and insert your Gemini API Key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
CORS_ORIGIN=http://localhost:5173
```

### 3. Run with Docker
From the root directory (where `docker-compose.yml` is located), run:
```bash
docker compose up -d --build
```
This will build and start both the frontend and backend containers.

### 4. Access the App
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

## 📁 Project Structure

```
studybuddyai/
├── backend/
│   ├── config/          # Configuration and env setup
│   ├── routes/          # Express API routes
│   ├── services/        # Business logic & AI integrations (Gemini)
│   ├── utils/           # Helper functions and in-memory store
│   ├── Dockerfile
│   └── server.js        # Entry point
├── frontend/
│   ├── react-app/
│   │   ├── src/
│   │   │   ├── components/ # React components (UI, Tabs, Widgets)
│   │   │   ├── utils/      # API communication logic
│   │   │   ├── App.jsx     # Main layout and routing
│   │   │   └── index.css   # Global styles and design system
│   │   └── index.html
│   └── Dockerfile
├── docker-compose.yml   # Docker orchestration
└── README.md
```

## ⚠️ Notes
- The **Voice Viva Simulator** utilizes the Web Speech API (`SpeechSynthesis` and `SpeechRecognition`). For the best experience, please use **Google Chrome** or Microsoft Edge, as Firefox/Safari have limited support for speech recognition.
- Currently, the backend uses an in-memory store for PDFs. If the backend container restarts, you will need to re-upload your notes.

## 📄 License
MIT License
# studybuddy-.AI
