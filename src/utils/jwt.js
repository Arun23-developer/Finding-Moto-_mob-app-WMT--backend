const jwt = require('jsonwebtoken');

/**
 * Generate JWT Token
 * @param {Object} payload - Token payload
 * @param {String} type - Token type: 'access' or 'refresh'
 * @returns {String} JWT token
 */
const generateToken = (payload, type = 'access') => {
  const secret = type === 'refresh' 
    ? process.env.JWT_REFRESH_SECRET 
    : process.env.JWT_SECRET;
  
  const expiresIn = type === 'refresh'
    ? process.env.JWT_REFRESH_EXPIRE
    : process.env.JWT_EXPIRE;

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verify JWT Token
 * @param {String} token - JWT token
 * @param {String} type - Token type: 'access' or 'refresh'
 * @returns {Object} Decoded token
 */
const verifyToken = (token, type = 'access') => {
  try {
    const secret = type === 'refresh'
      ? process.env.JWT_REFRESH_SECRET
      : process.env.JWT_SECRET;

    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

/**
 * Decode Token (without verification)
 * @param {String} token - JWT token
 * @returns {Object} Decoded token
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate Tokens (Access + Refresh)
 * @param {Object} user - User object
 * @returns {Object} {accessToken, refreshToken}
 */
const generateTokenPair = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName
  };

  return {
    accessToken: generateToken(payload, 'access'),
    refreshToken: generateToken(payload, 'refresh')
  };
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateTokenPair
};
