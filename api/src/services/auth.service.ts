import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '@/config';
import prisma from '@/database/client';
import { AuthTokens, AuthUser, LoginCredentials, RegisterCredentials } from '@/types';

export class AuthService {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  static generateAccessToken(userId: string): string {
    const payload = { userId, type: 'access' };
    const secret = config.jwtSecret as string;
    const options: any = { expiresIn: config.jwtExpiresIn };
    return jwt.sign(payload, secret, options);
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(userId: string): string {
    const payload = { userId, type: 'refresh' };
    const secret = config.jwtRefreshSecret as string;
    const options: any = { expiresIn: config.jwtRefreshExpiresIn };
    return jwt.sign(payload, secret, options);
  }

  /**
   * Verify JWT access token
   */
  static verifyAccessToken(token: string): { userId: string } {
    const decoded = jwt.verify(token, config.jwtSecret as string) as any;
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return { userId: decoded.userId };
  }

  /**
   * Verify JWT refresh token
   */
  static verifyRefreshToken(token: string): { userId: string } {
    const decoded = jwt.verify(token, config.jwtRefreshSecret as string) as any;
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return { userId: decoded.userId };
  }

  /**
   * Generate email verification token
   */
  static generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Register new user
   */
  static async register(credentials: RegisterCredentials): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const { email, password, name, phone } = credentials;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Generate verification token
    const emailVerificationToken = this.generateEmailVerificationToken();

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        ...(phone && { phone }),
        emailVerificationToken,
        isVerified: false, // Require email verification
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        isVerified: true,
        lastLoginAt: true,
        preferences: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });

    // Convert dates to strings for API response
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      ...(user.name && { name: user.name }),
      ...(user.phone && { phone: user.phone }),
      isActive: user.isActive,
      isVerified: user.isVerified,
      ...(user.lastLoginAt && { lastLoginAt: user.lastLoginAt.toISOString() }),
      ...(user.preferences && typeof user.preferences === 'object' && { preferences: user.preferences as Record<string, any> }),
      timezone: user.timezone,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return {
      user: authUser,
      tokens: { accessToken, refreshToken }
    };
  }

  /**
   * Login user
   */
  static async login(credentials: LoginCredentials): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const { email, password } = credentials;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await this.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    // Revoke old refresh tokens and store new one
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true }
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });

    // Create AuthUser without password
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      ...(user.name && { name: user.name }),
      ...(user.phone && { phone: user.phone }),
      isActive: user.isActive,
      isVerified: user.isVerified,
      lastLoginAt: new Date().toISOString(),
      ...(user.preferences && typeof user.preferences === 'object' && { preferences: user.preferences as Record<string, any> }),
      timezone: user.timezone,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return {
      user: authUser,
      tokens: { accessToken, refreshToken }
    };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const { userId } = this.verifyRefreshToken(refreshToken);

      // Check if refresh token exists and is not revoked
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (!tokenRecord) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(userId);
      const newRefreshToken = this.generateRefreshToken(userId);

      // Revoke old refresh token and create new one
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true }
      });

      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user (revoke refresh token)
   */
  static async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true }
    });
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        isVerified: true,
        lastLoginAt: true,
        preferences: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      ...(user.name && { name: user.name }),
      ...(user.phone && { phone: user.phone }),
      isActive: user.isActive,
      isVerified: user.isVerified,
      ...(user.lastLoginAt && { lastLoginAt: user.lastLoginAt.toISOString() }),
      ...(user.preferences && typeof user.preferences === 'object' && { preferences: user.preferences as Record<string, any> }),
      timezone: user.timezone,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  /**
   * Initiate password reset
   */
  static async initiatePasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      // Don't reveal if email exists or not
      return;
    }

    const resetToken = this.generatePasswordResetToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    // TODO: Send email with reset token
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  /**
   * Reset password using token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    // Revoke all refresh tokens for security
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true }
    });
  }

  /**
   * Verify email using token
   */
  static async verifyEmail(token: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token }
    });

    if (!user) {
      throw new Error('Invalid verification token');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerificationToken: null
      }
    });
  }
}