/**
 * Security Middleware
 * Implements various security measures
 */

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const config = require('../config');

/**
 * Helmet configuration for security headers
 */
const helmetConfig = helmet({
  contentSecurityPolicy: config.helmet.cspEnabled ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", config.ai.url],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  } : false,
  
  hsts: config.helmet.hstsEnabled ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  } : false,
  
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

/**
 * Sanitize data to prevent NoSQL injection
 */
const sanitizeData = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key: ${key} in request from ${req.ip}`);
  },
});

/**
 * Prevent XSS attacks
 */
const preventXSS = xss();

/**
 * Prevent HTTP Parameter Pollution
 */
const preventHPP = hpp({
  whitelist: [
    'limit',
    'page',
    'sort',
    'fields',
    'genres',
    'languages',
  ],
});

/**
 * Add security headers manually
 */
const addSecurityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

/**
 * Sanitize user input
 */
const sanitizeInput = (req, res, next) => {
  // Trim strings in body
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  // Trim strings in query
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }
  
  next();
};

/**
 * Prevent common attacks
 */
const preventCommonAttacks = (req, res, next) => {
  // Check for suspicious patterns in URL
  const suspiciousPatterns = [
    /(\.\.|\/\/)/,  // Path traversal
    /<script/i,     // XSS
    /javascript:/i, // XSS
    /on\w+=/i,      // Event handlers
    /eval\(/i,      // Code injection
    /union.*select/i, // SQL injection
  ];
  
  const url = req.originalUrl.toLowerCase();
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
      });
    }
  }
  
  next();
};

module.exports = {
  helmetConfig,
  sanitizeData,
  preventXSS,
  preventHPP,
  addSecurityHeaders,
  sanitizeInput,
  preventCommonAttacks,
};
