import { Request, Response } from 'express';
import { ApiResponse } from '@/types';

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    message: 'Endpoint not found',
    error: `The endpoint ${req.method} ${req.path} does not exist`
  };
  
  res.status(404).json(response);
};