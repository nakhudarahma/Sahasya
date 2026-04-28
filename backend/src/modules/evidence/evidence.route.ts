import { Router } from 'express';
import multer from 'multer';
import * as evidenceController from './evidence.controller';
import { asyncHandler } from '../../common/utils/async-handler';
import { requireAuth } from '../../common/middlewares/auth.middleware';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for SOS videos
});
const router = Router();

router.use(requireAuth);

// Incident CRUD (Evidence Vault)
router.post('/', asyncHandler(evidenceController.createIncident));
router.get('/', asyncHandler(evidenceController.listIncidents));
router.get('/:id', asyncHandler(evidenceController.getIncidentById));
router.delete('/:id', asyncHandler(evidenceController.deleteIncident));
router.post('/:id/timeline', asyncHandler(evidenceController.updateTimeline));

// Media upload and retrieval
router.post('/upload', upload.single('file'), asyncHandler(evidenceController.uploadMedia));
router.get('/media/:incidentId', asyncHandler(evidenceController.listEvidence));

export default router;
