import { Router } from 'express';
import * as routesController from './routes.controller';
import { asyncHandler } from '../../common/utils/async-handler';
import { requireAuth } from '../../common/middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/safe-route', asyncHandler(routesController.findSafeRoute));
router.get('/help-centers', asyncHandler(routesController.getHelpCenters));

export default router;
