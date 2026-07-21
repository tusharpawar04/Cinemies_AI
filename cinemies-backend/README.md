# Cinemies Backend

> Production-ready Node.js backend for AI-powered movie recommendations

## Overview

The Cinemies backend is a robust Express.js API that bridges a high-speed web layer with a heavy machine learning model. It manages strict data boundaries across a dual-database architecture and provides robust error handling for seamless user experiences.

**📑 [Documentation Index](./INDEX.md)** - Complete guide to all documentation

### Key Features

- **Dual-Database Architecture**: PostgreSQL for relational data, MongoDB for document storage
- **AI Integration**: Seamless connection to Python FastAPI recommendation engine
- **Redis Caching**: 1-hour TTL for recommendation responses
- **JWT Authentication**: Secure user sessions with token-based auth
- **Graceful Degradation**: Automatic fallback when AI service is unavailable
- **Industry Filtering**: Support for Hollywood, Bollywood, Tollywood content

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Run database migration
npm run migrate

# Verify setup (checks all services)
npm run verify

# Start development server
npm run dev
```

**📚 Documentation:**
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Commands and endpoints cheat sheet ⚡
- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Technical deep-dive
- **[ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)** - Visual architecture diagrams
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Complete project overview
- **[BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)** - Architecture overview
- **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - Completion checklist

## Architecture

### Data Flow

```
Client Request
    ↓
Express API (Port 5000)
    ↓
Redis Cache Check
    ↓ (cache miss)
AI Service (Python FastAPI, Port 8000)
    ↓ (if AI fails)
MongoDB Fallback (mood_scores)
    ↓
Cache Result (1 hour TTL)
    ↓
Return to Client
```

### Database Schema

**PostgreSQL** (Identity & Relationships):
- `users` - Authentication and identity
- `user_profiles` - User preferences and favorite movies
- `interactions` - Activity tracking for ML training

**MongoDB** (Movie Metadata):
- `movies` collection - TMDB data with AI mood classifications

**Redis** (Caching):
- Recommendation results (1 hour TTL)
- Session data

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token

### Movies
- `GET /api/v1/movies/search?q=query` - Search movies by title/overview
- `GET /api/v1/movies/:tmdb_id` - Get movie details
- `GET /api/v1/movies/trending` - Get trending movies

### Recommendations (Core)
- `GET /api/v1/recommendations/mood/:mood` - Mood-based recommendations
- `GET /api/v1/recommendations/mood/:mood?industry=bollywood` - Filtered by industry
- `GET /api/v1/recommendations/moods` - Get available moods
- `POST /api/v1/recommendations/personalized` - Personalized recommendations (auth required)

### User Profile
- `GET /api/v1/users/profile` - Get user profile (protected)
- `PUT /api/v1/users/profile` - Update profile (protected)
- `POST /api/v1/users/favorites` - Add favorite movie (protected)
- `DELETE /api/v1/users/favorites/:tmdb_id` - Remove favorite (protected)

### Interactions
- `POST /api/v1/interactions` - Track user interaction (protected)

## Implementation Details

**See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for in-depth technical documentation.**

### Critical Components

**1. AI Orchestrator** (`src/controllers/recommendation.controller.js`)
- Combines Redis caching, Axios requests, and fallback logic
- 3-second timeout to prevent thread hanging
- Automatic MongoDB fallback when AI service is down

**2. JWT Middleware** (`src/middleware/auth.js`)
- Strict token validation
- Extracts user payload and attaches to request
- Returns clear error messages for invalid/expired tokens

**3. Movie Model** (`src/models/Movie.js`)
- Mongoose schema with text indexes
- Supports industry classification
- Stores AI-generated mood_scores

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_DB=cinemies
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/cinemies

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d

# AI Service
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT=3000
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Lint code
npm run lint
```

### Manual Testing

```bash
# Test AI integration
curl http://localhost:5000/api/v1/recommendations/mood/mind_bending

# Test with industry filter
curl http://localhost:5000/api/v1/recommendations/mood/comfort_food?industry=bollywood

# Test authentication
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

## Error Handling

The backend implements graceful degradation:

1. **AI Service Down**: Falls back to MongoDB mood_scores
2. **Redis Down**: Skips caching, serves directly from source
3. **Invalid JWT**: Returns 403 with clear error message
4. **Database Connection**: Logs error and returns user-friendly message

## Performance

- **Redis Caching**: 1-hour TTL reduces AI service load
- **MongoDB Indexes**: Text search on title/overview for fast queries
- **PostgreSQL Indexes**: On user_id, movie_tmdb_id, created_at
- **AI Timeout**: 3-second max prevents hanging requests

## Security

- **Helmet.js**: Security headers
- **Rate Limiting**: 100 requests per 15 minutes
- **CORS**: Configurable origin whitelist
- **Input Validation**: Express-validator on all inputs
- **SQL Injection**: Parameterized queries via Sequelize
- **NoSQL Injection**: Mongoose sanitization
- **XSS Protection**: xss-clean middleware

## Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production deployment instructions.

## Project Structure

```
cinemies-backend/
├── database/
│   ├── schema.sql          # PostgreSQL schema
│   └── migrate.js          # Migration script
├── src/
│   ├── config/             # Environment configuration
│   ├── controllers/        # Request handlers
│   ├── database/           # Database connections
│   ├── middleware/         # Auth, validation, errors
│   ├── models/             # Data models (Sequelize & Mongoose)
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic (AI service)
│   ├── utils/              # Helper functions
│   ├── app.js              # Express app setup
│   └── server.js           # Server entry point
├── .env.example            # Environment template
├── package.json
├── IMPLEMENTATION_GUIDE.md # Technical deep-dive
└── SETUP.md                # Setup instructions
```

## Contributing

1. Follow the existing code structure
2. Write tests for new features
3. Update documentation
4. Run linter before committing

## License

MIT

Enterprise-grade Node.js backend for the Cinemies movie recommendation platform.

## 🔒 Security Features

- **6 Layers of Security**: Defense in depth architecture
- **JWT Authentication**: Access & refresh tokens
- **Rate Limiting**: Multiple tiers for different endpoints
- **Input Validation**: Joi schemas at all entry points
- **SQL/NoSQL Injection Prevention**: Parameterized queries & sanitization
- **XSS Protection**: Input sanitization & security headers
- **Account Lockout**: 5 failed attempts = 2-hour lockout
- **Helmet.js**: Security headers (CSP, HSTS, etc.)

## 🏗️ Architecture

### Tech Stack
- **Framework**: Express.js
- **Databases**: 
  - PostgreSQL (user data)
  - MongoDB (movie catalog)
  - Redis (caching)
- **Authentication**: JWT with bcrypt
- **Validation**: Joi schemas
- **Logging**: Winston

### Project Structure
```
src/
├── config/          # Configuration
├── database/        # Database connections
├── models/          # Data models
├── middleware/      # Express middleware
├── routes/          # API routes
├── controllers/     # Business logic
├── services/        # External services
├── utils/           # Utilities
├── app.js           # Express app
└── server.js        # Entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- MongoDB 6+
- Redis 7+

### Installation

1. Clone the repository
```bash
cd cinemies-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your values
```

4. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### Authentication
```
POST   /api/v1/auth/register          Register new user
POST   /api/v1/auth/login             Login user
POST   /api/v1/auth/refresh           Refresh access token
POST   /api/v1/auth/logout            Logout user
POST   /api/v1/auth/forgot-password   Request password reset
POST   /api/v1/auth/reset-password    Reset password
GET    /api/v1/auth/me                Get current user
```

### User Profile
```
GET    /api/v1/users/profile                Get user profile
PUT    /api/v1/users/profile                Update profile
POST   /api/v1/users/profile/favorites      Add favorite movie
DELETE /api/v1/users/profile/favorites/:id  Remove favorite
GET    /api/v1/users/profile/history        Get watch history
```

### Movies
```
GET    /api/v1/movies                 Get all movies (paginated)
GET    /api/v1/movies/search          Search movies
GET    /api/v1/movies/:id             Get movie details
GET    /api/v1/movies/trending        Get trending movies
```

### Recommendations
```
GET    /api/v1/recommendations/mood/:mood    Mood-based recommendations
POST   /api/v1/recommendations/personalized  Personalized recommendations
GET    /api/v1/recommendations/moods         Available moods
DELETE /api/v1/recommendations/cache         Clear cache
```

### Interactions
```
POST   /api/v1/interactions           Log interaction
GET    /api/v1/interactions/history   Get history
GET    /api/v1/interactions/stats     Get statistics
```

## 🔐 Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Security
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRE=30d
BCRYPT_ROUNDS=12

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=cinemies_users
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_SSL=false

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=cinemies
MONGODB_COLLECTION=movies

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=3600

# AI Service
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT=5000
AI_SERVICE_RETRY_ATTEMPTS=3

# CORS
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# Frontend
FRONTEND_URL=http://localhost:5173
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- auth.test.js
```

## 📊 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 5 requests | 15 minutes |
| Registration | 3 requests | 1 hour |
| Password Reset | 3 requests | 1 hour |
| Recommendations | 30 requests | 1 minute |
| Search | 20 requests | 1 minute |

## 🔄 Database Schema

### PostgreSQL (Users)
- **users**: Authentication data
- **user_profiles**: User preferences & favorites
- **interactions**: User activity tracking

### MongoDB (Movies)
- **movies**: Complete movie catalog with metadata

### Redis (Cache)
- Recommendation results (1 hour TTL)
- Movie details (24 hours TTL)
- Trending movies (6 hours TTL)

## 📝 Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Uncaught exceptions

## 🚢 Deployment

### Production Checklist
- [ ] Set strong JWT secrets
- [ ] Configure database passwords
- [ ] Restrict CORS origins
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Configure log rotation
- [ ] Set up monitoring
- [ ] Enable database backups

### Docker (Optional)
```bash
docker-compose up -d
```

## 🤝 Contributing

1. Follow the existing code structure
2. Write tests for new features
3. Update documentation
4. Follow security best practices

## 📄 License

Private - Cinemies Project

## 👥 Team

- **Backend Engineer**: Tejas
- **AI Engineer**: Tushar
- **Frontend Engineer**: Sonu

---

**Status**: Production Ready ✅  
**Security Level**: Enterprise Grade 🔒  
**Last Updated**: April 2026
