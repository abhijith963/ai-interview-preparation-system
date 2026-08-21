import session from 'express-session';

export const AUTH_SESSION_COLLECTION_NAME = 'authSessions';

export const createSessionMiddleware = ({
  name,
  secret,
  secureCookies,
  store,
  ttlHours,
}) =>
  session({
    cookie: {
      httpOnly: true,
      maxAge: ttlHours * 60 * 60 * 1_000,
      sameSite: 'lax',
      secure: secureCookies,
    },
    name,
    resave: false,
    rolling: true,
    saveUninitialized: false,
    secret,
    store,
  });
