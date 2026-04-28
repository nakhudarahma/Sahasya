import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../common/utils/api-response';

const authService = new AuthService();

export const register = async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json(ApiResponse.success(result, 'User registered successfully'));
};

export const login = async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);
  res.status(200).json(ApiResponse.success(result, 'User logged in successfully'));
};

export const refresh = async (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json(ApiResponse.error('Refresh token required'));
  }
  const result = await authService.refreshToken(refresh_token);
  res.status(200).json(ApiResponse.success(result, 'Token refreshed'));
};

export const logout = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1] || '';
  await authService.logoutUser(token);
  res.status(200).json(ApiResponse.success(null, 'User logged out successfully'));
};

export const getProfile = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await authService.getProfile(userId);
  res.status(200).json(ApiResponse.success(result, 'Profile fetched'));
};

export const updateProfile = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await authService.updateProfile(userId, req.body);
  res.status(200).json(ApiResponse.success(result, 'Profile updated'));
};

export const getContacts = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await authService.getContacts(userId);
  res.status(200).json(ApiResponse.success(result, 'Contacts fetched'));
};

export const updateContacts = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await authService.updateContacts(userId, req.body.contacts || []);
  res.status(200).json(ApiResponse.success(result, 'Contacts updated'));
};

export const verifyPassword = async (req: Request, res: Response) => {
  const email = (req as any).user?.email;
  const { password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json(ApiResponse.error('Missing email or password'));
  }

  const isValid = await authService.verifyPassword(email, password);
  if (isValid) {
    res.status(200).json(ApiResponse.success({ isValid: true }, 'Password verified'));
  } else {
    res.status(401).json(ApiResponse.error('Invalid password'));
  }
};
