import { Request, Response } from 'express';
import { EvidenceService } from './evidence.service';
import { ApiResponse } from '../../common/utils/api-response';

const evidenceService = new EvidenceService();

// ── Incident CRUD ──────────────────────────────────────────────────────────

export const createIncident = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await evidenceService.createIncident(userId, req.body);
  res.status(201).json(ApiResponse.success(result, 'Incident saved to vault'));
};

export const listIncidents = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await evidenceService.listUserIncidents(userId);
  res.status(200).json(ApiResponse.success(result, 'Incidents fetched'));
};

export const getIncidentById = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { id } = req.params;
  const result = await evidenceService.getIncidentById(userId, id);
  res.status(200).json(ApiResponse.success(result, 'Incident fetched'));
};

export const deleteIncident = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { id } = req.params;
  await evidenceService.deleteIncident(userId, id);
  res.status(200).json(ApiResponse.success(null, 'Incident deleted'));
};

export const updateTimeline = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { id } = req.params;
  const { timeline, durationSeconds } = req.body;
  const result = await evidenceService.updateTimeline(userId, id, timeline || [], durationSeconds);
  res.status(200).json(ApiResponse.success(result, 'Timeline updated'));
};

// ── Evidence Upload ─────────────────────────────────────────────────────────

export const uploadMedia = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!req.file) {
     return res.status(400).json(ApiResponse.error('No file uploaded'));
  }
  const result = await evidenceService.uploadSafeEvidence(userId, req.body, req.file);
  res.status(201).json(ApiResponse.success(result, 'Evidence uploaded securely to Supabase'));
};

export const listEvidence = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { incidentId } = req.params;
  const result = await evidenceService.getIncidentEvidence(userId, incidentId);
  res.status(200).json(ApiResponse.success(result, 'Evidence fetched successfully'));
};
