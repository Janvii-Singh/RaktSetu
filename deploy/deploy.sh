#!/bin/bash

# RaktSetu Deployment Script
# Run this after cloning the repo on EC2

set -e

echo "🚀 RaktSetu Deployment Starting..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Creating .env file..."
    cat > .env << 'EOF'
# MongoDB (using local MongoDB in docker-compose)
MONGODB_URI=mongodb://mongodb:27017/raktsetu

# JWT Secret (CHANGE THIS!)
JWT_SECRET=change_this_to_random_string_for_production

# Optional: Email configuration
EMAIL_SERVICE=gmail
EMAIL_USER=
EMAIL_PASS=

# Optional: Twilio SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Optional: Mapbox
MAPBOX_TOKEN=
EOF

    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your actual values"
    echo "Run: nano .env"
    echo ""
    read -p "Press Enter after editing .env file..."
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Run ec2-setup.sh first"
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down 2>/dev/null || true

# Pull latest changes (if in git repo)
if [ -d .git ]; then
    echo "📥 Pulling latest changes..."
    git pull || true
fi

# Build and start services
echo "🏗️  Building Docker images (this may take 5-10 minutes)..."
docker compose build

echo "🚀 Starting services..."
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check status
echo ""
echo "📊 Container Status:"
docker compose ps

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://$(curl -s ifconfig.me):3000"
echo "   Backend:  http://$(curl -s ifconfig.me):5000/api/health"
echo "   ML Service: http://$(curl -s ifconfig.me):5001/health"
echo ""
echo "📝 View logs: docker compose logs -f"
echo "🔄 Restart: docker compose restart"
echo "🛑 Stop: docker compose down"
