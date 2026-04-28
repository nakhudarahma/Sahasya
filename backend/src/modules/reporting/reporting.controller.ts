import { Request, Response } from 'express';
import { ReportingService } from './reporting.service';
import { ApiResponse } from '../../common/utils/api-response';

const reportingService = new ReportingService();

export const createNewReport = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || null;
  const result = await reportingService.submitReport(userId, req.body);
  res.status(201).json(ApiResponse.success(result, 'Report submitted successfully'));
};

export const listUserReports = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await reportingService.getMyReports(userId);
  res.status(200).json(ApiResponse.success(result, 'Reports retrieved'));
};

export const deleteReport = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { id } = req.params;
  await reportingService.deleteReport(userId, id);
  res.status(200).json(ApiResponse.success(null, 'Report deleted'));
};
