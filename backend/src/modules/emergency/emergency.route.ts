import { Router } from 'express';
import * as emergencyController from './emergency.controller';
import { asyncHandler } from '../../common/utils/async-handler';
import { requireAuth } from '../../common/middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/panic', asyncHandler(emergencyController.triggerPanic));
router.post('/tracking/start', asyncHandler(emergencyController.startTracking));
router.post('/tracking/:id/stop', asyncHandler(emergencyController.stopTracking));
router.post('/location', asyncHandler(emergencyController.updateLocation));
router.post('/fake-call', asyncHandler(emergencyController.fakeCall));

export default router;
