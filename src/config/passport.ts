import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { env } from './env.js';
import { prisma } from './database.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const googleId = profile.id;

        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { googleId },
        });

        if (!user) {
          // Check if user exists with same email but different googleId
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUser) {
            // Update existing user with googleId
            user = await prisma.user.update({
              where: { email },
              data: { googleId },
            });
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                email,
                name,
                googleId,
              },
            });
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

// Serialize user for session (we're using JWT, so minimal serialization)
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user as Express.User);
});

export default passport;
