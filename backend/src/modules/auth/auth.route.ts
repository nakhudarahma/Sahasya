import { Router } from 'express';
import * as authController from './auth.controller';
import { asyncHandler } from '../../common/utils/async-handler';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { standardLimiter } from '../../common/middlewares/rate-limiter.middleware';

const router = Router();

router.use(standardLimiter);

// Public routes
router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));

// Protected routes
router.get('/profile', requireAuth, asyncHandler(authController.getProfile));
router.patch('/profile', requireAuth, asyncHandler(authController.updateProfile));
router.get('/contacts', requireAuth, asyncHandler(authController.getContacts));
router.post('/contacts', requireAuth, asyncHandler(authController.updateContacts));
router.post('/verify-password', requireAuth, asyncHandler(authController.verifyPassword));

export default router;
