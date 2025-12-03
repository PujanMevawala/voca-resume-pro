# 🎯 VocaResume Pro

<div align="center">

![VocaResume Pro](https://img.shields.io/badge/VocaResume-Pro-6366f1?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**AI-Powered Resume Analysis & Career Enhancement Platform**

Transform your resume with advanced AI analysis, intelligent chat assistance, and professional audio summaries.

[Features](#-features) • [Installation](#-installation) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

---

## 🌟 Overview

**VocaResume Pro** is a comprehensive, AI-powered platform designed to revolutionize how professionals analyze, optimize, and present their resumes. Leveraging cutting-edge AI models from Groq (Llama 3.3, Qwen) and Google Gemini, VocaResume Pro provides intelligent insights, personalized recommendations, and interactive features to help you land your dream job.

### Why VocaResume Pro?

- 🤖 **Multi-Model AI Analysis**: Choose from Llama 3.3 70B, Qwen 3 32B, or Gemini 2.5 Flash
- 💬 **Intelligent RAG Chat**: Context-aware conversations about your resume
- 🎙️ **Professional Audio Summaries**: Google Cloud TTS for high-quality voice synthesis
- 📊 **ATS Optimization**: Improve your resume's compatibility with Applicant Tracking Systems
- 🎯 **Job Fit Scoring**: Quantify how well your resume matches job descriptions
- 🔒 **Privacy-First**: Your data stays secure with MongoDB and MinIO object storage

---

## ✨ Features

### 🎯 Core Features

#### 1. **Comprehensive Resume Analysis**
- **Strengths & Weaknesses Identification**: AI-powered analysis highlighting your resume's strong points and areas for improvement
- **ATS Optimization Suggestions**: Specific recommendations to improve compatibility with Applicant Tracking Systems
- **Skills Gap Analysis**: Identify missing skills for target positions
- **Formatting & Structure Review**: Professional guidance on layout and organization

#### 2. **Job Fit Score**
- **Intelligent Matching**: Quantitative scoring (0-100) comparing your resume against job descriptions
- **Keyword Analysis**: Identification of matching and missing keywords
- **Requirements Alignment**: Detailed breakdown of how your experience matches job requirements
- **Improvement Recommendations**: Specific suggestions to increase your job fit score

#### 3. **Interview Preparation**
- **Custom Question Generation**: AI-generated interview questions based on your resume and target job
- **Behavioral Questions**: STAR-method compatible questions tailored to your experience
- **Technical Assessment**: Role-specific technical questions and scenarios
- **Sample Answers**: Suggested response frameworks for common questions

#### 4. **Intelligent RAG Chat Assistant**
- **Context-Aware Conversations**: Ask questions about your resume and get intelligent responses
- **Multi-Model Support**: Choose from Llama 3.3 70B, Qwen 3 32B, Gemini 2.5 Flash, or Gemini 2.0 Flash
- **Vector Search Integration**: Retrieval-Augmented Generation using Qdrant vector database
- **Conversation History**: Persistent chat sessions with full context retention

#### 5. **Audio Summary Generation**
- **Professional Voice Synthesis**: Google Cloud Text-to-Speech with Neural2-C voice
- **Custom Audio Player**: Modern, intuitive player with waveform visualization
- **Multiple TTS Providers**: 
  - Primary: Google Cloud TTS (4M characters/month free)
  - Fallback: Browser Web Speech API
- **Playback Controls**: Play, pause, seek, volume control, and time display

#### 6. **Document Management**
- **Multi-Format Support**: Upload PDF, DOCX, and TXT resume files
- **Secure Storage**: MinIO S3-compatible object storage with encryption
- **Version History**: Track multiple versions of your resume
- **Quick Actions**: Fast access to analysis, chat, and audio features

### 🎨 User Experience

#### Modern, Responsive UI
- **Gradient-Based Design**: Beautiful purple-to-brand gradient accents
- **Dark Mode Support**: Automatic theme switching with system preferences
- **Glass Morphism**: Contemporary glassmorphism effects throughout
- **Grid Background**: Consistent, subtle grid patterns on all pages
- **Mobile-Optimized**: Fully responsive design for all device sizes

#### Smooth Animations
- **Page Transitions**: Framer Motion powered animations
- **Loading States**: Elegant skeleton screens and progress indicators
- **Interactive Elements**: Micro-interactions for better user engagement

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18.3+ with Vite 5.4
- **Routing**: React Router DOM 6.28
- **Styling**: Tailwind CSS 3.4 with custom configuration
- **UI Components**: 
  - Headless UI for accessible components
  - Heroicons for consistent iconography
  - Framer Motion for animations
- **Form Management**: React Hook Form with Zod validation
- **Notifications**: Sonner for toast notifications

### Backend
- **Framework**: Fastify 4.28 (high-performance Node.js framework)
- **Authentication**: JWT with refresh tokens (@fastify/jwt)
- **File Upload**: Multipart support (@fastify/multipart)
- **Security**: 
  - Argon2 password hashing
  - Rate limiting (@fastify/rate-limit)
  - CORS configuration (@fastify/cors)
- **Real-time**: WebSocket support (@fastify/websocket)

### AI & Machine Learning
- **LLM Providers**:
  - Groq API (Llama 3.3 70B, Llama 3.1 8B, Qwen 3 32B)
  - Google Gemini (2.5 Flash, 2.0 Flash)
  - Local Ollama support (optional)
- **Text-to-Speech**: Google Cloud TTS (@google-cloud/text-to-speech)
- **Vector Database**: Qdrant (@qdrant/js-client-rest) for embeddings
- **Document Processing**: 
  - PDF parsing (pdf-parse)
  - DOCX extraction (mammoth)

### Data Storage
- **Primary Database**: MongoDB 8.0+ with Mongoose ODM
- **Cache Layer**: Redis (ioredis) for session management and caching
- **Object Storage**: MinIO (S3-compatible) for resume files
- **Vector Store**: Qdrant for semantic search and RAG

### Background Processing
- **Queue System**: BullMQ with Redis
- **Worker Architecture**: Dedicated worker processes for:
  - Resume parsing and embedding generation
  - Vector database indexing
  - Audio file generation

### Monitoring & Logging
- **Logging**: Winston logger with rotation
- **Metrics**: Prometheus client for monitoring
- **Health Checks**: Dedicated health check endpoints

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────┐ │
│  │  Login   │Documents │ Analysis │   Chat   │   Audio   │ │
│  └──────────┴──────────┴──────────┴──────────┴───────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API / WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Fastify)                        │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │     Auth     │   Document   │      AI Services         │ │
│  │  Middleware  │   Upload     │   (LLM, TTS, RAG)        │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└──────┬────────────┬────────────┬────────────┬───────────────┘
       │            │            │            │
       ▼            ▼            ▼            ▼
   MongoDB       Redis       MinIO        Qdrant
  (Database)    (Cache)    (Storage)    (Vectors)
       │            │            │            │
       └────────────┴────────────┴────────────┘
                    │
                    ▼
            ┌───────────────┐
            │ Worker Queues │
            │   (BullMQ)    │
            └───────────────┘
                    │
                    ▼
        ┌──────────────────────┐
        │   Background Jobs    │
        │  • Parsing           │
        │  • Embeddings        │
        │  • Indexing          │
        └──────────────────────┘
```

### Data Flow

1. **User uploads resume** → Frontend sends multipart form to Backend
2. **Backend stores file** → MinIO object storage
3. **Job queued** → BullMQ Redis queue for processing
4. **Worker processes** → Extracts text, generates embeddings
5. **Embeddings indexed** → Qdrant vector database
6. **User requests analysis** → Backend calls LLM API (Groq/Gemini)
7. **AI generates insights** → Response cached in Redis
8. **Results displayed** → Frontend shows analysis with smooth animations

---

## 🚀 Installation

### Prerequisites

- **Node.js**: 18.x or higher
- **MongoDB**: 6.0 or higher
- **Redis**: 7.0 or higher
- **MinIO**: Latest version (or S3-compatible storage)
- **Qdrant**: 1.8 or higher (for vector search)

### Quick Start (Local Development)

#### 1. Clone the Repository

```bash
git clone https://github.com/PujanMevawala/voca-resume-pro.git
cd voca-resume-pro
```

#### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install worker dependencies
cd ../workers
npm install
```

#### 3. Set Up Environment Variables

Create `.env` files in `backend/`, `frontend/`, and `workers/` directories:

**backend/.env**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/vocaresume
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Service URLs
VECTOR_URL=http://localhost:6333
EMBEDDER_URL=http://localhost:3003

# MinIO Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=vocaresume

# AI API Keys
GEMINI_API_KEY=your-gemini-api-key-here
GROQ_API_KEY=your-groq-api-key-here

# Google Cloud TTS (Optional - for high-quality audio)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-cloud-key.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**frontend/.env**
```env
VITE_API_BASE=http://localhost:3001
```

**workers/.env**
```env
MONGODB_URI=mongodb://localhost:27017/vocaresume
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=resumes

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=resumes
```

#### 4. Start Required Services

**Using Docker Compose (Recommended)**
```bash
# Start MongoDB, Redis, MinIO, and Qdrant
docker-compose up -d mongo redis minio qdrant
```

**Or install manually**:
- MongoDB: `brew install mongodb-community` (macOS) or [Download](https://www.mongodb.com/try/download/community)
- Redis: `brew install redis` (macOS) or [Download](https://redis.io/download)
- MinIO: `brew install minio` (macOS) or [Download](https://min.io/download)
- Qdrant: [Docker or binary installation](https://qdrant.tech/documentation/quick-start/)

#### 5. Run the Application

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Start workers
cd workers
npm run dev
```

#### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

### Docker Deployment

For containerized deployment, use the provided Docker configuration:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## ⚙️ Configuration

### API Keys Setup

#### Groq API (Required for LLM features)
1. Visit [Groq Console](https://console.groq.com/)
2. Sign up for a free account
3. Generate an API key
4. Add to `backend/.env`: `GROQ_API_KEY=your_key_here`

**Available Models**:
- `llama-3.3-70b-versatile` (Recommended - Best quality)
- `llama-3.1-8b-instant` (Fast responses)
- `qwen/qwen3-32b` (Balanced performance)

#### Google Gemini API (Required for LLM features)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add to `backend/.env`: `GEMINI_API_KEY=your_key_here`

**Available Models**:
- `gemini-2.5-flash` (Latest, fastest)
- `gemini-2.0-flash` (Stable version)

#### Google Cloud TTS (Optional - for high-quality audio)
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Text-to-Speech API
3. Create a service account with TTS permissions
4. Download JSON key file
5. Configure in `backend/.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   ```

**Free Tier**: 4 million characters/month

**Fallback**: If not configured, the app automatically uses browser Web Speech API

### MinIO Configuration

For production, configure MinIO with proper access controls:

```env
MINIO_ENDPOINT=your-minio-host.com
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET=resumes
```

### Qdrant Configuration

For vector search functionality:

```env
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=resumes
```

**Production**: Use [Qdrant Cloud](https://cloud.qdrant.io/) for managed service

---

## 📖 Usage

### 1. User Registration & Login

1. Navigate to the login page
2. Click "Register" tab
3. Enter email and password (min 8 characters)
4. Login with your credentials

### 2. Upload Your Resume

1. Go to **Documents** page
2. Click "Upload Resume" or drag & drop
3. Supported formats: PDF, DOCX, TXT
4. Wait for processing (usually 10-30 seconds)

### 3. Run Comprehensive Analysis

1. Select a resume from Documents page
2. Click "Analyze"
3. Enter the job description you're targeting
4. Choose an AI model (Llama 3.3 70B recommended)
5. Click "Analyze Resume"
6. View detailed insights across multiple tabs:
   - **Overview**: Quick summary
   - **Strengths/Weaknesses**: Detailed breakdown
   - **Improvements**: Actionable suggestions
   - **Interview Prep**: Custom questions
   - **Job Fit Score**: Quantitative matching
   - **Audio Summary**: Professional narration

### 4. Chat with Your Resume

1. Go to **Chat** page
2. Select a resume
3. Choose your preferred AI model
4. Ask questions like:
   - "What are my strongest technical skills?"
   - "How can I improve this resume for a senior developer role?"
   - "What projects should I highlight?"
   - "Help me write a summary statement"

### 5. Generate Audio Summary

1. After running analysis, click "Generate Audio Summary"
2. Wait for AI to create a professional script
3. Use the custom audio player to listen
4. Features:
   - Play/pause
   - Seek to any position
   - Volume control
   - Waveform visualization
   - Time display

---

## 📚 API Documentation

### Authentication

All protected endpoints require JWT authentication:

```http
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### Authentication

**POST** `/api/user/register`
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**POST** `/api/user/login`
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Resume Management

**GET** `/api/resume` - List all user resumes

**GET** `/api/resume/:id` - Get specific resume details

**POST** `/api/resume/upload` - Upload new resume (multipart/form-data)

**DELETE** `/api/resume/:id` - Delete a resume

#### Analysis

**POST** `/api/analysis/comprehensive`
```json
{
  "resumeId": "resume_id",
  "jobDescription": "Full job posting text",
  "model": "llama-3.3-70b-versatile"
}
```

**POST** `/api/analysis/generate-script`
```json
{
  "analysis": { /* analysis object */ },
  "jobFitScore": 85,
  "model": "llama-3.3-70b-versatile"
}
```

#### Chat (RAG)

**POST** `/api/chat/message`
```json
{
  "resumeId": "resume_id",
  "message": "What are my key skills?",
  "model": "llama-3.3-70b-versatile",
  "conversationHistory": []
}
```

#### Audio

**POST** `/api/audio/tts`
```json
{
  "text": "Text to convert to speech",
  "voice": "en-US"
}
```

### Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional message"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

---

## 🚢 Deployment

### Production Checklist

- [ ] Change all default secrets and passwords
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure CDN for frontend assets
- [ ] Use managed services for databases (MongoDB Atlas, Redis Cloud)
- [ ] Implement proper error tracking (Sentry, etc.)

### Deployment Options

#### 1. **Vercel (Frontend) + Railway (Backend)**

**Frontend (Vercel)**:
```bash
cd frontend
vercel --prod
```

**Backend (Railway)**:
1. Create new project on [Railway](https://railway.app/)
2. Connect GitHub repository
3. Add environment variables
4. Deploy

#### 2. **Docker + Cloud Provider**

Build and push Docker images:
```bash
docker build -t vocaresume-backend:latest ./backend
docker build -t vocaresume-frontend:latest ./frontend
docker build -t vocaresume-workers:latest ./workers

# Push to container registry
docker push your-registry/vocaresume-backend:latest
docker push your-registry/vocaresume-frontend:latest
docker push your-registry/vocaresume-workers:latest
```

Deploy to:
- AWS ECS/EKS
- Google Cloud Run
- Azure Container Apps
- DigitalOcean App Platform

#### 3. **Kubernetes**

Use the provided Kubernetes manifests:
```bash
kubectl apply -f k8s/
```

### Environment Variables for Production

```env
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
MONGODB_URI=<production-mongodb-uri>
REDIS_URL=<production-redis-url>
CORS_ORIGIN=https://your-domain.com
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Code Style

- Use ESLint for JavaScript/TypeScript
- Follow Prettier formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation

### Commit Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions or modifications
- `chore:` Build process or auxiliary tool changes

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### Documentation

- [API Reference](docs/API.md)
- [Architecture Guide](docs/ARCHITECTURE.md)
- [Google Cloud TTS Setup](docs/GOOGLE_CLOUD_TTS_SETUP.md)

### Community

- **Issues**: [GitHub Issues](https://github.com/PujanMevawala/voca-resume-pro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/PujanMevawala/voca-resume-pro/discussions)

### Contact

- **Email**: support@vocaresume.pro
- **GitHub**: [@PujanMevawala](https://github.com/PujanMevawala)

---

## 🙏 Acknowledgments

- **Groq** for providing fast LLM inference
- **Google** for Gemini API and Cloud TTS
- **Qdrant** for vector database
- **Fastify** team for the excellent framework
- **React** and **Tailwind CSS** communities

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/PujanMevawala/voca-resume-pro?style=social)
![GitHub forks](https://img.shields.io/github/forks/PujanMevawala/voca-resume-pro?style=social)
![GitHub issues](https://img.shields.io/github/issues/PujanMevawala/voca-resume-pro)
![GitHub pull requests](https://img.shields.io/github/issues-pr/PujanMevawala/voca-resume-pro)

---

<div align="center">

**Made with ❤️ by the VocaResume Team**

[⬆ back to top](#-vocaresume-pro)

</div>
