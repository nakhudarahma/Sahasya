import { Router } from 'express';
import * as reportingController from './reporting.controller';
import { asyncHandler } from '../../common/utils/async-handler';
import { requireAuth, optionalAuth } from '../../common/middlewares/auth.middleware';

const router = Router();

// Public — allow anonymous reports, but identify users if logged in
router.post('/submit', optionalAuth, asyncHandler(reportingController.createNewReport));

// Protected
router.use(requireAuth);
router.get('/my-reports', asyncHandler(reportingController.listUserReports));
router.delete('/:id', asyncHandler(reportingController.deleteReport));

export default router;
