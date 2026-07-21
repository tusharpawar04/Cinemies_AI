/**
 * Authentication Controller
 * Handles user registration, login, token refresh, and password reset
 */

const { User, UserProfile } = require('../models');
const { generateTokens } = require('../utils/jwt');
const { asyncHandler, ConflictError, UnauthorizedError, NotFoundError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }
  
  // Create user
  const user = await User.create({
    email,
    password, // Will be hashed by model hook
    firstName,
    lastName,
  });
  
  // Create user profile
  const profile = await UserProfile.create({
    userId: user.id,
  });
  
  // Assign A/B test cohort
  const rand = Math.random();
  const cohort = rand < 0.5 ? 'control' : rand < 0.75 ? 'variant_a' : 'variant_b';
  await profile.update({ abTestCohort: cohort });
  
  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);
  
  // Save refresh token to database
  await user.update({ refreshToken });
  
  logger.info('User registered', {
    userId: user.id,
    email: user.email,
    ip: req.ip,
  });
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    },
  });
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }
  
  // Check if account is locked
  if (user.isLocked()) {
    const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
    logger.warn('Login attempt on locked account', {
      email,
      ip: req.ip,
      lockTimeRemaining,
    });
    return res.status(423).json({
      success: false,
      error: 'Account is locked due to multiple failed login attempts',
      lockTimeRemaining: `${lockTimeRemaining} minutes`,
    });
  }
  
  // Check if account is active
  if (!user.isActive) {
    throw new UnauthorizedError('Account has been deactivated');
  }
  
  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    // Increment login attempts
    await user.incrementLoginAttempts();
    
    logger.warn('Failed login attempt', {
      email,
      ip: req.ip,
      attempts: user.loginAttempts + 1,
    });
    
    throw new UnauthorizedError('Invalid credentials');
  }
  
  // Reset login attempts on successful login
  await user.resetLoginAttempts();
  
  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);
  
  // Save refresh token to database
  await user.update({ refreshToken });
  
  logger.info('User logged in', {
    userId: user.id,
    email: user.email,
    ip: req.ip,
  });
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    },
  });
});

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token required');
  }
  
  // Verify refresh token
  const jwt = require('jsonwebtoken');
  const config = require('../config');
  
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
  
  // Find user and verify refresh token matches
  const user = await User.findByPk(decoded.id);
  if (!user || user.refreshToken !== refreshToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }
  
  // Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedError('Account has been deactivated');
  }
  
  // Generate new tokens
  const tokens = generateTokens(user.id);
  
  // Update refresh token in database
  await user.update({ refreshToken: tokens.refreshToken });
  
  logger.info('Token refreshed', {
    userId: user.id,
    ip: req.ip,
  });
  
  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: tokens,
  });
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
  // Clear refresh token from database
  await req.user.update({ refreshToken: null });
  
  logger.info('User logged out', {
    userId: req.user.id,
    ip: req.ip,
  });
  
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  // Find user
  const user = await User.findOne({ where: { email } });
  
  // Always return success (don't reveal if email exists)
  if (!user) {
    logger.info('Password reset requested for non-existent email', {
      email,
      ip: req.ip,
    });
    return res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    });
  }
  
  // Generate reset token (implement this based on your needs)
  // For now, just log the request
  logger.info('Password reset requested', {
    userId: user.id,
    email: user.email,
    ip: req.ip,
  });
  
  // TODO: Generate reset token, save to database, send email
  
  res.json({
    success: true,
    message: 'If the email exists, a password reset link has been sent',
  });
});

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  
  // TODO: Verify reset token and update password
  // For now, return not implemented
  
  logger.info('Password reset attempted', {
    token: token.substring(0, 10) + '...',
    ip: req.ip,
  });
  
  res.json({
    success: true,
    message: 'Password reset functionality coming soon',
  });
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
exports.getCurrentUser = asyncHandler(async (req, res) => {
  // User is already attached by auth middleware
  const user = await User.findByPk(req.user.id, {
    include: [{
      model: UserProfile,
      as: 'profile',
    }],
  });
  
  res.json({
    success: true,
    data: {
      user: user.toSafeObject(),
      profile: user.profile,
    },
  });
});
