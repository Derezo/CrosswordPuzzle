# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Galactic Crossword is a full-stack web application that allows users to solve daily crossword puzzles with a cosmic theme. The app features user authentication, achievements, leaderboards, and mobile-first responsive design.

## Technology Stack

### Backend (Node.js/Express)
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js (Local + Google OAuth)
- **Security**: JWT tokens, bcrypt, helmet, CORS, rate limiting
- **Task Scheduling**: node-cron for daily puzzle generation
- **Location**: `./backend/`

### Frontend (Next.js/React)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with framer-motion
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Location**: `./frontend/`

## Development Commands

### Backend Development
```bash
cd backend
npm install                    # Install dependencies
npm run dev                   # Start development server with nodemon
npm run build                 # Build TypeScript to JavaScript
npm start                     # Run production build
```

### Frontend Development
```bash
cd frontend
npm install                   # Install dependencies
npm run dev                   # Start Next.js development server
npm run build                 # Build for production
npm start                     # Run production build
npm run lint                  # Run ESLint
```

### Database Setup
1. Install and start MongoDB locally OR use MongoDB Atlas
2. Copy `backend/.env.example` to `backend/.env`
3. Update `MONGODB_URI` in `.env` file
4. The application will automatically create collections and seed achievements on first run

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/crossword_puzzle
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_SECRET=your-session-secret
PUZZLE_SECRET=your-puzzle-generation-secret
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Architecture Overview

### Backend Architecture
- **Models**: User, DailyPuzzle, UserProgress, Achievement, UserAchievement
- **Routes**: `/api/auth`, `/api/puzzle`, `/api/leaderboard`, `/api/achievement`
- **Services**: 
  - `puzzle/generator.ts` - Deterministic crossword generation
  - `puzzle/cronService.ts` - Daily puzzle scheduling
  - `achievement/achievementService.ts` - Achievement logic
- **Middleware**: Authentication, rate limiting, error handling

### Frontend Architecture
- **Pages**: Login, Register, Puzzle, Leaderboard, Achievements
- **Components**: CrosswordGrid, CrosswordClues, Navigation
- **Contexts**: AuthContext for user state management
- **API Layer**: Centralized API calls with interceptors

### Key Features Implementation

#### Daily Puzzle Generation
- Uses cryptographic hashing (date + secret) for deterministic generation
- Cron job runs daily at midnight UTC
- Ensures all users get the same puzzle each day
- Grid size: 15x15 with cosmic/space-themed words and clues

#### Authentication System
- Email/password registration and login
- Google OAuth integration
- JWT token-based authentication
- Protected routes on both frontend and backend

#### Achievement System
- 10 default achievements with various conditions
- Real-time achievement checking on answer validation
- Point-based system affecting leaderboard rankings
- Achievement types: speed, consistency, accuracy, timing

#### Answer Validation
- Row/column completion checking
- Visual feedback with red/green transitions
- Real-time progress tracking
- Achievement triggers on successful validation

## Testing

### Backend Testing
```bash
cd backend
# Add test framework and run tests
npm test
```

### Frontend Testing
```bash
cd frontend
# Add test framework and run tests
npm test
```

## Deployment Considerations

### Backend Deployment
- Requires MongoDB instance
- Set production environment variables
- Enable HTTPS in production
- Configure proper CORS origins
- Set up process manager (PM2 recommended)

### Frontend Deployment
- Build static assets: `npm run build`
- Configure API base URL for production
- Set up CDN for static assets
- Enable proper meta tags for SEO

## Development Guidelines

- Follow TypeScript strict mode
- Use meaningful commit messages
- Implement proper error handling
- Validate all user inputs
- Use environment variables for sensitive data
- Follow RESTful API conventions
- Maintain responsive design principles
- Test on multiple devices and browsers

## Database Schema

### Collections
- `users` - User accounts and points
- `dailypuzzles` - Generated crossword data
- `userprogresses` - Individual solving progress
- `achievements` - Available achievements
- `userachievements` - Earned achievements

### Indexes
- Compound indexes on userId + puzzleDate
- Date indexes for efficient puzzle queries
- Point sorting indexes for leaderboards

## Troubleshooting

### Common Issues
1. **MongoDB Connection**: Check MongoDB service and connection string
2. **CORS Errors**: Verify frontend URL in backend CORS configuration
3. **Authentication**: Ensure JWT secrets match between sessions
4. **Build Errors**: Check TypeScript configuration and imports