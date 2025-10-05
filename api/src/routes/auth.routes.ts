import express from 'express';
import { Request, Response } from 'express';
import { AuthService } from '@/services/auth.service';
import { ApiResponse, AuthResponse } from '@/types';
import { schemas } from '@/utils/validation';
import { authenticate } from '@/middleware/auth';

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