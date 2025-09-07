"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_session_1 = __importDefault(require("express-session"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const passport_1 = __importDefault(require("./services/auth/passport"));
const routes_1 = __importDefault(require("./routes"));
const cronService_1 = __importDefault(require("./services/puzzle/cronService"));
const achievementService_1 = __importDefault(require("./services/achievement/achievementService"));
const prisma_1 = require("./lib/prisma");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? 'https://your-frontend-domain.com'
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Session configuration
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
// Passport middleware
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// API Routes
app.use('/api', routes_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Galactic Crossword API is running' });
});
// Database connection
const connectDB = async () => {
    try {
        await prisma_1.prisma.$connect();
        console.log('✅ SQLite database connected successfully');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection error:', error);
        console.log('⚠️  Continuing without database - some features will not work');
        return false;
    }
};
// Start server
const startServer = async () => {
    const dbConnected = await connectDB();
    // Initialize achievements only if database is connected
    if (dbConnected) {
        try {
            await achievementService_1.default.initializeAchievements();
            // Start puzzle cron service
            cronService_1.default.start();
        }
        catch (error) {
            console.error('❌ Error initializing services:', error);
        }
    }
    app.listen(PORT, () => {
        console.log(`🚀 Galactic Crossword API server running on port ${PORT}`);
        console.log(`🌌 Environment: ${process.env.NODE_ENV || 'development'}`);
        if (dbConnected) {
            console.log(`📊 Database: Connected`);
            console.log(`🏆 Achievements: Initialized`);
            console.log(`📅 Puzzle cron: Running`);
        }
        else {
            console.log(`📊 Database: Disconnected (features limited)`);
        }
    });
};
startServer().catch(console.error);
exports.default = app;
//# sourceMappingURL=server.js.map