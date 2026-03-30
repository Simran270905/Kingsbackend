/**
 * Payment Method Discount Calculator
 * Provides 10% discount for UPI and Netbanking payment methods
 */

/**
 * Calculate discount based on payment method
 * @param {string} paymentMethod - The payment method ('upi', 'netbanking', etc.)
 * @param {number} orderTotal - The original order total amount
 * @returns {Object} - Discount calculation result
 */
export const calculatePaymentMethodDiscount = (paymentMethod, orderTotal) => {
  // Validate inputs
  if (!paymentMethod || typeof orderTotal !== 'number' || orderTotal <= 0) {
    return {
      hasDiscount: false,
      discountAmount: 0,
      discountedAmount: orderTotal,
      discountType: null,
      discountPercentage: 0
    }
  }

  // Check if payment method is eligible for discount
  const eligibleMethods = ['upi', 'netbanking']
  const normalizedMethod = paymentMethod.toLowerCase().trim()
  
  if (!eligibleMethods.includes(normalizedMethod)) {
    return {
      hasDiscount: false,
      discountAmount: 0,
      discountedAmount: orderTotal,
      discountType: null,
      discountPercentage: 0
    }
  }

  // Calculate 10% discount
  const discountPercentage = 10
  const discountAmount = Math.round((orderTotal * discountPercentage) / 100)
  const discountedAmount = orderTotal - discountAmount

  return {
    hasDiscount: true,
    discountAmount,
    discountedAmount,
    discountType: 'payment_method',
    discountPercentage
  }
}

/**
 * Apply discount to order data
 * @param {Object} orderData - The original order data
 * @returns {Object} - Order data with discount applied
 */
export const applyPaymentMethodDiscount = (orderData) => {
  if (!orderData || !orderData.paymentMethod || !orderData.totalAmount) {
    return orderData
  }

  const discountCalculation = calculatePaymentMethodDiscount(
    orderData.paymentMethod,
    orderData.totalAmount
  )

  // Return enhanced order data with discount information
  return {
    ...orderData,
    originalAmount: orderData.totalAmount,
    discountedAmount: discountCalculation.discountedAmount,
    totalAmount: discountCalculation.discountedAmount, // Update totalAmount to discounted amount
    discountType: discountCalculation.discountType,
    paymentMethodDiscount: discountCalculation.discountAmount,
    paymentMethodDiscountPercentage: discountCalculation.discountPercentage
  }
}

/**
 * Calculate partial payment amounts (10/90 split) with discount consideration
 * @param {Object} orderData - The order data
 * @returns {Object} - Order data with partial payment calculations
 */
export const calculatePartialPayment = (orderData) => {
  if (!orderData || !orderData.totalAmount) {
    return orderData
  }

  const { totalAmount, paymentMethod, paymentPlan } = orderData
  
  // First calculate any prepaid discount
  const discountCalculation = calculatePaymentMethodDiscount(paymentMethod, totalAmount)
  
  // Use discounted amount for calculation if discount applies, otherwise use original
  const calculationAmount = discountCalculation.discountedAmount
  
  if (paymentPlan === 'full') {
    return {
      ...orderData,
      originalAmount: totalAmount,
      discountApplied: discountCalculation.hasDiscount,
      discountPercent: discountCalculation.hasDiscount ? 10 : 0,
      discountedTotal: discountCalculation.discountedAmount,
      paymentPlan: 'full',
      advancePercent: null,
      advanceAmount: null,
      remainingPercent: null,
      remainingAmount: null,
      paymentMethodDiscount: discountCalculation.discountAmount
    }
  }
  
  // Partial payment calculation (10/90 split)
  const advancePercent = 10
  const remainingPercent = 90
  const advanceAmount = Math.round((calculationAmount * advancePercent) / 100)
  const remainingAmount = calculationAmount - advanceAmount
  
  return {
    ...orderData,
    originalAmount: totalAmount,
    discountApplied: discountCalculation.hasDiscount,
    discountPercent: discountCalculation.hasDiscount ? 10 : 0,
    discountedTotal: discountCalculation.discountedAmount,
    paymentPlan: 'partial',
    advancePercent,
    advanceAmount,
    remainingPercent,
    remainingAmount,
    paymentMethodDiscount: discountCalculation.discountAmount
  }
}

/**
 * Process order with payment plan and discount calculations
 * @param {Object} orderData - The original order data
 * @returns {Object} - Processed order data with all calculations
 */
export const processOrderPayment = (orderData) => {
  // First apply payment method discount if applicable
  const orderWithDiscount = applyPaymentMethodDiscount(orderData)
  
  // Then calculate partial payment if applicable
  const finalOrderData = calculatePartialPayment(orderWithDiscount)
  
  return finalOrderData
}

/**
 * Validate payment method discount eligibility
 * @param {string} paymentMethod - The payment method to validate
 * @returns {boolean} - Whether the payment method is eligible for discount
 */
export const isPaymentMethodEligibleForDiscount = (paymentMethod) => {
  if (!paymentMethod) return false
  
  const eligibleMethods = ['upi', 'netbanking']
  return eligibleMethods.includes(paymentMethod.toLowerCase().trim())
}
