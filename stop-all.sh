#!/bin/bash

# VocaResume - Stop All Services Script
echo "🛑 Stopping VocaResume Application..."

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Kill frontend and backend processes
echo "🔧 Stopping backend and frontend..."
pkill -f "node.*backend.*app.js"
pkill -f "vite"
pkill -f "npm.*dev"
pkill -f "npm.*start"

# Stop Docker services
echo "📦 Stopping infrastructure services..."
docker compose -f infra/docker-compose.yml down

echo "✅ All services stopped!"
