import { Request, Response } from 'express';
import { SafetyService } from './safety.service';
import { ApiResponse } from '../../common/utils/api-response';

const safetyService = new SafetyService();

export const reportHotspot = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await safetyService.reportUnsafeHotspot(userId, req.body);
  res.status(201).json(ApiResponse.success(result, 'Hotspot reported successfully'));
};

export const getHotspots = async (req: Request, res: Response) => {
  const filterType = req.query.type as string | undefined;
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
  const result = await safetyService.getNearbyHotspots(lat, lng, filterType);
  res.status(200).json(ApiResponse.success(result, 'Hotspots retrieved'));
};

export const getHelpCenters = async (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const result = await safetyService.getHelpCenters(category);
  res.status(200).json(ApiResponse.success(result, 'Help centers retrieved'));
};

export const getStats = async (req: Request, res: Response) => {
  const result = await safetyService.getSafetyStats();
  res.status(200).json(ApiResponse.success(result, 'Safety stats retrieved'));
};

export const upvoteHotspot = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { id } = req.params;
  await safetyService.upvoteHotspot(userId, id);
  res.status(200).json(ApiResponse.success(null, 'Hotspot upvoted'));
};
