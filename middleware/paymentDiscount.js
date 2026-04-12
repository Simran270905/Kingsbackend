import { applyPaymentMethodDiscount } from '../utils/discountCalculator.js'

/**
 * Middleware to apply payment method discount before order creation
 * This middleware processes the order data and applies 10% discount
 * for UPI and Netbanking payment methods
 */
export const applyPaymentDiscountMiddleware = (req, res, next) => {
  try {
    // Only apply to order creation endpoint
    if (req.method === 'POST' && req.path.includes('/order')) {
      const orderData = req.body

      // Apply payment method discount if eligible
      if (orderData && orderData.paymentMethod && orderData.totalAmount) {
        const enhancedOrderData = applyPaymentMethodDiscount(orderData)
        
        // Update request body with enhanced order data
        req.body = enhancedOrderData
        
        console.log(`💳 Payment method discount applied:`, {
          paymentMethod: orderData.paymentMethod,
          originalAmount: enhancedOrderData.originalAmount,
          discountedAmount: enhancedOrderData.discountedAmount,
          discountAmount: enhancedOrderData.paymentMethodDiscount
        })
      }
    }
    
    next()
  } catch (error) {
    console.error('❌ Error in payment discount middleware:', error)
    next() // Continue without failing the request
  }
}

/**
 * Helper function to validate and apply discount for order creation
 * Can be used directly in order controller
 */
export const processOrderDiscount = (orderData) => {
  try {
    if (!orderData) {
      throw new Error('Order data is required')
    }

    // Apply payment method discount
    const enhancedOrderData = applyPaymentMethodDiscount(orderData)
    
    return {
      success: true,
      orderData: enhancedOrderData,
      discountApplied: enhancedOrderData.paymentMethodDiscount > 0
    }
  } catch (error) {
    console.error('❌ Error processing order discount:', error)
    return {
      success: false,
      error: error.message,
      orderData
    }
  }
}

/**
 * Function to calculate final order amounts with all discounts
 * Combines coupon discounts and payment method discounts
 */
export const calculateFinalOrderAmounts = (orderData) => {
  try {
    const {
      subtotal = 0,
      tax = 0,
      shippingCost = 0,
      discount: couponDiscount = 0,
      totalAmount,
      paymentMethod
    } = orderData

    // Calculate base total (subtotal + tax + shipping)
    const baseTotal = subtotal + tax + shippingCost
    
    // Apply coupon discount first
    const amountAfterCoupon = baseTotal - couponDiscount
    
    // Apply payment method discount on the remaining amount
    const paymentDiscountCalculation = applyPaymentMethodDiscount({
      paymentMethod,
      totalAmount: amountAfterCoupon
    })
    
    const finalAmount = paymentDiscountCalculation.discountedAmount || amountAfterCoupon
    const paymentDiscount = paymentDiscountCalculation.paymentMethodDiscount || 0
    
    return {
      originalAmount: baseTotal,
      couponDiscount,
      paymentMethodDiscount: paymentDiscount,
      totalDiscount: couponDiscount + paymentDiscount,
      finalAmount,
      discountType: paymentDiscount > 0 ? 'payment_method' : (couponDiscount > 0 ? 'coupon' : null)
    }
  } catch (error) {
    console.error('❌ Error calculating final order amounts:', error)
    return {
      originalAmount: orderData.totalAmount,
      couponDiscount: 0,
      paymentMethodDiscount: 0,
      totalDiscount: 0,
      finalAmount: orderData.totalAmount,
      discountType: null
    }
  }
}
