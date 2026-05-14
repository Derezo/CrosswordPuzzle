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

      // Google's profile.emails entries each carry a `verified` flag — a Google
      // account whose primary email is unverified must never auto-link to a
      // local account by that email alone (account-takeover vector).
      const primaryEmail = profile.emails?.[0];
      const verifiedEmail =
        primaryEmail?.verified === true || (primaryEmail as { verified?: string } | undefined)?.verified === 'true'
          ? primaryEmail?.value
          : undefined;

      if (verifiedEmail) {
        const existingEmailUser = await prisma.user.findUnique({
          where: { email: verifiedEmail },
        });

        if (existingEmailUser) {
          // Refuse to link if the local account is already paired with a
          // different Google identity — first-linker wins, and re-linking
          // must go through an authenticated profile-update flow, not
          // through a fresh OAuth round-trip.
          if (existingEmailUser.googleId && existingEmailUser.googleId !== profile.id) {
            return done(null, false, {
              message: 'This email is already linked to a different Google account.',
            });
          }

          const updatedUser = await prisma.user.update({
            where: { id: existingEmailUser.id },
            data: { googleId: profile.id },
          });
          return done(null, updatedUser);
        }
      }

      // No safe link target — create a new user. Refuse if Google didn't
      // give us a verified email (we'd be creating an account we can never
      // route a password-reset to).
      if (!verifiedEmail) {
        return done(null, false, {
          message: 'Google did not return a verified primary email for this account.',
        });
      }

      user = await prisma.user.create({
        data: {
          googleId: profile.id,
          email: verifiedEmail,
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