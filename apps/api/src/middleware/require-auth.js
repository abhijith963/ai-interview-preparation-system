import { User } from '../modules/users/user.model.js';
import { AppError } from '../lib/app-error.js';

export const requireAuth = async (request, _response, next) => {
  const userId = request.session?.userId;

  if (!userId) {
    return next(new AppError(401, 'AUTH_REQUIRED', 'Please sign in to continue.'));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError(401, 'AUTH_REQUIRED', 'Please sign in to continue.'));
  }

  request.auth = { user };
  return next();
};
