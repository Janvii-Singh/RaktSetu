# RaktSetu — Complete Setup Guide

Step-by-step instructions to set up and run RaktSetu on a fresh machine. Two options are provided: **Docker Compose** (easiest) and **Manual Local Setup** (for development).

---

## Prerequisites

| Tool | Minimum Version | Check Command | Install |
|------|----------------|---------------|---------|
| **Git** | Any | `git --version` | https://git-scm.com |
| **Node.js** | 18+ | `node --version` | https://nodejs.org |
| **npm** | 9+ | `npm --version` | Comes with Node.js |
| **Python** | 3.11 or 3.12 (avoid 3.14) | `python3 --version` | https://python.org |
| **MongoDB** | 7+ | `mongod --version` | See Step 2 below |

> **Note on Python version**: Python 3.14 has compatibility issues with scikit-learn and xgboost. Use Python 3.11 or 3.12 for best results. If you have multiple Python versions, use the specific binary (e.g., `python3.12`) when creating the virtual environment.

### Optional

| Tool | Purpose | Install |
|------|---------|---------|
| **Docker + Docker Compose** | Containerized setup (Option A) | https://docs.docker.com/get-docker |
| **Mapbox Account** | Map features (location picker, donor map) | https://account.mapbox.com/auth/signup — free tier is sufficient |

---

## Clone the Repository

```bash
git clone <your-repo-url>
cd raktsetu
```

---

## Option A: Docker Compose (Easiest)

This starts everything — MongoDB, backend, frontend, and ML service — in containers. No local installs needed beyond Docker.

### Step 1: Create the environment file

```bash
cp .env.example .env
```

Edit `.env` and set these values:

```env
JWT_SECRET=any_long_random_string_here
MAPBOX_TOKEN=your_mapbox_public_token    # optional, maps won't work without it
```

### Step 2: Build and start

```bash
docker-compose up --build
```

First build takes 3–5 minutes (downloads base images, installs dependencies, trains the ML model).

### Step 3: Seed sample data (optional but recommended)

In a **new terminal**, while docker-compose is running:

```bash
docker exec -it raktsetu-server node seed.js
```

### Step 4: Open the app

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:5000/api/health |
| ML Service | http://localhost:5001/health |

### Stopping

```bash
docker-compose down          # stop containers
docker-compose down -v       # stop + delete MongoDB data
```

---

## Option B: Manual Local Setup (For Development)

Run each service directly on your machine. Best for active development since you get hot-reload on all services.

### Step 1: Create the environment file

```bash
cp .env.example .env
```

Edit `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/raktsetu
JWT_SECRET=raktsetu_dev_secret_key_2026
JWT_EXPIRE=7d
ML_SERVICE_URL=http://localhost:5001
PORT=5000
NODE_ENV=development
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
MAPBOX_TOKEN=your_mapbox_public_token
VITE_MAPBOX_TOKEN=your_mapbox_public_token
```

> Leave `MAPBOX_TOKEN` and `VITE_MAPBOX_TOKEN` empty if you don't have one — the app works without maps, showing manual coordinate inputs instead.

### Step 2: Install and start MongoDB

**macOS (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu/Debian:**
```bash
# Import MongoDB GPG key and add repo (see https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Windows:**
Download and install from https://www.mongodb.com/try/download/community. Start the MongoDB service from Services panel or run `mongod` manually.

**Verify MongoDB is running:**
```bash
mongosh --eval "db.runCommand({ping:1})"
# Should print: { ok: 1 }
```

### Step 3: Set up the ML Service

Open a **new terminal** (Terminal 1):

```bash
cd ml-service
```

Create a Python virtual environment. **Use Python 3.11 or 3.12** — not 3.14:

```bash
# If python3 points to 3.11/3.12:
python3 -m venv venv

# If you have multiple versions, be specific:
# python3.12 -m venv venv
# python3.11 -m venv venv
```

Activate the virtual environment:

```bash
# macOS / Linux:
source venv/bin/activate

# Windows (Command Prompt):
venv\Scripts\activate

# Windows (PowerShell):
venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Generate synthetic training data (6000 donor interaction records):

```bash
python scripts/generate_data.py
```

Expected output:
```
Generated 6000 records
Response rate: ~54%
Saved to .../data/donor_interactions.csv
```

Train the ML model:

```bash
python scripts/train_model.py
```

Expected output:
```
Training RandomForest...
  accuracy: ~0.56, auc_roc: ~0.59
Training XGBoost...
  accuracy: ~0.54, auc_roc: ~0.56
Best model: RandomForest
Model saved to .../model/donor_predictor.pkl
```

Start the ML service:

```bash
python app.py
```

Expected output:
```
Loaded model: RandomForest
 * Running on http://127.0.0.1:5001
```

**Verify:** Open http://localhost:5001/health — should return `{"model_loaded": true, "status": "ok"}`.

> Keep this terminal running.

### Step 4: Set up the Backend Server

Open a **new terminal** (Terminal 2):

```bash
cd server
npm install
```

Seed the database with sample data (10 donors, 2 patients, 1 hospital, 4 blood requests):

```bash
node seed.js
```

Expected output:
```
Connected to MongoDB
Created 10 donors
Created 2 patients
Created hospital user
Created 4 blood requests
...
Done! Database seeded successfully.
```

Start the backend server:

```bash
npm run dev
```

Expected output:
```
MongoDB Connected: localhost
Server running in development mode on port 5000
```

**Verify:** Open http://localhost:5000/api/health — should return `{"status": "ok"}`.

> Keep this terminal running.

### Step 5: Set up the Frontend

Open a **new terminal** (Terminal 3):

```bash
cd client
npm install
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

**Verify:** Open http://localhost:3000 — you should see the RaktSetu landing page.

> Keep this terminal running.

---

## Step 6: Using the App

### Sample Login Credentials

All seeded users have the password: **`password123`**

| Role | Email | Name | Blood Group |
|------|-------|------|-------------|
| **Donor** | rahul@example.com | Rahul Sharma | O+ |
| **Donor** | priya@example.com | Priya Singh | A+ |
| **Donor** | amit@example.com | Amit Kumar | B+ |
| **Donor** | sneha@example.com | Sneha Gupta | O- |
| **Donor** | vikram@example.com | Vikram Patel | AB+ |
| **Donor** | ananya@example.com | Ananya Reddy | A- |
| **Donor** | karan@example.com | Karan Mehta | B- |
| **Donor** | deepa@example.com | Deepa Nair | O+ |
| **Donor** | ravi@example.com | Ravi Joshi | A+ |
| **Donor** | meera@example.com | Meera Iyer | AB- |
| **Patient** | arun@example.com | Arun Verma | B+ |
| **Patient** | suman@example.com | Suman Das | O+ |
| **Hospital** | hospital@example.com | City General Hospital | — |

### What to try

1. **Login as Hospital** (`hospital@example.com`) — See all requests, donor pool, analytics, create new requests
2. **Login as Patient** (`arun@example.com`) — See your requests, create a new blood request
3. **Login as Donor** (`rahul@example.com`) — See matched requests, accept/decline
4. **Real-time test**: Open two browser tabs — one as patient, one as donor. Create a request from the patient tab and watch the donor tab get a notification
5. **Create a new request**: Login as hospital or patient, click "+ New Request", fill in blood group / urgency / location and submit. The system will automatically find and rank nearby compatible donors using geo-spatial matching + ML predictions

### Pre-seeded Blood Requests

| # | Blood Group | Urgency | Status | Hospital |
|---|-------------|---------|--------|----------|
| 1 | O+ | Urgent | Matched (1 accepted, 1 pending, 1 declined) | AIIMS Hospital |
| 2 | B+ | Critical | Matched (1 accepted, 1 pending) | City General Hospital |
| 3 | A+ | Normal | Fulfilled | Max Hospital |
| 4 | O- | Critical | Matched (1 pending) | City General Hospital |

---

## Getting a Mapbox Token (Optional)

Maps are optional — the app works without them (shows manual coordinate inputs). To enable maps:

1. Go to https://account.mapbox.com/auth/signup and create a free account
2. Go to https://account.mapbox.com/access-tokens/
3. Copy your **Default public token** (starts with `pk.`)
4. Paste it into `.env` for both:
   ```
   MAPBOX_TOKEN=pk.eyJ1Ijo...
   VITE_MAPBOX_TOKEN=pk.eyJ1Ijo...
   ```
5. Restart the frontend (`Ctrl+C` in Terminal 3, then `npm run dev` again)

---

## Service URLs Summary

| Service | URL | Port |
|---------|-----|------|
| Frontend (React) | http://localhost:3000 | 3000 |
| Backend API | http://localhost:5000 | 5000 |
| ML Service | http://localhost:5001 | 5001 |
| MongoDB | mongodb://localhost:27017 | 27017 |

---

## Common Issues & Troubleshooting

### MongoDB won't start
```bash
# macOS — check if service is running
brew services list | grep mongo

# Restart it
brew services restart mongodb-community

# Ubuntu — check status
sudo systemctl status mongod
```

### Python packages fail to install
This is usually a Python version issue. Ensure you are using **Python 3.11 or 3.12**:
```bash
python3 --version

# If it shows 3.14, use a specific version:
python3.12 -m venv venv   # or python3.11
source venv/bin/activate
pip install -r requirements.txt
```

### Port already in use
```bash
# Find and kill the process on a port (e.g., 5000):
lsof -ti:5000 | xargs kill -9

# Or change the port in .env
```

### ML service unreachable from backend
The backend gracefully handles this — donor matching still works using distance-based scoring without ML predictions. But to fix it:
- Make sure `ML_SERVICE_URL=http://localhost:5001` is set in `.env`
- Make sure the ML service is running (`python app.py` in the ml-service folder)
- Test: `curl http://localhost:5001/health`

### Frontend can't connect to backend
If API calls fail with network errors:
- Make sure the backend is running on port 5000
- Make sure `VITE_API_URL=http://localhost:5000/api` is set in `.env`
- The Vite dev server proxies `/api` and `/socket.io` to port 5000 automatically

### Re-seeding the database
To reset all data back to the sample state:
```bash
cd server
node seed.js
```
This clears and re-creates all users, requests, notifications, and history.

---

## Running Tests

### Backend API Tests
```bash
cd server
npm test
```

### ML Model Evaluation
```bash
cd ml-service
source venv/bin/activate
python scripts/train_model.py
```
This prints accuracy, precision, recall, F1, AUC-ROC, confusion matrix, and feature importances.

---

## Stopping All Services

### Manual setup
Press `Ctrl+C` in each of the 3 terminals (ML, backend, frontend), then:
```bash
# Stop MongoDB
brew services stop mongodb-community   # macOS
sudo systemctl stop mongod              # Linux
```

### Docker
```bash
docker-compose down       # stop containers
docker-compose down -v    # stop + delete all data
```
