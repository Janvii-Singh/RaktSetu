# 🚀 Quick Deploy to AWS (30 minutes)

## What You'll Get
- **Frontend:** Running on port 3000
- **Backend API:** Running on port 5000
- **ML Service:** Running on port 5001
- **MongoDB:** Local container with persistent storage
- **Cost:** ~$15-17/month (t3.small) or $0 first year (t2.micro free tier)

---

## Step 1: Launch EC2 (5 minutes)

1. **AWS Console → EC2 → Launch Instance**

2. **Settings:**
   ```
   Name: raktsetu-server
   AMI: Ubuntu Server 22.04 LTS
   Instance: t3.small (or t2.micro for free tier)

   Key pair: Create new "raktsetu-key" → Download .pem file

   Network:
   ✅ Allow SSH from My IP
   ✅ Allow HTTP from Internet
   ✅ Allow HTTPS from Internet

   Storage: 20 GB
   ```

3. **After launch:**
   - Go to Instance → Security → Security Group
   - Edit inbound rules → Add:
     ```
     Custom TCP | Port 3000 | 0.0.0.0/0
     Custom TCP | Port 5000 | 0.0.0.0/0
     Custom TCP | Port 5001 | 0.0.0.0/0
     ```

4. **Note your Public IP** (shown in instance details)

---

## Step 2: Push Code to GitHub (2 minutes)

```bash
# On your local machine, in the RaktSetu directory
git add .
git commit -m "Add deployment scripts"
git push origin main

# Note your GitHub repo URL
```

---

## Step 3: Setup EC2 (5 minutes)

```bash
# SSH into EC2 (replace with your IP and key path)
chmod 400 ~/Downloads/raktsetu-key.pem
ssh -i ~/Downloads/raktsetu-key.pem ubuntu@YOUR_EC2_IP

# Run setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/RaktSetu/main/deploy/ec2-setup.sh | bash

# Logout and login again
exit
ssh -i ~/Downloads/raktsetu-key.pem ubuntu@YOUR_EC2_IP
```

**Alternative (if GitHub not ready):**
```bash
# Copy setup script manually
scp -i ~/Downloads/raktsetu-key.pem deploy/ec2-setup.sh ubuntu@YOUR_EC2_IP:~
ssh -i ~/Downloads/raktsetu-key.pem ubuntu@YOUR_EC2_IP
bash ec2-setup.sh
exit
ssh -i ~/Downloads/raktsetu-key.pem ubuntu@YOUR_EC2_IP
```

---

## Step 4: Deploy Application (10 minutes)

```bash
# On EC2, clone your repo
git clone https://github.com/YOUR_USERNAME/RaktSetu.git
cd RaktSetu

# Run deployment script
bash deploy/deploy.sh

# Edit .env file when prompted (at minimum, set JWT_SECRET)
nano .env
# Change JWT_SECRET to a random string
# Save: Ctrl+X → Y → Enter

# Continue deployment
bash deploy/deploy.sh
```

**Wait 5-10 minutes** for images to build (first time only)

---

## Step 5: Test It! (2 minutes)

Open in your browser:
- **Frontend:** `http://YOUR_EC2_IP:3000`
- **Backend:** `http://YOUR_EC2_IP:5000/api/health`
- **ML Service:** `http://YOUR_EC2_IP:5001/health`

---

## Common Commands

```bash
# SSH into EC2
ssh -i ~/Downloads/raktsetu-key.pem ubuntu@YOUR_EC2_IP
cd RaktSetu

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop everything
docker compose down

# Update and redeploy
git pull
docker compose up -d --build

# Check container status
docker compose ps
```

---

## Troubleshooting

**Can't access the app?**
- Check Security Group has ports 3000, 5000, 5001 open
- Check containers are running: `docker compose ps`
- Check logs: `docker compose logs`

**Build takes too long?**
- First build: 5-10 minutes (ML service is large)
- Subsequent builds: 1-2 minutes (uses cache)

**Out of memory?**
- Upgrade to t3.medium (2GB RAM)
- Or use MongoDB Atlas instead of local MongoDB

---

## Cost Optimization

**Free Tier (First Year):**
```bash
# Use t2.micro instead of t3.small
Instance: t2.micro
Cost: $0/month for 750 hours/month
```

**After Free Tier:**
```bash
# Stop when not in use
aws ec2 stop-instances --instance-ids i-xxxxx

# Pay only for hours used
```

---

## What's Next?

- [ ] Add domain name + HTTPS (Let's Encrypt)
- [ ] Set up automated backups
- [ ] Configure CI/CD with GitHub Actions
- [ ] Add monitoring/alerts
- [ ] Scale to multiple instances with Load Balancer

See full guide: `DEPLOYMENT.md`
