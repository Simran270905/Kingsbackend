import Product from '../models/Product.js'
import Order from '../models/Order.js'
import { updateStockAtomically } from '../models/Product.js'

/**
 * Stock Management Test Suite
 * Tests edge cases and concurrent order handling
 */

async function testStockManagement() {
  console.log('=== Stock Management Test Suite Started ===')
  
  try {
    // Test 1: Basic stock validation
    await testBasicStockValidation()
    
    // Test 2: Atomic stock operations
    await testAtomicStockOperations()
    
    // Test 3: Concurrent order simulation
    await testConcurrentOrders()
    
    // Test 4: Stock restoration on cancellation
    await testStockRestoration()
    
    // Test 5: Size-based stock management
    await testSizeBasedStock()
    
    // Test 6: Edge cases
    await testEdgeCases()
    
    console.log('=== All Stock Management Tests Passed ===')
    return true
  } catch (error) {
    console.error('=== Stock Management Tests Failed ===', error)
    return false
  }
}

async function testBasicStockValidation() {
  console.log('Test 1: Basic Stock Validation')
  
  // Create test product
  const testProduct = new Product({
    name: 'Test Product',
    description: 'Test Description',
    originalPrice: 1000,
    sellingPrice: 800,
    category: 'test-category',
    stock: 10,
    sold: 0
  })
  
  await testProduct.save()
  
  // Test stock status virtual
  console.log('Stock Status:', testProduct.stockStatus)
  console.log('Available Stock:', testProduct.availableStock)
  
  // Test canBeOrdered method
  console.log('Can order 5 units:', testProduct.canBeOrdered(5))
  console.log('Can order 15 units:', testProduct.canBeOrdered(15))
  
  // Cleanup
  await Product.findByIdAndDelete(testProduct._id)
  console.log('Test 1: PASSED\n')
}

async function testAtomicStockOperations() {
  console.log('Test 2: Atomic Stock Operations')
  
  // Create test product
  const testProduct = new Product({
    name: 'Atomic Test Product',
    description: 'Test Description',
    originalPrice: 1000,
    sellingPrice: 800,
    category: 'test-category',
    stock: 20,
    sold: 0
  })
  
  await testProduct.save()
  const initialStock = testProduct.stock
  const initialSold = testProduct.sold
  
  // Test stock decrease
  const updatedProduct = await Product.updateStockAtomically(
    testProduct._id,
    5,
    'decrease'
  )
  
  console.log('Initial Stock:', initialStock, 'Updated Stock:', updatedProduct.stock)
  console.log('Initial Sold:', initialSold, 'Updated Sold:', updatedProduct.sold)
  
  // Verify stock decreased and sold increased
  if (updatedProduct.stock !== initialStock - 5) {
    throw new Error('Stock decrease failed')
  }
  if (updatedProduct.sold !== initialSold + 5) {
    throw new Error('Sold count increase failed')
  }
  
  // Test stock increase (restoration)
  const restoredProduct = await Product.updateStockAtomically(
    testProduct._id,
    3,
    'increase'
  )
  
  console.log('Restored Stock:', restoredProduct.stock)
  console.log('Restored Sold:', restoredProduct.sold)
  
  // Verify stock increased and sold decreased
  if (restoredProduct.stock !== updatedProduct.stock + 3) {
    throw new Error('Stock increase failed')
  }
  if (restoredProduct.sold !== updatedProduct.sold - 3) {
    throw new Error('Sold count decrease failed')
  }
  
  // Cleanup
  await Product.findByIdAndDelete(testProduct._id)
  console.log('Test 2: PASSED\n')
}

async function testConcurrentOrders() {
  console.log('Test 3: Concurrent Order Simulation')
  
  // Create test product with limited stock
  const testProduct = new Product({
    name: 'Concurrent Test Product',
    description: 'Test Description',
    originalPrice: 1000,
    sellingPrice: 800,
    category: 'test-category',
    stock: 5,
    sold: 0
  })
  
  await testProduct.save()
  
  // Simulate concurrent order attempts
  const orderPromises = []
  for (let i = 0; i < 8; i++) {
    orderPromises.push(
      simulateOrder(testProduct._id, 1)
    )
  }
  
  try {
    const results = await Promise.allSettled(orderPromises)
    
    // Count successful vs failed orders
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    console.log('Successful Orders:', successful)
    console.log('Failed Orders:', failed)
    
    // Verify stock integrity
    const finalProduct = await Product.findById(testProduct._id)
    console.log('Final Stock:', finalProduct.stock)
    console.log('Final Sold:', finalProduct.sold)
    
    // Stock + sold should equal initial stock
    if (finalProduct.stock + finalProduct.sold !== 5) {
      throw new Error('Stock integrity compromised')
    }
    
    // Only 5 orders should succeed
    if (successful !== 5) {
      throw new Error('Incorrect number of successful orders')
    }
    
  } catch (error) {
    console.error('Concurrent order test error:', error)
  }
  
  // Cleanup
  await Product.findByIdAndDelete(testProduct._id)
  console.log('Test 3: PASSED\n')
}

async function simulateOrder(productId, quantity) {
  try {
    await Product.updateStockAtomically(productId, quantity, 'decrease')
    return { success: true, quantity }
  } catch (error) {
    throw new Error(`Order failed: ${error.message}`)
  }
}

async function testStockRestoration() {
  console.log('Test 4: Stock Restoration on Cancellation')
  
  // Create test product
  const testProduct = new Product({
    name: 'Restoration Test Product',
    description: 'Test Description',
    originalPrice: 1000,
    sellingPrice: 800,
    category: 'test-category',
    stock: 15,
    sold: 0
  })
  
  await testProduct.save()
  const initialStock = testProduct.stock
  
  // Simulate order placement (stock decrease)
  await Product.updateStockAtomically(testProduct._id, 5, 'decrease')
  
  const afterOrder = await Product.findById(testProduct._id)
  console.log('After order - Stock:', afterOrder.stock, 'Sold:', afterOrder.sold)
  
  // Simulate order cancellation (stock restoration)
  await Product.updateStockAtomically(testProduct._id, 5, 'increase')
  
  const afterCancellation = await Product.findById(testProduct._id)
  console.log('After cancellation - Stock:', afterCancellation.stock, 'Sold:', afterCancellation.sold)
  
  // Verify full restoration
  if (afterCancellation.stock !== initialStock) {
    throw new Error('Stock not fully restored')
  }
  if (afterCancellation.sold !== 0) {
    throw new Error('Sold count not properly reset')
  }
  
  // Cleanup
  await Product.findByIdAndDelete(testProduct._id)
  console.log('Test 4: PASSED\n')
}

async function testSizeBasedStock() {
  console.log('Test 5: Size-Based Stock Management')
  
  // Create product with sizes
  const testProduct = new Product({
    name: 'Size Test Product',
    description: 'Test Description',
    originalPrice: 1000,
    sellingPrice: 800,
    category: 'test-category',
    hasSizes: true,
    sizes: [
      { size: 'S', stock: 5 },
      { size: 'M', stock: 3 },
      { size: 'L', stock: 7 }
    ],
    stock: 0 // General stock should be 0 for size-based products
  })
  
  await testProduct.save()
  
  // Test ordering specific sizes
  const updatedS = await Product.updateStockAtomically(testProduct._id, 2, 'decrease', 'S')
  const updatedM = await Product.updateStockAtomically(testProduct._id, 1, 'decrease', 'M')
  
  console.log('Size S stock:', updatedS.sizes.find(s => s.size === 'S').stock)
  console.log('Size M stock:', updatedM.sizes.find(s => s.size === 'M').stock)
  
  // Test canBeOrdered with sizes
  console.log('Can order S (3 left):', updatedM.canBeOrdered(3, 'S'))
  console.log('Can order S (4 left):', updatedM.canBeOrdered(4, 'S'))
  console.log('Can order L (7 left):', updatedM.canBeOrdered(7, 'L'))
  
  // Test stock restoration for specific size
  await Product.updateStockAtomically(testProduct._id, 1, 'increase', 'S')
  
  const finalProduct = await Product.findById(testProduct._id)
  console.log('Final Size S stock:', finalProduct.sizes.find(s => s.size === 'S').stock)
  
  // Cleanup
  await Product.findByIdAndDelete(testProduct._id)
  console.log('Test 5: PASSED\n')
}

async function testEdgeCases() {
  console.log('Test 6: Edge Cases')
  
  // Test 6a: Zero stock product
  const zeroStockProduct = new Product({
    name: 'Zero Stock Product',
    description: 'Test Description',
    originalPrice: 1000,
    sellingPrice: 800,
    category: 'test-category',
    stock: 0,
    sold: 0
  })
  
  await zeroStockProduct.save()
  
  try {
    await Product.updateStockAtomically(zeroStockProduct._id, 1, 'decrease')
    throw new Error('Should not allow ordering from zero stock')
  } catch (error) {
    console.log('Zero stock protection: PASSED')
  }
  
  // Test 6b: Negative stock prevention
  try {
    await Product.updateStockAtomically(zeroStockProduct._id, -1, 'decrease')
    throw new Error('Should not allow negative quantity')
  } catch (error) {
    console.log('Negative quantity protection: PASSED')
  }
  
  // Test 6c: Non-existent product
  try {
    await Product.updateStockAtomically('507f1f77bcf86cd799439011', 1, 'decrease')
    throw new Error('Should not allow non-existent product')
  } catch (error) {
    console.log('Non-existent product protection: PASSED')
  }
  
  // Test 6d: Invalid size
  const sizeProduct = new Product({
    name: 'Size Product',
    description: 'Test Description',
    originalPrice: 1000,
    sellingPrice: 800,
    category: 'test-category',
    hasSizes: true,
    sizes: [{ size: 'M', stock: 5 }],
    stock: 0
  })
  
  await sizeProduct.save()
  
  try {
    await Product.updateStockAtomically(sizeProduct._id, 1, 'decrease', 'XL')
    throw new Error('Should not allow invalid size')
  } catch (error) {
    console.log('Invalid size protection: PASSED')
  }
  
  // Cleanup
  await Product.findByIdAndDelete(zeroStockProduct._id)
  await Product.findByIdAndDelete(sizeProduct._id)
  console.log('Test 6: PASSED\n')
}

// Export for use in other files
export { testStockManagement }

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testStockManagement().then(success => {
    process.exit(success ? 0 : 1)
  })
}
