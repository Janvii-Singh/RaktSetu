#!/bin/bash

# RaktSetu EC2 Setup Script
# Run this on your EC2 instance after first login

set -e

echo "🚀 RaktSetu EC2 Setup Starting..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker and tools
echo "🐳 Installing Docker..."
sudo apt install -y docker.io docker-compose git curl

# Add user to docker group
echo "👤 Configuring Docker permissions..."
sudo usermod -aG docker ubuntu
sudo systemctl enable docker
sudo systemctl start docker

# Install Docker Compose V2
echo "📦 Installing Docker Compose V2..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "✅ Setup complete!"
echo ""
echo "⚠️  IMPORTANT: Logout and login again for Docker permissions to take effect"
echo ""
echo "Next steps:"
echo "1. exit"
echo "2. ssh back in"
echo "3. git clone your repository"
echo "4. cd RaktSetu"
echo "5. Run: bash deploy/deploy.sh"
