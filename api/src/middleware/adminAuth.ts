import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types';
import jwt from 'jsonwebtoken';
import prisma from '../database/client';

export const authenticateAdmin = async (
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
      const decoded = jwt.verify(token, process.env['JWT_SECRET']!) as any;
      
      // Check if token is for admin
      if (decoded.type !== 'admin') {
        const response: ApiResponse = {
          success: false,
          message: 'Admin access required',
          error: 'Token is not for admin user'
        };
        res.status(403).json(response);
        return;
      }
      
      // Get admin user details
      const adminUser = await prisma.adminUser.findUnique({
        where: { id: decoded.userId }
      });
      
      if (!adminUser || !adminUser.isActive) {
        const response: ApiResponse = {
          success: false,
          message: 'Admin user not found or inactive',
          error: 'Admin user associated with token not found or inactive'
        };
        res.status(401).json(response);
        return;
      }
      
      // Attach admin user to request
      req.user = {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name || 'Admin User',
        role: adminUser.role,
        isActive: adminUser.isActive
      } as any;
      (req as any).admin = adminUser;
      
      next();
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      const response: ApiResponse = {
        success: false,
        message: 'Invalid token',
        error: 'Authentication token is invalid or expired'
      };
      res.status(401).json(response);
    }
    
  } catch (error) {
    console.error('Admin authentication error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Authentication failed',
      error: 'Unable to verify admin authentication token'
    };
    res.status(401).json(response);
  }
};