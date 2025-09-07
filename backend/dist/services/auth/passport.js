"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_local_1 = require("passport-local");
const passport_google_oauth20_1 = require("passport-google-oauth20");
const prisma_1 = require("../../lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Local Strategy
passport_1.default.use(new passport_local_1.Strategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        return done(null, user);
    }
    catch (error) {
        return done(error);
    }
}));
// Google Strategy - only initialize if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this Google ID
            let user = await prisma_1.prisma.user.findUnique({ where: { googleId: profile.id } });
            if (user) {
                return done(null, user);
            }
            // Check if user exists with same email
            const existingEmailUser = await prisma_1.prisma.user.findUnique({
                where: { email: profile.emails?.[0]?.value }
            });
            if (existingEmailUser) {
                // Link Google account to existing user
                const updatedUser = await prisma_1.prisma.user.update({
                    where: { id: existingEmailUser.id },
                    data: { googleId: profile.id }
                });
                return done(null, updatedUser);
            }
            // Create new user
            user = await prisma_1.prisma.user.create({
                data: {
                    googleId: profile.id,
                    email: profile.emails?.[0]?.value || '',
                    firstName: profile.name?.givenName || '',
                    lastName: profile.name?.familyName || '',
                }
            });
            return done(null, user);
        }
        catch (error) {
            return done(error);
        }
    }));
}
else {
    console.log('⚠️  Google OAuth not configured - Google login will be unavailable');
}
// Serialize user
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
// Deserialize user
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { id } });
        done(null, user);
    }
    catch (error) {
        done(error);
    }
});
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map