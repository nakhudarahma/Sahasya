import { Router } from 'express';
import * as aiController from './ai.controller';
import { asyncHandler } from '../../common/utils/async-handler';
import { requireAuth } from '../../common/middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/timeline', asyncHandler(aiController.buildTimeline));
router.post('/recommendations', asyncHandler(aiController.getRecommendations));

export default router;
