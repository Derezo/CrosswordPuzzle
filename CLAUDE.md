# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Galactic Crossword is a full-stack web application that allows users to solve daily crossword puzzles with a cosmic theme. The app features user authentication, achievements, leaderboards, and mobile-first responsive design.

## Technology Stack

### Backend (Node.js/Express)
- **Framework**: Express.js with TypeScript
- **Database**: SQLite with Prisma ORM
- **Authentication**: Passport.js (Local + Google OAuth)
- **Security**: JWT tokens, bcryptjs, helmet, CORS, rate limiting
- **Task Scheduling**: node-cron for daily puzzle generation
- **Location**: `./backend/`

### Frontend (Next.js/React)
- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components with framer-motion and Heroicons
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
npm run dev                   # Start Next.js development server with Turbopack
npm run build                 # Build for production with Turbopack
npm start                     # Run production build
npm run lint                  # Run ESLint (configured but minimal rules)
```

### Database Setup
1. Copy `backend/.env.example` to `backend/.env` 
2. Update `DATABASE_URL` in `.env` file (uses SQLite by default)
3. Run Prisma commands:
   ```bash
   cd backend
   npx prisma generate      # Generate Prisma client
   npx prisma db push       # Push schema to database
   npx prisma db seed       # Seed achievements (if configured)
   ```
4. The application uses SQLite database stored at `backend/prisma/dev.db`

### Prisma Commands
```bash
cd backend
npx prisma generate          # Generate client after schema changes
npx prisma db push           # Push schema changes to database  
npx prisma studio            # Open Prisma Studio GUI
npx prisma migrate dev       # Create and apply migration (if using migrations)
npx prisma db seed           # Run seed script (if configured)
```

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./prisma/dev.db"
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
- **Models**: User, DailyPuzzle, UserProgress, Achievement, UserAchievement (Prisma schema)
- **Routes**: `/api/auth`, `/api/puzzle`, `/api/leaderboard`, `/api/achievement`
- **Services**: 
  - `puzzle/hybridGenerator.ts` - Main crossword generation system
  - `puzzle/fastGenerator.ts`, `standardGenerator.ts`, `properGenerator.ts` - Specialized generators
  - `puzzle/cronService.ts` - Daily puzzle scheduling
  - `achievement/achievementService.ts` - Achievement logic
- **Middleware**: Authentication, rate limiting, error handling
- **Database**: Prisma client configuration in `lib/prisma.ts`

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

### Tables (Prisma Models)
- `users` - User accounts and points
- `daily_puzzles` - Generated crossword data with JSON grid/clues
- `user_progress` - Individual solving progress with JSON answers
- `achievements` - Available achievements with condition data
- `user_achievements` - Earned achievements with metadata

### Key Relationships
- User → UserProgress (one-to-many)
- User → UserAchievement (one-to-many)
- DailyPuzzle → UserProgress (one-to-many via puzzleDate)
- Achievement → UserAchievement (one-to-many)

### Important Fields
- All models use `cuid()` for primary keys
- JSON stored as strings: gridData, cluesData, answersData, conditionData
- Unique constraints: email, puzzleDate, userId+puzzleDate, userId+achievementId

## Troubleshooting

### Common Issues
1. **Database Connection**: Check SQLite file permissions and DATABASE_URL
2. **CORS Errors**: Verify frontend URL in backend CORS configuration
3. **Authentication**: Ensure JWT secrets match between sessions
4. **Build Errors**: Check TypeScript configuration and imports
5. **Prisma Issues**: Run `npx prisma generate` after schema changes
6. **Turbopack Issues**: Fall back to regular Next.js dev server if needed

## Key File Locations

### Backend Structure
```
backend/
├── src/
│   ├── server.ts                    # Main Express server
│   ├── lib/prisma.ts               # Prisma client configuration
│   ├── routes/                     # API route handlers
│   │   ├── auth.ts                 # Authentication endpoints
│   │   ├── puzzle.ts               # Puzzle CRUD operations
│   │   ├── leaderboard.ts          # Leaderboard data
│   │   └── achievement.ts          # Achievement management
│   ├── services/
│   │   ├── puzzle/                 # Puzzle generation services
│   │   │   ├── hybridGenerator.ts  # Main puzzle generator
│   │   │   ├── cronService.ts      # Daily puzzle scheduler
│   │   │   └── [other generators]  # Specialized generators
│   │   └── achievement/            # Achievement system
│   ├── middleware/auth.ts          # JWT authentication middleware
│   └── utils/jwt.ts               # JWT utilities
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── dev.db                     # SQLite database file
└── .env                           # Environment variables
```

### Frontend Structure  
```
frontend/
├── src/
│   ├── app/                       # Next.js App Router pages
│   │   ├── layout.tsx             # Root layout with AuthProvider
│   │   ├── page.tsx               # Home page
│   │   ├── puzzle/page.tsx        # Main puzzle interface
│   │   ├── login/page.tsx         # Login form
│   │   ├── register/page.tsx      # Registration form
│   │   ├── leaderboard/page.tsx   # Leaderboard display
│   │   └── achievements/page.tsx  # Achievement gallery
│   ├── components/
│   │   ├── CrosswordGrid.tsx      # Interactive crossword grid
│   │   ├── CrosswordClues.tsx     # Clue display component
│   │   └── Navigation.tsx         # Main navigation
│   ├── contexts/AuthContext.tsx   # User authentication state
│   ├── lib/api.ts                # API client configuration
│   └── types/index.ts            # TypeScript type definitions
└── .env.local                     # Frontend environment variables
```