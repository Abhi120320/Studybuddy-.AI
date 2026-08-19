# Study Buddy AI 🎓

Study Buddy AI is a high-fidelity, full-stack personal AI tutor and study optimization platform. By uploading your PDF study materials, the application parses the contents, builds a vector search structure in PostgreSQL, and generates custom study guides, mock exams, visual streaks, and interactive tools to make learning efficient.

---

## 🌟 Core Features

- **🔑 Passwordless Verification & JWT Auth:** Secure, password-free login flow. Input your email, receive a one-time verification passcode directly in the UI, and log in to a fully private workspace.
- **📄 Scoped Documents Library:** Every uploaded file is securely isolated and private to your account. The backend splits files into overlapping chunks for prompt injection.
- **⏱️ Draggable Floating Pomodoro Clock:** A sleek, draggable countdown timer pill that stays with you across tabs. Minimise it to a slim overlay so it never blocks page content, or expand it to configure Focus, Short Break, or Long Break sessions.
- **🔥 Study Streaks & Analytics:** Tracks daily study completion directly on your Home Dashboard. Automatically logs and graphs weekly focus hours using Pomodoro clock readings. Streaks require **at least 30 minutes of study time** per day.
- **🗂️ Direct Subject Library:** Explore your actual folder structure directly from the homepage and click folders (General, Physics, etc.) to immediately view files.
- **💬 Conversational Notes Assistant:** Chat directly with your notes. Get precise, context-aware answers cited directly from page references in your PDF materials.
- **❓ Practice Questions & Mock Exams:** Automatically generate targeted multiple-choice question sheets or full-length graded mock exams.
- **✍️ Written Answer Evaluator:** Upload handwritten or typed answers as images. The AI uses vision capabilities to compare your answer to the study notes, grading it out of 10 and offering detailed feedback.
- **🎙️ Speech Viva Simulator:** Rehearsal room for oral exams. The AI speaks questions aloud, records your spoken response using your microphone, and provides instant verbal correction.

---

## 🚀 Clustered Architecture

The platform runs a production-ready, highly available distributed backend architecture orchestrated inside Docker Compose:

```mermaid
graph TD
    Client[Web Browser - Port 5173] --> LB[Nginx Load Balancer - Port 5001]
    LB --> API1[Node.js Replica 1]
    LB --> API2[Node.js Replica 2]
    LB --> API3[Node.js Replica 3]
    API1 & API2 & API3 --> DB[(PostgreSQL 16 Database)]
```

- **Load Balancer:** Nginx handles ingress requests on port `5001` and distributes load round-robin across Node.js replicas.
- **Replicas:** Three parallel Node.js containers run state-free and handle requests concurrently.
- **Database:** PostgreSQL 16 acts as the single source of truth, persisting users, authentication passcodes, folders, document schemas, and study metrics.

---

## 🛠️ Setup & Installation

### Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose installed.
- A [Groq API Key](https://console.groq.com/) for fast LLM inference.

### 1. Configure Environment Variables
In the `backend` folder, create a `.env` file containing:

```env
# Your Groq API Key
GROQ_API_KEY=gsk_your_groq_api_key_here

# Server configuration
PORT=5001
CORS_ORIGIN=http://localhost:5173
NODE_ENV=production

# Database Connection (inside Docker networking)
DATABASE_URL=postgresql://studybuddy:studybuddy@postgres:5432/studybuddy

# Security Configuration
JWT_SECRET=your_custom_jwt_secret_here
```

### 2. Launch Stack
Run the orchestration script from the root directory:

```bash
docker compose up -d --build
```

This starts:
1. `studybuddy-postgres` (PostgreSQL 16)
2. `studybuddy-backend-1` (API Instance 1)
3. `studybuddy-backend-2` (API Instance 2)
4. `studybuddy-backend-3` (API Instance 3)
5. `studybuddy-backend-lb` (Nginx Load Balancer on port `5001`)
6. `studybuddy-frontend` (React + Nginx server on port `5173`)

### 3. Ports
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **API Load Balancer:** [http://localhost:5001](http://localhost:5001)

---

## 📁 Repository Structure

```
studybuddy-.AI/
├── backend/
│   ├── db/              # DB pool connection, schema definitions, and queries
│   ├── middleware/      # JWT authentication guard and error handling
│   ├── routes/          # Express REST API endpoints (Auth, Chat, Practice)
│   ├── services/        # PDF extraction, LLM vector prompts, and vision APIs
│   ├── Dockerfile
│   └── server.js        # Server entry point
├── frontend/
│   ├── react-app/
│   │   ├── src/
│   │   │   ├── components/ # React pages (Dashboard, Auth, Tools)
│   │   │   ├── utils/      # API communication using JWT authFetch
│   │   │   └── App.jsx     # App route controls
│   │   └── Dockerfile
├── nginx-lb/
│   └── nginx.conf       # Nginx Load Balancer reverse-proxy rule
└── docker-compose.yml   # Multi-container cluster configuration
```

---

## 📄 License
Licensed under the [MIT License](LICENSE).
