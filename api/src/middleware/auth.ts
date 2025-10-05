import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types';
import { AuthService } from '@/services/auth.service';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required',
        error: 'No valid authorization token provided'
      };
      res.status(401).json(response);
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Verify JWT token
      const { userId } = AuthService.verifyAccessToken(token);
      
      // Get user details
      const user = await AuthService.getUserById(userId);
      if (!user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not found',
          error: 'User associated with token not found'
        };
        res.status(401).json(response);
        return;
      }
      
      // Attach user to request
      req.user = user;
      next();
    } catch (tokenError) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid token',
        error: 'Authentication token is invalid or expired'
      };
      res.status(401).json(response);
    }
    
  } catch (error) {
    console.error('Authentication error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Authentication failed',
      error: 'Unable to verify authentication token'
    };
    res.status(401).json(response);
  }
};