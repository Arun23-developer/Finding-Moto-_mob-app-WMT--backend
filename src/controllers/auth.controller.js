const User = require('../models/User');
const Wallet = require('../models/Wallet');
const logger = require('../utils/logger');
const { generateTokenPair, generateToken } = require('../utils/jwt');
const { registerValidation, loginValidation } = require('../utils/validators');
const { asyncHandler, BadRequestError, NotFoundError } = require('../middleware/errorMiddleware');

/**
 * Register new user
 */
const register = asyncHandler(async (req, res) => {
  const { error, value } = registerValidation.validate(req.body);

  if (error) {
    throw new BadRequestError(
      error.details.map((d) => d.message).join(', ')
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email: value.email }, { phone: value.phone }]
  });

  if (existingUser) {
    if (existingUser.email === value.email) {
      throw new BadRequestError('Email already registered');
    }
    throw new BadRequestError('Phone number already registered');
  }

  // Create new user
  const user = new User({
    firstName: value.firstName,
    lastName: value.lastName,
    email: value.email,
    phone: value.phone,
    password: value.password,
    role: value.role || 'buyer'
  });

  // Add role-specific fields
  if (value.role === 'seller') {
    user.businessName = value.businessName;
  }

  // Save user
  await user.save();

  // Create wallet for user
  const wallet = new Wallet({
    userId: user._id,
    balance: 0,
    status: 'active'
  });

  await wallet.save();

  // Generate tokens
  const tokens = generateTokenPair(user);

  logger.info('User registered successfully', {
    userId: user._id,
    email: user.email,
    role: user.role
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      tokens,
      wallet: {
        id: wallet._id,
        balance: wallet.balance
      }
    }
  });
});

/**
 * Login user
 */
const login = asyncHandler(async (req, res) => {
  const { error, value } = loginValidation.validate(req.body);

  if (error) {
    throw new BadRequestError(
      error.details.map((d) => d.message).join(', ')
    );
  }

  // Find user
  const user = await User.findOne({ email: value.email });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Check if account is locked
  if (user.isAccountLocked()) {
    throw new BadRequestError('Account locked. Please try again later');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(value.password);

  if (!isPasswordValid) {
    // Record failed login
    await user.recordFailedLogin();

    throw new BadRequestError('Invalid email or password');
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Generate tokens
  const tokens = generateTokenPair(user);

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  logger.info('User logged in successfully', {
    userId: user._id,
    email: user.email,
    role: user.role
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      tokens
    }
  });
});

/**
 * Refresh access token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new BadRequestError('Refresh token is required');
  }

  // Verify refresh token (verification is done in middleware)
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new NotFoundError('User');
  }

  // Generate new tokens
  const tokens = generateTokenPair(user);

  logger.info('Token refreshed', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: { tokens }
  });
});

/**
 * Logout user
 */
const logout = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  logger.info('User logged out', { userId });

  res.status(200).json({
    success: true,
    message: 'Logout successful',
    data: {}
  });
});

/**
 * Forgot password - Send reset email
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new BadRequestError('Email is required');
  }

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if email exists (security)
    return res.status(200).json({
      success: true,
      message: 'If email exists, password reset link will be sent'
    });
  }

  // Generate reset token
  const resetToken = generateToken({ userId: user._id }, 'access', '1h');

  // Save reset token to user
  user.passwordReset = {
    token: resetToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  };

  await user.save();

  // TODO: Send email with reset link
  // await sendPasswordResetEmail(user.email, resetToken);

  logger.info('Password reset email sent', { userId: user._id, email: user.email });

  res.status(200).json({
    success: true,
    message: 'Password reset link sent to email',
    data: {}
  });
});

/**
 * Reset password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (!resetToken || !newPassword || !confirmPassword) {
    throw new BadRequestError('Reset token and new password are required');
  }

  if (newPassword !== confirmPassword) {
    throw new BadRequestError('Passwords do not match');
  }

  // Verify reset token and find user
  const user = await User.findOne({
    'passwordReset.token': resetToken,
    'passwordReset.expiresAt': { $gt: new Date() }
  });

  if (!user) {
    throw new BadRequestError('Invalid or expired reset token');
  }

  // Update password
  user.password = newPassword;
  user.passwordReset = {
    token: null,
    expiresAt: null
  };

  await user.save();

  logger.info('Password reset successfully', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Password reset successfully',
    data: {}
  });
});

/**
 * Change password (for authenticated users)
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new BadRequestError('All password fields are required');
  }

  if (newPassword !== confirmPassword) {
    throw new BadRequestError('Passwords do not match');
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new BadRequestError('Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.info('Password changed successfully', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
    data: {}
  });
});

/**
 * Get current user profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -passwordReset');

  if (!user) {
    throw new NotFoundError('User');
  }

  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: { user }
  });
});

/**
 * Update user profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, address, profilePhoto } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    throw new NotFoundError('User');
  }

  // Update fields
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  if (profilePhoto) user.profilePhoto = profilePhoto;

  await user.save();

  logger.info('Profile updated successfully', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: user.toJSON() }
  });
});

/**
 * Verify email
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.body;

  if (!verificationToken) {
    throw new BadRequestError('Verification token is required');
  }

  const user = await User.findOne({
    'emailVerification.token': verificationToken,
    'emailVerification.expiresAt': { $gt: new Date() }
  });

  if (!user) {
    throw new BadRequestError('Invalid or expired verification token');
  }

  user.emailVerification = {
    verified: true,
    token: null,
    expiresAt: null
  };

  await user.save();

  logger.info('Email verified successfully', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
    data: {}
  });
});

/**
 * Verify phone
 */
const verifyPhone = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    throw new BadRequestError('OTP is required');
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    throw new NotFoundError('User');
  }

  if (!user.phoneVerification || user.phoneVerification.otp !== otp) {
    throw new BadRequestError('Invalid OTP');
  }

  if (new Date() > user.phoneVerification.expiresAt) {
    throw new BadRequestError('OTP has expired');
  }

  user.phoneVerification = {
    verified: true,
    otp: null,
    expiresAt: null
  };

  await user.save();

  logger.info('Phone verified successfully', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Phone verified successfully',
    data: {}
  });
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  verifyEmail,
  verifyPhone
};
