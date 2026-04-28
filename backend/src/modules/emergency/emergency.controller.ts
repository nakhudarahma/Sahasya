import { Request, Response } from 'express';
import { EmergencyService } from './emergency.service';
import { ApiResponse } from '../../common/utils/api-response';

const emergencyService = new EmergencyService();

export const triggerPanic = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await emergencyService.triggerPanic(userId, req.body);
  res.status(201).json(ApiResponse.success(result, 'Panic alert triggered successfully'));
};

export const startTracking = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await emergencyService.startLiveTracking(userId, req.body);
  res.status(201).json(ApiResponse.success(result, 'Live tracking started'));
};

export const stopTracking = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { id } = req.params;
  await emergencyService.stopTracking(userId, id);
  res.status(200).json(ApiResponse.success(null, 'Tracking stopped'));
};

export const updateLocation = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { lat, lng } = req.body;
  await emergencyService.updateLocation(userId, lat, lng);
  res.status(200).json(ApiResponse.success(null, 'Location updated'));
};

export const fakeCall = async (req: Request, res: Response) => {
  const result = await emergencyService.triggerFakeCall();
  res.status(200).json(ApiResponse.success(result, 'Fake call initiated'));
};
