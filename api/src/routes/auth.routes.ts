import express from 'express';
import { Request, Response } from 'express';
import { AuthService } from '@/services/auth.service';
import { ApiResponse, AuthResponse } from '@/types';
import { schemas } from '@/utils/validation';
import { authenticate } from '@/middleware/auth';
import prisma from '../database/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = schemas.register.parse(req.body);
    
    // Register user
    const result = await AuthService.register({
      email: validatedData.email,
      password: validatedData.password,
      name: validatedData.name,
      phone: validatedData.phone
    });
    
    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: 'User registered successfully',
      data: result
    };
    
    res.status(201).json(response);
  } catch (error: any) {
    console.error('Registration error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Registration failed',
      error: error.message || 'An error occurred during registration'
    };
    
    res.status(400).json(response);
  }
});

/**
 * POST /auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = schemas.login.parse(req.body);
    
    // Login user
    const result = await AuthService.login(validatedData);
    
    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: 'Login successful',
      data: result
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Login error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Login failed',
      error: error.message || 'Invalid credentials'
    };
    
    res.status(401).json(response);
  }
});

/**
 * POST /auth/admin/login
 * Admin login
 */
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      const response: ApiResponse = {
        success: false,
        message: 'Email and password are required',
        error: 'Missing credentials'
      };
      res.status(400).json(response);
      return;
    }
    
    // Find admin user
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!adminUser || !adminUser.isActive) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid credentials',
        error: 'Admin user not found or inactive'
      };
      res.status(401).json(response);
      return;
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, adminUser.password);
    
    if (!isValidPassword) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid credentials',
        error: 'Invalid password'
      };
      res.status(401).json(response);
      return;
    }
    
    // Generate JWT token
    const accessToken = jwt.sign(
      { 
        userId: adminUser.id, 
        email: adminUser.email, 
        role: adminUser.role,
        type: 'admin'
      },
      process.env['JWT_SECRET']!,
      { expiresIn: '24h' }
    );
    
    // Update last login
    await prisma.adminUser.update({
      where: { id: adminUser.id },
      data: { lastLoginAt: new Date() }
    });
    
    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: 'Admin login successful',
      data: {
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          isActive: adminUser.isActive
        } as any,
        tokens: {
          accessToken,
          refreshToken: accessToken // For simplicity, using same token
        }
      }
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Admin login error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Admin login failed',
      error: error.message || 'An error occurred during admin login'
    };
    
    res.status(500).json(response);
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      const response: ApiResponse = {
        success: false,
        message: 'Refresh token required',
        error: 'No refresh token provided'
      };
      res.status(400).json(response);
      return;
    }
    
    // Refresh tokens
    const tokens = await AuthService.refreshToken(refreshToken);
    
    const response: ApiResponse = {
      success: true,
      message: 'Tokens refreshed successfully',
      data: tokens
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Token refresh error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Token refresh failed',
      error: error.message || 'Invalid refresh token'
    };
    
    res.status(401).json(response);
  }
});

/**
 * POST /auth/logout
 * Logout user (revoke refresh token)
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }
    
    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully'
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Logout error:', error);
    
    const response: ApiResponse = {
      success: true, // Always return success for logout
      message: 'Logged out successfully'
    };
    
    res.status(200).json(response);
  }
});

/**
 * POST /auth/forgot-password
 * Initiate password reset
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = schemas.forgotPassword.parse(req.body);
    
    // Initiate password reset
    await AuthService.initiatePasswordReset(validatedData.email);
    
    const response: ApiResponse = {
      success: true,
      message: 'If an account with that email exists, we have sent a password reset email'
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Forgot password error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Password reset failed',
      error: error.message || 'An error occurred'
    };
    
    res.status(400).json(response);
  }
});

/**
 * POST /auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = schemas.resetPassword.parse(req.body);
    
    // Reset password
    await AuthService.resetPassword(validatedData.token, validatedData.password);
    
    const response: ApiResponse = {
      success: true,
      message: 'Password reset successfully'
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Password reset error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Password reset failed',
      error: error.message || 'Invalid or expired reset token'
    };
    
    res.status(400).json(response);
  }
});

/**
 * POST /auth/verify-email
 * Verify email using token
 */
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Verification token required',
        error: 'No verification token provided'
      };
      res.status(400).json(response);
      return;
    }
    
    // Verify email
    await AuthService.verifyEmail(token);
    
    const response: ApiResponse = {
      success: true,
      message: 'Email verified successfully'
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Email verification error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Email verification failed',
      error: error.message || 'Invalid verification token'
    };
    
    res.status(400).json(response);
  }
});

/**
 * GET /auth/admin/me
 * Get current admin user profile
 */
router.get('/admin/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse = {
        success: false,
        message: 'No token provided',
        error: 'Authorization header missing'
      };
      res.status(401).json(response);
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env['JWT_SECRET']!) as any;
    
    if (decoded.type !== 'admin') {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid token type',
        error: 'Not an admin token'
      };
      res.status(401).json(response);
      return;
    }

    // Get admin user from database
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: decoded.userId }
    });

    if (!adminUser || !adminUser.isActive) {
      const response: ApiResponse = {
        success: false,
        message: 'Admin user not found or inactive',
        error: 'Invalid admin user'
      };
      res.status(401).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Admin profile retrieved successfully',
      data: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        isActive: adminUser.isActive
      }
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Get admin profile error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to get admin profile',
      error: error.message || 'Invalid token'
    };
    
    res.status(401).json(response);
  }
});

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const response: ApiResponse = {
      success: true,
      message: 'User profile retrieved successfully',
      data: req.user
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Get profile error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to get user profile',
      error: error.message || 'An error occurred'
    };
    
    res.status(500).json(response);
  }
});

/**
 * PUT /auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'User not authenticated',
        error: 'No user found in request'
      };
      res.status(401).json(response);
      return;
    }

    // TODO: Validate request body and implement actual user update logic
    // const validatedData = schemas.updateUser.parse(req.body);
    
    // For now, just return current user
    const updatedUser = await AuthService.getUserById(req.user.id);
    
    const response: ApiResponse = {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Profile update error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Profile update failed',
      error: error.message || 'An error occurred'
    };
    
    res.status(400).json(response);
  }
});

export default router;