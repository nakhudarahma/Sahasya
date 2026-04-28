import { Router } from 'express';
import * as safetyController from './safety.controller';
import { asyncHandler } from '../../common/utils/async-handler';
import { requireAuth } from '../../common/middlewares/auth.middleware';

const router = Router();

// Public — anyone can view safety map and stats
router.get('/hotspots', asyncHandler(safetyController.getHotspots));
router.get('/help-centers', asyncHandler(safetyController.getHelpCenters));
router.get('/stats', asyncHandler(safetyController.getStats));

// Protected — must be logged in to report or upvote
router.use(requireAuth);
router.post('/hotspots', asyncHandler(safetyController.reportHotspot));
router.post('/hotspots/:id/upvote', asyncHandler(safetyController.upvoteHotspot));

export default router;
