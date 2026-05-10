# RaktSetu AWS Deployment Guide - EC2 + Docker Compose

## Prerequisites
- AWS Account
- MongoDB Atlas account (free)
- Your .pem key file for SSH

---

## Step 1: MongoDB Atlas Setup (5 minutes)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create free account → Create Free Cluster
3. Choose: AWS, Free Tier (M0), closest region
4. Cluster Name: `raktsetu`

**Security Setup:**
- Database Access → Add New Database User:
  - Username: `raktsetu_user`
  - Password: (generate strong password, save it!)
  - Database User Privileges: Read and write to any database

- Network Access → Add IP Address:
  - Click "Allow Access from Anywhere" (0.0.0.0/0)
  - (For production: restrict to your EC2 IP later)

**Get Connection String:**
- Click "Connect" on your cluster
- Choose "Connect your application"
- Copy the connection string:
  ```
  mongodb+srv://raktsetu_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
  ```
- Replace `<password>` with your actual password
- Add database name at the end: `/raktsetu`
  ```
  mongodb+srv://raktsetu_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/raktsetu?retryWrites=true&w=majority
  ```
  
---

## Step 2: Launch EC2 Instance (10 minutes)

1. **Go to EC2 Dashboard**
   - Region: Choose closest to you (e.g., ap-south-1 for Mumbai)
   - Click "Launch Instance"

2. **Configure Instance:**
   ```
   Name: raktsetu-server

   AMI: Ubuntu Server 22.04 LTS (Free tier eligible)

   Instance type: t3.small
   (t2.micro is free but may be slow for ML model - upgrade if needed)

   Key pair: Create new key pair
     - Name: raktsetu-key
     - Type: RSA
     - Format: .pem
     - Download and save to ~/Downloads/raktsetu-key.pem

   Network settings:
     ✅ Allow SSH traffic from: My IP
     ✅ Allow HTTPS traffic from: Internet
     ✅ Allow HTTP traffic from: Internet

   Storage: 20 GB gp3
   ```

3. **Add Security Group Rule for Backend:**
   - After launch → Go to instance → Security tab
   - Click on Security Group (sg-xxxxx)
   - Edit inbound rules → Add rules:
   ```
   Type: Custom TCP, Port: 5000, Source: 0.0.0.0/0 (Backend API)
   Type: Custom TCP, Port: 5001, Source: 0.0.0.0/0 (ML Service)
   Type: Custom TCP, Port: 3000, Source: 0.0.0.0/0 (Frontend)
   ```

4. **Note your Public IP:**
   - Instance → Details → Public IPv4 address: `X.X.X.X`

---

## Step 3: Connect to EC2 and Install Docker (5 minutes)

**On your local machine:**

```bash
# Set permissions on key file
chmod 400 ~/Downloads/raktsetu-key.pem

# SSH into EC2
ssh -i ~/Downloads/raktsetu-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

**On EC2 instance, run these commands:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose git curl

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Enable Docker to start on boot
sudo systemctl enable docker
sudo systemctl start docker

# Logout and login again for group changes
exit
```

**SSH back in:**
```bash
ssh -i ~/Downloads/raktsetu-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>

# Verify Docker works
docker --version
docker compose version
```

---

## Step 4: Deploy Application (10 minutes)

**On EC2:**

```bash
# Clone repository (replace with your GitHub repo URL)
git clone https://github.com/YOUR_USERNAME/RaktSetu.git
cd RaktSetu

# Create .env file with your MongoDB Atlas connection string
cat > .env << 'EOF'
# MongoDB Atlas
MONGODB_URI=mongodb+srv://raktsetu_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/raktsetu?retryWrites=true&w=majority

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_random_string_here_change_me

# Email configuration (optional - for email notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Twilio (optional - for SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Mapbox (optional - for maps)
MAPBOX_TOKEN=
EOF

# Edit the .env file with your actual values
nano .env
# Press Ctrl+X, then Y, then Enter to save

# Update docker-compose.yml to remove local MongoDB
cp docker-compose.yml docker-compose.yml.backup

# Create production docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mongodb:
    image: mongo:5
    container_name: raktsetu-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped
    networks:
      - raktsetu-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.runCommand('ping').ok"]
      interval: 10s
      timeout: 5s
      retries: 5

  ml-service:
    build: ./ml-service
    container_name: raktsetu-ml
    ports:
      - "5001:5001"
    environment:
      - ML_PORT=5001
      - FLASK_DEBUG=false
    restart: unless-stopped
    networks:
      - raktsetu-network
    volumes:
      - ml-models:/app/model
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  server:
    build: ./server
    container_name: raktsetu-server
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGODB_URI=mongodb://mongodb:27017/raktsetu
      - JWT_SECRET=${JWT_SECRET:-raktsetu_jwt_secret_2024_change_me}
      - JWT_EXPIRE=7d
      - ML_SERVICE_URL=http://ml-service:5001
      - MAPBOX_TOKEN=${MAPBOX_TOKEN:-}
    depends_on:
      mongodb:
        condition: service_healthy
      ml-service:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - raktsetu-network
    volumes:
      - ./server:/app
      - /app/node_modules

  client:
    build:
      context: ./client
      args:
        - VITE_API_URL=/api
        - VITE_MAPBOX_TOKEN=${MAPBOX_TOKEN:-}
    container_name: raktsetu-client
    ports:
      - "3000:80"
    depends_on:
      - server
    restart: unless-stopped
    networks:
      - raktsetu-network

networks:
  raktsetu-network:
    driver: bridge

volumes:
  mongo-data:
  ml-models:
EOF

# Build and start all services
docker compose up -d --build
```

**This will take 5-10 minutes for the first build (ML service is large).**

Monitor the build:
```bash
# Watch logs
docker compose logs -f

# Check status
docker compose ps
```

---

## Step 5: Test Deployment

**Test from your local machine:**

```bash
# Replace with your EC2 public IP
EC2_IP="X.X.X.X"

# Test backend
curl http://$EC2_IP:5000/api/health

# Test ML service
curl http://$EC2_IP:5001/health

# Open frontend in browser
open http://$EC2_IP:3000
```

---

## Step 6: Set Up Auto-Start on Reboot (2 minutes)

**On EC2:**

```bash
# Create systemd service
sudo nano /etc/systemd/system/raktsetu.service
```

Paste this:
```ini
[Unit]
Description=RaktSetu Docker Compose
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/RaktSetu
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=ubuntu

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable raktsetu
sudo systemctl start raktsetu

# Check status
sudo systemctl status raktsetu
```

---

## Accessing Your Application

- **Frontend:** http://YOUR_EC2_IP:3000
- **Backend API:** http://YOUR_EC2_IP:5000/api
- **ML Service:** http://YOUR_EC2_IP:5001

---

## Cost Estimate

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| EC2 t3.small | On-demand | ~$15-17/month |
| EC2 Data Transfer | First 100GB free | ~$0-5 |
| MongoDB Atlas | M0 Free Tier | $0 |
| **Total** | | **~$15-22/month** |

**To reduce costs:**
- Use t2.micro (free tier eligible for first year): $0/month first year
- Stop instance when not in use: Pay only for hours used

---

## Maintenance Commands

```bash
# SSH into EC2
ssh -i ~/Downloads/raktsetu-key.pem ubuntu@<EC2_IP>

# View logs
docker compose logs -f

# Restart all services
docker compose restart

# Stop all services
docker compose down

# Update code and redeploy
git pull
docker compose up -d --build

# View resource usage
docker stats
```

---

## Troubleshooting

**If services won't start:**
```bash
# Check logs
docker compose logs server
docker compose logs ml-service
docker compose logs client

# Check if ports are available
sudo netstat -tlnp | grep -E '3000|5000|5001'

# Rebuild from scratch
docker compose down -v
docker compose up -d --build
```

**If MongoDB connection fails:**
- Verify MongoDB Atlas connection string in .env
- Check Network Access allows 0.0.0.0/0
- Test connection: `mongosh "YOUR_MONGODB_URI"`

---

## Next Steps (Optional)

1. **Domain Name + HTTPS:**
   - Buy domain from Namecheap/GoDaddy
   - Point A record to EC2 IP
   - Install Let's Encrypt SSL cert
   - Configure nginx reverse proxy

2. **CI/CD Pipeline:**
   - Set up GitHub Actions
   - Auto-deploy on push to main branch

3. **Monitoring:**
   - CloudWatch for logs
   - AWS CloudWatch Agent for metrics
   - Uptime monitoring (UptimeRobot, Pingdom)

4. **Backup:**
   - MongoDB Atlas automatic backups (included)
   - EC2 AMI snapshots for disaster recovery
