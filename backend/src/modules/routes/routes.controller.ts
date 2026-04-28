import { Request, Response } from 'express';
import { RoutesService } from './routes.service';
import { ApiResponse } from '../../common/utils/api-response';

const routesService = new RoutesService();

export const findSafeRoute = async (req: Request, res: Response) => {
  const result = await routesService.getSafeRoute(req.body);
  res.status(200).json(ApiResponse.success(result, 'Safe route generated'));
};

export const getHelpCenters = async (req: Request, res: Response) => {
  const lat = Number(req.query.lat) || 0;
  const lng = Number(req.query.lng) || 0;
  const result = await routesService.getNearbyHelpCenters(lat, lng);
  res.status(200).json(ApiResponse.success(result, 'Nearby help centers retrieved'));
};
