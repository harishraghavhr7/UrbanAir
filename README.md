# 🌿 UrbanAir — Urban Air Quality Assistant

> A GenAI-powered assistant that helps families navigate severe urban air pollution with personalized, location-aware recommendations.

---

## 📁 Project Structure

```
Urbsafe/
├── backend/                  # FastAPI + Python + LangChain
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── api/routes/       # aqi, profile, chat, routine
│   │   ├── services/         # AQI fetching, profile CRUD
│   │   ├── ai/               # GenAI suggestion engine
│   │   ├── models/           # Pydantic schemas
│   │   └── core/             # Config, settings
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── mobile/                   # React Native + Expo Router
│   ├── app/
│   │   ├── _layout.tsx       # Root layout + QueryClient
│   │   ├── (tabs)/           # Tab navigation
│   │   │   ├── index.tsx     # Home (AQI dashboard)
│   │   │   ├── routine.tsx   # Daily routine planner
│   │   │   └── chat.tsx      # AI chat assistant
│   │   └── profile.tsx       # Profile setup
│   ├── src/
│   │   ├── screens/          # Screen components
│   │   ├── services/api.ts   # Axios API client
│   │   ├── store/            # Zustand global state
│   │   ├── hooks/            # TanStack Query hooks
│   │   └── constants/        # AQI colors, URLs
│   └── app.json
│
└── docker-compose.yml        # Redis + Backend together
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend

# Copy and fill in your API keys
cp .env.example .env

# Install dependencies
pip install -r requirements.txt

# Start Redis (or use Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Run the API server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone.

### 3. Docker (Backend + Redis together)

```bash
# From project root
docker-compose up --build
```

---

## 🔑 Required API Keys

| Service | URL | Free Tier |
|---------|-----|-----------|
| **Gemini API** | https://aistudio.google.com | ✅ Free |
| **OpenWeatherMap** | https://openweathermap.org/api | ✅ 1000/day |
| **WAQI** | https://aqicn.org/data-platform/token | ✅ 1000/day |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/aqi/current?lat=&lng=&city=` | Real-time AQI |
| GET | `/api/v1/aqi/forecast?lat=&lng=` | 24hr forecast |
| GET | `/api/v1/aqi/suggestions?lat=&lng=&city=&user_id=` | AI suggestions |
| GET | `/api/v1/routine/daily?lat=&lng=&city=` | Daily routine plan |
| POST | `/api/v1/profile/` | Create user profile |
| PUT | `/api/v1/profile/{user_id}` | Update profile |
| POST | `/api/v1/chat/` | Chat with AI assistant |
| GET | `/health` | Health check |

---

## 📱 App Screens

| Screen | Description |
|--------|-------------|
| **Home** | AQI card, cigarette equivalent, top suggestions, safe window |
| **Daily Routine** | Hourly AQI forecast chart + time-blocked AI day plan |
| **Ask AI** | Conversational chat with quick-question chips |
| **Profile** | Lifestyle quiz — commute, household, health conditions |
