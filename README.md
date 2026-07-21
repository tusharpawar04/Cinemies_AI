# Cinemies AI

Welcome to **Cinemies AI**, a full-stack movie recommendation platform with AI-powered personalization. 

## 🎬 Overview
Cinemies offers an immersive movie browsing experience by providing recommendations based on mood, taste calibration, and session history. It uses a modern architecture with React on the frontend, Node.js on the backend, and Python FastAPI for the AI engine.

## ✨ Features
- **Taste Calibration**: Onboarding flow where users rate movies to build a 384-dimensional taste vector.
- **Mood-Based Recommendations**: Select from 8 moods (Mind Bending, Comfort Food, etc.) and get AI-blended recommendations.
- **Smart Watchlist**: Add movies to a watchlist and mark them as watched with personalized ratings.
- **Streaming Availability**: Instantly see where to watch movies (Netflix, Prime, etc.) powered by TMDB and cached in PostgreSQL.
- **Immersive UI**: Features 3D graphics (Three.js), parallax effects, infinite scrolling, and micro-animations.

## 🚀 Quick Start

### 1. Requirements
- Node.js (v18+)
- Python (3.9+)
- PostgreSQL
- MongoDB
- Redis

### 2. Start Servers
To start all services simultaneously, you can run the provided PowerShell script:
```powershell
./start-servers.ps1
```

### 3. Access
- **Frontend App**: http://localhost:3003
- **Backend API**: http://localhost:5000
- **AI Engine API**: http://localhost:8000

## 📚 Documentation
For an in-depth understanding of the architecture, tech stack, and file-by-file responsibilities, please see [TECH_DOCS.md](./TECH_DOCS.md).

## 🛠 Tech Stack
- **Frontend**: React 18, Vite, Zustand, React Router v6, Framer Motion, Three.js
- **Backend**: Node.js, Express, Sequelize (PostgreSQL), Mongoose (MongoDB), Redis
- **AI Engine**: Python, FastAPI, FAISS, Sentence Transformers (all-MiniLM-L6-v2)

---
*Built with ❤️ for movie lovers.*
