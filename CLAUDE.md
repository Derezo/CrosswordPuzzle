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
- **3D Graphics**: React Three Fiber and Drei for 3D visualizations
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Location**: `./frontend/`

## Development Commands

### Backend Development
```bash
cd backend
npm install                   # Install dependencies (supports both npm and pnpm)
npm run dev                   # Start development server with nodemon
npm run build                 # Build TypeScript to JavaScript (outputs to dist/)
npm start                     # Run production build
npx tsc --noEmit              # Type check without building
```

### Frontend Development
```bash
cd frontend
npm install                   # Install dependencies (supports both npm and pnpm)
npm run dev                   # Start Next.js development server with Turbopack
npm run build                 # Build for production with Turbopack
npm start                     # Run production build
npm run lint                  # Run ESLint with Next.js config (flat config)
npx tsc --noEmit              # Type check without building
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
./scripts/db-migrate.sh create [name]  # Create new migration (RECOMMENDED)
./scripts/db-migrate.sh deploy         # Deploy pending migrations
./scripts/db-migrate.sh status         # Show migration status
npx prisma studio            # Open Prisma Studio GUI
npx prisma db seed           # Run seed script (if configured)

# Legacy command (avoid in production):
npx prisma db push           # Push schema changes directly (bypasses migrations)
```

### Puzzle Generation
```bash
cd backend
./regenerate-puzzle.sh                    # Generate today's puzzle
./regenerate-puzzle.sh 2024-09-09         # Generate puzzle for specific date
./regenerate-puzzle.sh 2024-09-09 --force # Force regenerate even if exists
./regenerate-puzzle.sh --help             # Show help and usage
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
AUTO_SOLVE_COOLDOWN_HOURS=12
```

Note: The .env.example file shows MONGODB_URI, but the actual Prisma schema uses SQLite. Ensure DATABASE_URL points to SQLite when using the current schema.

### Root Level Scripts
```bash
# Development setup and utility scripts (run from project root)
./scripts/dev-setup.sh          # Set up complete development environment with Docker
./scripts/dev.sh                # Start full development environment with Docker Compose
./scripts/dev-backend.sh        # Start only backend development server
./scripts/dev-frontend.sh       # Start only frontend development server
./scripts/db-utils.sh           # Database utility commands (reset, studio, migrate, backup)
./scripts/test.sh               # Run all tests and type checking
./scripts/production-deploy.sh  # Production deployment script
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Architecture Overview

### Backend Architecture
- **Models**: User, DailyPuzzle, UserProgress, Achievement, UserAchievement, Suggestion (Prisma schema)
- **Routes**: `/api/auth`, `/api/puzzle`, `/api/leaderboard`, `/api/achievement`, `/api/suggestion`, `/api/categories`
- **Services**: 
  - `puzzle/` - Multiple crossword generation algorithms:
    - `strictCrosswordGenerator.ts` - Primary generator used by cron and scripts
    - `hybridGenerator.ts`, `improvedCrosswordGenerator.ts`, `constraintCrosswordGenerator.ts` - Alternative algorithms
    - `cronService.ts` - Daily puzzle scheduling with node-cron
    - `gridValidator.ts` - Grid validation utilities  
  - `achievement/achievementService.ts` - Achievement logic and point calculation
  - `auth/passport.ts` - Passport.js authentication configuration
  - CSV-based category management for crossword word organization
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

#### Categories System
- CSV-based crossword word categorization and management
- Dynamic category loading with caching (5-minute cache duration)
- Category statistics and popularity tracking
- Word filtering and pagination by category
- User favorite category functionality (mocked for now)

## Testing

**Note**: No testing framework is currently configured in this project. The npm test commands will fail with "Error: no test specified".

### Adding Tests (Future)
To add testing support:
- **Backend**: Consider Jest, Vitest, or Mocha for unit/integration tests
- **Frontend**: Next.js has built-in support for Jest and Testing Library
- **Database**: Consider using in-memory SQLite for test isolation
- **Use `./scripts/test.sh`**: Runs type checking for both frontend and backend, ESLint, and puzzle generation tests

## Production Deployment

### Unified Deployment Script

The project includes a comprehensive single-script deployment solution:

```bash
# Complete deployment (build + upload + server setup)
./deploy-production.sh full

# Other deployment modes
./deploy-production.sh build-only      # Build and package locally only
./deploy-production.sh upload-only     # Upload existing package to server
./deploy-production.sh server-only     # Setup server infrastructure only
./deploy-production.sh help            # Show all options
```

### Environment Configuration

Configure deployment with environment variables:

```bash
# Example: Deploy to custom domain
DEPLOY_DOMAIN=mysite.com ./deploy-production.sh full

# Example: Use custom SSH key
SSH_KEY=~/.ssh/mykey ./deploy-production.sh full

# All available options:
DEPLOY_DOMAIN=crossword.mittonvillage.com  # Target domain
DEPLOY_USER=deploy                         # SSH user
DEPLOY_PATH=/var/www/crossword            # Server path
BACKEND_PORT=5001                         # Backend port
FRONTEND_PORT=3001                        # Frontend port
SSH_KEY=~/.ssh/id_rsa                     # SSH key path
ADMIN_EMAIL=admin@domain.com              # Admin email for SSL
```

### What the Unified Script Does

**Enhanced Reliability Features:**
- **Comprehensive Error Handling**: Automatic cleanup, rollback commands, and detailed logging
- **Dependency Management**: Proper order of operations with wait conditions and timeouts
- **Package Integrity**: Verification of build outputs and deployment packages
- **SSH Retry Logic**: Robust network error handling with automatic retries
- **Deployment Tracking**: Unique deployment IDs and comprehensive log files

**Step-by-Step Process:**
1. **Validates Prerequisites**: 
   - Git status, required tools, SSH connectivity
   - Port and domain validation
   - Build output verification
2. **Builds Application**: 
   - Builds frontend with correct production API URL
   - Builds backend TypeScript to JavaScript
   - Creates and verifies deployment package integrity
   - Generates production-ready configurations
3. **Uploads Package**: 
   - Securely transfers package to server via SSH
   - Verifies upload integrity and extraction
   - Creates automatic backups of existing installations
4. **Sets Up Server**: 
   - Installs system dependencies (nginx, certbot, nodejs, pm2)
   - Creates deploy user and sets permissions
   - Configures firewall with proper port access
5. **Configures Application**:
   - Installs app dependencies with verification
   - Sets up database with Prisma migration
   - Configures PM2 with clustering and monitoring
   - Sets up structured logging and log rotation
6. **Configures Nginx & SSL**:
   - Sets up nginx reverse proxy with rate limiting
   - Obtains SSL certificate from Let's Encrypt (with proper dependency ordering)
   - Configures security headers and performance optimizations
7. **Runs Health Checks**: 
   - Tests PM2 service status
   - Validates backend API and frontend availability
   - Verifies SSL certificate installation
8. **Provides Summary**: 
   - Shows deployment info, rollback commands, and next steps
   - Generates comprehensive deployment logs

### Manual Deployment (Legacy)

For manual deployment, individual scripts are available in `deploy/scripts/`:
- `server-setup.sh` - Server infrastructure setup
- `app-setup.sh` - Application setup  
- `ssl-setup.sh` - SSL certificate setup
- `env-setup.sh` - Environment variable setup

### Deployment Requirements

- **Local**: Node.js, npm, git, ssh, scp
- **Server**: Ubuntu/Debian-based Linux distribution
- **Network**: SSH access to target server
- **DNS**: Domain pointing to server IP address
- **Ports**: 80, 443, SSH access

## Development Guidelines

### TypeScript Configuration
- **Backend**: Uses non-strict mode (`strict: false`) for flexibility during development
- **Frontend**: Uses strict mode (`strict: true`) following Next.js best practices
- Both projects support ES2020+ features and have source maps enabled

### Code Quality
- Use meaningful commit messages
- Implement proper error handling
- Validate all user inputs  
- Use environment variables for sensitive data
- Follow RESTful API conventions
- Maintain responsive design principles

### Build Process
- Backend compiles TypeScript to `dist/` directory with declaration files
- Frontend uses Turbopack for faster development and production builds
- Run type checking with `npx tsc --noEmit` in either project directory

## Database Schema

### Tables (Prisma Models)
- `users` - User accounts and points
- `daily_puzzles` - Generated crossword data with JSON grid/clues
- `user_progress` - Individual solving progress with JSON answers
- `achievements` - Available achievements with condition data
- `user_achievements` - Earned achievements with metadata
- `suggestions` - User suggestions for puzzle improvements

### Key Relationships
- User → UserProgress (one-to-many)
- User → UserAchievement (one-to-many)
- User → Suggestion (one-to-many)
- DailyPuzzle → UserProgress (one-to-many via puzzleDate)
- DailyPuzzle → Suggestion (one-to-many)
- Achievement → UserAchievement (one-to-many)

### Important Fields
- All models use `cuid()` for primary keys
- JSON stored as strings: gridData, cluesData, answersData, conditionData, metadataData
- Unique constraints: email, puzzleDate, userId+puzzleDate, userId+achievementId
- Suggestion model includes status field for tracking suggestion lifecycle (pending, reviewed, implemented, rejected)

## Troubleshooting

### Common Issues
1. **Database Connection**: Check SQLite file permissions and DATABASE_URL
2. **CORS Errors**: Verify frontend URL in backend CORS configuration  
3. **Authentication**: Ensure JWT secrets match between sessions
4. **Build Errors**: Check TypeScript configuration and imports
5. **Prisma Issues**: Run `npx prisma generate` after schema changes
6. **Turbopack Issues**: Fall back to regular Next.js dev server if needed
7. **Type Errors**: Backend uses non-strict TypeScript; frontend requires strict typing
8. **Path Issues**: Ensure you're in the correct directory (backend/ or frontend/) when running commands
9. **Puzzle Generation**: Use `./regenerate-puzzle.sh` script in backend directory for manual puzzle creation

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
│   │   ├── achievement.ts          # Achievement management
│   │   ├── suggestion.ts           # User suggestion management
│   │   └── categories.ts           # Category management and CSV processing
│   ├── services/
│   │   ├── puzzle/                 # Puzzle generation services
│   │   │   ├── strictCrosswordGenerator.ts  # Primary puzzle generator (used by cron)
│   │   │   ├── hybridGenerator.ts           # Alternative hybrid algorithm
│   │   │   ├── improvedCrosswordGenerator.ts    # Enhanced constraint-based generator  
│   │   │   ├── constraintCrosswordGenerator.ts  # Advanced constraint solver
│   │   │   ├── cronService.ts               # Daily puzzle scheduler
│   │   │   └── gridValidator.ts             # Grid validation utilities
│   │   ├── achievement/            # Achievement system
│   │   └── auth/                   # Authentication services
│   ├── middleware/auth.ts          # JWT authentication middleware
│   ├── utils/jwt.ts               # JWT utilities
│   └── data/                      # Static data files
│       └── crossword_dictionary_with_clues.csv  # Category word definitions
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
- Always descriptive variable names

## Docker Development (Optional)

The project includes Docker setup for a complete development environment:

### Docker Commands
```bash
# Start full development environment with Docker Compose
./scripts/dev.sh                      # Uses docker-compose.yml with development profile

# Alternative Docker development (if docker-compose.yml exists)
docker-compose up --build backend frontend redis   # Start all services
docker-compose down                   # Stop all services
docker-compose logs -f [service]      # View logs for specific service
```

### Environment Files for Docker
- `.env.development` - Docker environment configuration (if using Docker setup)
- Backend and frontend `.env` files still required as documented above
- Always remember your current working directory
- Always consider temporal dead zones when structuring your code.