/**
 * Input validation utilities
 */

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validateProduct = (product) => {
  const errors = []
  
  if (!product.name || product.name.trim().length === 0) {
    errors.push('Product name is required')
  }
  if (!product.description || product.description.trim().length === 0) {
    errors.push('Product description is required')
  }
  if (!product.originalPrice || product.originalPrice < 0) {
    errors.push('Product original price is required and must be positive')
  }
  if (!product.category || product.category.trim().length === 0) {
    errors.push('Product category is required')
  }
  if (product.images && (!Array.isArray(product.images) || product.images.length > 4)) {
    errors.push('Product can have maximum 4 images')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export const validateOrder = (order) => {
  const errors = []
  
  console.log('🔍 Validating order:', JSON.stringify(order, null, 2))
  
  if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
    errors.push('Order must contain at least one item')
    console.log('❌ Items validation failed:', order.items)
  }
  if (!order.totalAmount || order.totalAmount < 0) {
    errors.push('Order total is required and must be positive')
    console.log('❌ Total amount validation failed:', order.totalAmount)
  }
  if (!order.shippingAddress) {
    errors.push('Shipping address is required')
    console.log('❌ Shipping address missing')
  } else {
    const { firstName, lastName, email, streetAddress, city, state, zipCode, mobile } = order.shippingAddress
    console.log('🏠 Shipping address fields:', { firstName, lastName, email, streetAddress, city, state, zipCode, mobile })
    
    if (!firstName) errors.push('First name is required')
    if (!lastName) errors.push('Last name is required')
    if (!email) errors.push('Email is required')
    if (!streetAddress) errors.push('Street address is required')
    if (!city) errors.push('City is required')
    if (!state) errors.push('State is required')
    if (!zipCode) errors.push('ZIP code is required')
    if (!mobile) errors.push('Mobile number is required')
  }
  
  console.log('📋 Validation errors:', errors)
  return { valid: errors.length === 0, errors }
}

export const validateAdmin = (admin) => {
  const errors = []
  
  if (!admin.username || admin.username.trim().length < 3) {
    errors.push('Username must be at least 3 characters')
  }
  if (!admin.password || admin.password.length < 6) {
    errors.push('Password must be at least 6 characters')
  }
  if (!admin.email || !validateEmail(admin.email)) {
    errors.push('Valid email is required')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
