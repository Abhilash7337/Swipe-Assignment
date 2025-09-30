# Swipe Interview System - Backend Setup

This backend provides API endpoints for user management, session persistence, and interview data storage using Node.js, Express.js, and MongoDB with JWT authentication.

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Update the `.env` file in the backend directory with your MongoDB connection string and JWT secret:

```env
# Environment Variables
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/swipe_interview
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/swipe_interview

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Cors
FRONTEND_URL=http://localhost:5173
```

### 3. MongoDB Setup

**Option A: Local MongoDB**
1. Install MongoDB locally
2. Start MongoDB service: `mongod`
3. Use the local connection string in `.env`

**Option B: MongoDB Atlas (Cloud)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and update `.env`
4. Whitelist your IP address

### 4. Start the Server

```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user by email
- `GET /auth/me` - Get current user (protected)
- `POST /auth/verify-token` - Verify JWT token

### Users
- `POST /users/save` - Save/update user data
- `GET /users/by-email/:email` - Get user by email
- `PUT /users/profile` - Update profile (protected)

### Sessions
- `POST /sessions/save` - Save session data
- `GET /sessions/get/:email` - Get session by email
- `DELETE /sessions/delete/:email` - Delete session

### Interviews
- `POST /interviews/create` - Create interview
- `PUT /interviews/:id/question` - Add/update question
- `PUT /interviews/:id/complete` - Complete interview
- `GET /interviews/user/:email` - Get user interviews

### Health Check
- `GET /health` - Server health status

## Features

- ✅ JWT-based authentication
- ✅ User registration and login
- ✅ Session persistence with MongoDB
- ✅ Interview data storage
- ✅ CORS configured for frontend
- ✅ Rate limiting
- ✅ Input validation
- ✅ Error handling
- ✅ Security headers with Helmet

## Database Schema

### Users Collection
- `name`, `email`, `phone`
- `resumeData` (text, data, fileType)
- `timestamps`

### Sessions Collection
- `user` (ObjectId reference)
- `email`
- `sessionData` (interview state)
- `expiresAt` (24 hours)

### Interviews Collection
- `user` (ObjectId reference)
- `candidateInfo`
- `questions` array with answers and scores
- `totalScore`, `averageScore`
- `status`, `duration`

## Security

- JWT tokens for authentication
- Rate limiting (100 requests per 15 minutes)
- Helmet for security headers
- Input validation with Mongoose
- CORS protection

## Development

The backend uses:
- **Express.js** - Web framework
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing (if needed)
- **helmet** - Security headers
- **cors** - Cross-origin requests
- **express-rate-limit** - Rate limiting
- **validator** - Input validation