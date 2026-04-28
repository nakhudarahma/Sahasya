import { Request, Response } from 'express';
import { AiService } from './ai.service';
import { ApiResponse } from '../../common/utils/api-response';

const aiService = new AiService();

export const buildTimeline = async (req: Request, res: Response) => {
  const result = await aiService.generateTimeline(req.body);
  res.status(200).json(ApiResponse.success(result, 'Timeline successfully generated'));
};

export const getRecommendations = async (req: Request, res: Response) => {
  const result = await aiService.getSafetyRecommendations(req.body);
  res.status(200).json(ApiResponse.success(result, 'Recommendations retrieved'));
};
