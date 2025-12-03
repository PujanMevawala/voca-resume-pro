#!/bin/bash

# VocaResume - Start All Services Script
echo "🚀 Starting VocaResume Application..."

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Start infrastructure services
echo "📦 Starting infrastructure (Redis, MongoDB, MinIO, Qdrant)..."
docker compose -f infra/docker-compose.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are running
echo "✅ Checking service status..."
docker compose -f infra/docker-compose.yml ps

# Start backend
echo "🔧 Starting backend..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "
✨ VocaResume is starting!

📊 Services:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000
   - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
   - MongoDB: localhost:27017
   - Redis: localhost:6379
   - Qdrant: http://localhost:6333

🛑 To stop all services, run: ./stop-all.sh

Press Ctrl+C to stop watching logs...
"

# Keep script running and show logs
wait
