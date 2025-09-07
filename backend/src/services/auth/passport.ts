import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';

// Local Strategy
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email: string, password: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      
      if (!user || !user.password) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Google Strategy - only initialize if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

      if (user) {
        return done(null, user);
      }

      // Check if user exists with same email
      const existingEmailUser = await prisma.user.findUnique({ 
        where: { email: profile.emails?.[0]?.value }
      });

      if (existingEmailUser) {
        // Link Google account to existing user
        const updatedUser = await prisma.user.update({
          where: { id: existingEmailUser.id },
          data: { googleId: profile.id }
        });
        return done(null, updatedUser);
      }

      // Create new user
      user = await prisma.user.create({
        data: {
          googleId: profile.id,
          email: profile.emails?.[0]?.value || '',
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
        }
      });

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
  ));
} else {
  console.log('⚠️  Google OAuth not configured - Google login will be unavailable');
}

// Serialize user
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;