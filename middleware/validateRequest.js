import { validationResult, body } from 'express-validator'

// Middleware to check validation results
export const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    })
  }
  next()
}

// Admin login validation rules
export const validateAdminLogin = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
]

// Customer registration validation rules
export const validateRegister = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone')
    .matches(/^[0-9]{10}$/).withMessage('Phone must be a 10-digit number'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
]

// Customer login validation rules
export const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate
]

// Product validation rules
export const validateProduct = [
  body('name').trim().notEmpty().withMessage('Product name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  validate
]

// Order validation rules
export const validateOrder = [
  body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('customer.firstName').trim().notEmpty().withMessage('First name is required'),
  body('customer.lastName').trim().notEmpty().withMessage('Last name is required'),
  body('customer.mobile').matches(/^[0-9]{10}$/).withMessage('Valid mobile number required'),
  body('customer.streetAddress').trim().notEmpty().withMessage('Street address is required'),
  body('customer.city').trim().notEmpty().withMessage('City is required'),
  body('customer.zipCode').trim().notEmpty().withMessage('ZIP code is required'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  validate
]
