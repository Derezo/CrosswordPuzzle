import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import Joi from 'joi';

// Express-validator error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: (error as any).path || (error as any).param || 'unknown',
        message: error.msg,
        value: (error as any).value
      }))
    });
  }
  next();
};

// Joi validation middleware
export const validateWithJoi = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true 
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }
    
    next();
  };
};

// Common validation rules
export const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
    
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  name: (field: string) => body(field)
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage(`${field} must be between 1 and 50 characters`),
    
  id: param('id')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('ID must contain only alphanumeric characters, hyphens, and underscores'),
    
  date: param('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
    
  puzzleDate: body('puzzleDate')
    .matches(/^\d{4}-\d{2}-\d{2}(-.*)?$/)
    .withMessage('Puzzle date must start with YYYY-MM-DD format'),
    
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
    
  offset: query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
};

// Authentication validation schemas
export const authValidationSchemas = {
  register: [
    commonValidations.email,
    commonValidations.password,
    commonValidations.name('firstName'),
    commonValidations.name('lastName'),
    handleValidationErrors
  ],
  
  login: [
    commonValidations.email,
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],
  
  updatePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    commonValidations.password.withMessage('New password must be at least 8 characters with uppercase, lowercase, and number'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match');
        }
        return true;
      }),
    handleValidationErrors
  ],
  
  updateProfile: [
    commonValidations.name('firstName'),
    commonValidations.name('lastName'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address'),
    handleValidationErrors
  ]
};

// Puzzle validation schemas
export const puzzleValidationSchemas = {
  validateAnswers: [
    commonValidations.puzzleDate,
    body('answers')
      .isObject()
      .withMessage('Answers must be an object')
      .custom((answers) => {
        const keys = Object.keys(answers);
        if (keys.length === 0) {
          throw new Error('Answers object cannot be empty');
        }
        
        for (const key of keys) {
          if (!/^\d+$/.test(key)) {
            throw new Error(`Invalid clue number: ${key}`);
          }
          
          const answer = answers[key];
          if (typeof answer !== 'string' || answer.length === 0) {
            throw new Error(`Answer for clue ${key} must be a non-empty string`);
          }
          
          if (!/^[A-Z]+$/.test(answer)) {
            throw new Error(`Answer for clue ${key} must contain only uppercase letters`);
          }
        }
        
        return true;
      }),
    handleValidationErrors
  ],
  
  validateGridAnswers: [
    commonValidations.puzzleDate,
    body('gridData')
      .isArray()
      .withMessage('Grid data must be an array')
      .custom((grid) => {
        if (!Array.isArray(grid) || grid.length === 0) {
          throw new Error('Grid data must be a non-empty array');
        }
        
        grid.forEach((row, rowIndex) => {
          if (!Array.isArray(row)) {
            throw new Error(`Row ${rowIndex} must be an array`);
          }
          
          row.forEach((cell, colIndex) => {
            if (!cell || typeof cell !== 'object') {
              throw new Error(`Cell at [${rowIndex}][${colIndex}] must be an object`);
            }
            
            if (typeof cell.letter !== 'string') {
              throw new Error(`Cell letter at [${rowIndex}][${colIndex}] must be a string`);
            }
          });
        });
        
        return true;
      }),
    handleValidationErrors
  ],
  
  generateCategoryPuzzle: [
    body('categoryName')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9\s_-]+$/)
      .withMessage('Category name must contain only letters, numbers, spaces, hyphens, and underscores'),
    handleValidationErrors
  ]
};

// Suggestion validation schemas
export const suggestionValidationSchemas = {
  submitSuggestion: [
    commonValidations.puzzleDate,
    body('clueNumber')
      .isInt({ min: 1 })
      .withMessage('Clue number must be a positive integer'),
    body('originalClue')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Original clue must be between 1 and 500 characters'),
    body('originalAnswer')
      .trim()
      .isLength({ min: 1, max: 50 })
      .matches(/^[A-Z]+$/)
      .withMessage('Original answer must contain only uppercase letters'),
    body('suggestedClue')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Suggested clue must not exceed 500 characters'),
    body('suggestedAnswer')
      .optional()
      .trim()
      .matches(/^[A-Z]*$/)
      .withMessage('Suggested answer must contain only uppercase letters'),
    body('comments')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Comments must not exceed 1000 characters'),
    handleValidationErrors
  ]
};

// Category validation schemas
export const categoryValidationSchemas = {
  getCategories: [
    query('sortBy')
      .optional()
      .isIn(['wordCount', 'favoritesCount', 'name'])
      .withMessage('sortBy must be one of: wordCount, favoritesCount, name'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('order must be either asc or desc'),
    commonValidations.limit,
    commonValidations.offset,
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search term must not exceed 100 characters'),
    query('activeOnly')
      .optional()
      .isIn(['true', 'false', '1', '0'])
      .withMessage('activeOnly must be true or false'),
    handleValidationErrors
  ],
  
  getCategoryWords: [
    commonValidations.id,
    commonValidations.limit,
    commonValidations.offset,
    handleValidationErrors
  ]
};

// Joi schemas for complex validation
export const joiSchemas = {
  multiCategoryGeneration: Joi.object({
    categoryNames: Joi.array()
      .items(Joi.string().trim().min(1).max(100))
      .min(1)
      .max(5)
      .required()
      .messages({
        'array.min': 'At least one category is required',
        'array.max': 'Maximum 5 categories allowed',
        'string.min': 'Category name cannot be empty',
        'string.max': 'Category name must not exceed 100 characters'
      }),
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Authentication token is required'
      })
  }),
  
  bulkAnswerValidation: Joi.object({
    puzzleDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}(-.*)?$/)
      .required()
      .messages({
        'string.pattern.base': 'Date must start with YYYY-MM-DD format'
      }),
    answers: Joi.object()
      .pattern(
        Joi.string().pattern(/^\d+$/),
        Joi.string().pattern(/^[A-Z]+$/).min(1).max(50)
      )
      .min(1)
      .required()
      .messages({
        'object.min': 'At least one answer is required',
        'string.pattern.base': 'Answers must contain only uppercase letters'
      })
  })
};

// Request size limits
export const requestSizeLimits = {
  small: '100kb',   // For auth, simple requests
  medium: '1mb',    // For puzzle data
  large: '10mb'     // For file uploads, if any
};