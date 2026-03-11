# RaktSetu - Real-Time Blood Donor Finder

A cloud-based platform that connects patients and hospitals with nearby eligible blood donors using geo-spatial matching and ML-based donor availability prediction.

## Features

- **3 User Roles**: Donor, Patient, Hospital — each with dedicated dashboards
- **Geo-spatial Matching**: Find compatible donors within configurable radius using MongoDB 2dsphere indexes
- **ML Prediction**: Random Forest/XGBoost model predicts donor availability from synthetic data
- **Real-time Notifications**: Socket.io for instant alerts when requests are created or donors respond
- **Map Integration**: Mapbox GL JS for location picking, donor visualization, and distance display
- **Blood Group Compatibility**: Full ABO/Rh compatibility matching

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express, MongoDB, Mongoose |
| Real-time | Socket.io |
| ML Service | Python, Flask, scikit-learn, XGBoost |
| Maps | Mapbox GL JS |
| Deployment | Docker Compose |

## Project Structure

```
raktsetu/
├── client/          # React frontend (Vite + Tailwind)
├── server/          # Express API server
├── ml-service/      # Python ML microservice
├── docker-compose.yml
└── .env.example
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB 7+
- Docker & Docker Compose (for containerized setup)

### Option 1: Docker Compose (Recommended)

```bash
# Clone and enter project
cd raktsetu

# Copy environment file
cp .env.example .env
# Edit .env with your Mapbox token (optional) and JWT secret

# Start all services
docker-compose up --build
```

Access the app at `http://localhost`.

### Option 2: Local Development

**1. Start MongoDB**
```bash
mongod
```

**2. ML Service**
```bash
cd ml-service
pip install -r requirements.txt
python scripts/generate_data.py
python scripts/train_model.py
python app.py
```

**3. Backend**
```bash
cd server
npm install
cp ../.env.example ../.env   # edit as needed
npm run dev
```

**4. Frontend**
```bash
cd client
npm install
npm run dev
```

Access: Frontend at `http://localhost:3000`, API at `http://localhost:5000`.

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (with role selection) |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/users/profile` | Update profile/location/availability |
| GET | `/api/users/donors` | List donors (hospital only) |

### Blood Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/requests` | Create blood request |
| GET | `/api/requests` | List requests (role-filtered) |
| GET | `/api/requests/:id` | Request details |
| PUT | `/api/requests/:id` | Update request |
| POST | `/api/requests/:id/respond` | Donor accept/decline |
| PUT | `/api/requests/:id/fulfill` | Mark fulfilled |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications |
| PUT | `/api/notifications/read` | Mark as read |

### ML Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/predict` | Predict donor availability |

## ML Model

- **Dataset**: 6000 synthetic donor interaction records
- **Features**: distance_km, time_of_day, day_of_week, past_donations_count, avg_response_time, days_since_last_donation, blood_group_match, request_urgency
- **Models**: Random Forest, XGBoost (best by AUC-ROC is selected)
- **Target**: Donor response probability (0-1)

## Environment Variables

See `.env.example` for all required variables:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — Secret for JWT signing
- `MAPBOX_TOKEN` — Mapbox API token (for maps)
- `ML_SERVICE_URL` — URL of ML prediction service

## Testing

```bash
# Backend API tests
cd server && npm test

# ML model evaluation
cd ml-service && python scripts/train_model.py
```

## License

Academic project — Major Project 2026.
