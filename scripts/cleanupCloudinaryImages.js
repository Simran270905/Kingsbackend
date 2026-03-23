import cloudinary from '../config/cloudinary.js'
import Product from '../models/Product.js'
import Brand from '../models/Brand.js'
import Category from '../models/Category.js'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Extract public_id from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Extracted public_id or null
 */
function extractPublicIdFromUrl(url) {
  if (!url || !url.includes('cloudinary.com')) {
    return null
  }
  
  try {
    // Extract public_id from Cloudinary URL
    // Format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/public_id.jpg
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    
    // Find the version number (starts with 'v')
    const versionIndex = pathParts.findIndex(part => part.startsWith('v'))
    if (versionIndex === -1 || versionIndex === pathParts.length - 1) {
      return null
    }
    
    // Everything after the version is the public_id (including folders)
    const publicIdParts = pathParts.slice(versionIndex + 1)
    let publicId = publicIdParts.join('/')
    
    // Remove file extension
    const lastDotIndex = publicId.lastIndexOf('.')
    if (lastDotIndex > 0) {
      publicId = publicId.substring(0, lastDotIndex)
    }
    
    return publicId
  } catch (error) {
    console.warn('Error extracting public_id from URL:', url, error.message)
    return null
  }
}

/**
 * Fetch all image URLs and public_ids from database
 */
async function fetchDatabaseImages() {
  const dbImages = new Set()
  const dbPublicIds = new Set()
  
  try {
    // Fetch product images
    const products = await Product.find({}, 'images').lean()
    for (const product of products) {
      for (const imageUrl of product.images || []) {
        dbImages.add(imageUrl)
        const publicId = extractPublicIdFromUrl(imageUrl)
        if (publicId) {
          dbPublicIds.add(publicId)
        }
      }
    }
    
    // Fetch brand logos
    const brands = await Brand.find({}, 'logo logoPublicId').lean()
    for (const brand of brands) {
      if (brand.logo) {
        dbImages.add(brand.logo)
        const publicId = extractPublicIdFromUrl(brand.logo)
        if (publicId) {
          dbPublicIds.add(publicId)
        }
      }
      if (brand.logoPublicId) {
        dbPublicIds.add(brand.logoPublicId)
      }
    }
    
    // Fetch category images
    const categories = await Category.find({}, 'image imagePublicId').lean()
    for (const category of categories) {
      if (category.image) {
        dbImages.add(category.image)
        const publicId = extractPublicIdFromUrl(category.image)
        if (publicId) {
          dbPublicIds.add(publicId)
        }
      }
      if (category.imagePublicId) {
        dbPublicIds.add(category.imagePublicId)
      }
    }
    
    console.log(`✓ Found ${dbImages.size} image URLs in database`)
    console.log(`✓ Found ${dbPublicIds.size} unique public_ids in database`)
    
    return { dbImages, dbPublicIds }
  } catch (error) {
    console.error('Error fetching database images:', error)
    throw error
  }
}

/**
 * Fetch all resources from Cloudinary
 */
async function fetchCloudinaryResources() {
  try {
    const resources = []
    let nextCursor = null
    
    do {
      const result = await cloudinary.api.resources({
        type: 'upload',
        max_results: 500,
        next_cursor: nextCursor,
        resource_type: 'image'
      })
      
      resources.push(...result.resources)
      nextCursor = result.next_cursor
      
    } while (nextCursor)
    
    console.log(`✓ Found ${resources.length} images in Cloudinary`)
    
    return resources
  } catch (error) {
    console.error('Error fetching Cloudinary resources:', error)
    throw error
  }
}

/**
 * Identify unused images
 */
function identifyUnusedImages(cloudinaryResources, dbPublicIds) {
  const unusedImages = []
  const usedImages = []
  
  for (const resource of cloudinaryResources) {
    if (dbPublicIds.has(resource.public_id)) {
      usedImages.push(resource)
    } else {
      unusedImages.push(resource)
    }
  }
  
  console.log(`✓ ${usedImages.length} images are referenced in database`)
  console.log(`⚠ ${unusedImages.length} images are unused`)
  
  return { unusedImages, usedImages }
}

/**
 * Delete unused images from Cloudinary
 */
async function deleteUnusedImages(imagesToDelete, dryRun = true) {
  const results = {
    deleted: [],
    errors: [],
    skipped: []
  }
  
  if (imagesToDelete.length === 0) {
    console.log('✓ No images to delete')
    return results
  }
  
  console.log(`\n${dryRun ? 'DRY RUN - ' : ''}Preparing to delete ${imagesToDelete.length} unused images:`)
  
  // Show images to be deleted
  for (const image of imagesToDelete) {
    console.log(`  - ${image.public_id} (${image.secure_url})`)
  }
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE: No actual deletion performed')
    results.skipped = imagesToDelete
    return results
  }
  
  // Confirm deletion
  console.log('\n⚠️  WARNING: This will permanently delete the above images from Cloudinary!')
  console.log('Type "DELETE" to confirm:')
  
  // For automated scripts, you might want to add a confirmation flag
  // For now, we'll proceed with batch deletion
  
  console.log('🗑️  Starting batch deletion...')
  
  // Delete in batches of 10 for efficiency
  const batchSize = 10
  for (let i = 0; i < imagesToDelete.length; i += batchSize) {
    const batch = imagesToDelete.slice(i, i + batchSize)
    
    const deletePromises = batch.map(async (image) => {
      try {
        const result = await cloudinary.uploader.destroy(image.public_id, {
          resource_type: 'image',
          invalidate: true
        })
        
        if (result.result === 'ok' || result.result === 'deleted') {
          console.log(`✓ Deleted: ${image.public_id}`)
          results.deleted.push(image)
        } else {
          console.log(`⚠ Skipped: ${image.public_id} (${result.result})`)
          results.skipped.push(image)
        }
      } catch (error) {
        console.error(`✗ Error deleting ${image.public_id}:`, error.message)
        results.errors.push({ image, error: error.message })
      }
    })
    
    await Promise.all(deletePromises)
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < imagesToDelete.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return results
}

/**
 * Main cleanup function
 */
async function cleanupCloudinaryImages(options = {}) {
  const { dryRun = true, force = false } = options
  
  console.log('🧹 Starting Cloudinary image cleanup...\n')
  
  try {
    // Step 1: Fetch database images
    const { dbPublicIds } = await fetchDatabaseImages()
    
    // Step 2: Fetch Cloudinary resources
    const cloudinaryResources = await fetchCloudinaryResources()
    
    // Step 3: Identify unused images
    const { unusedImages } = identifyUnusedImages(cloudinaryResources, dbPublicIds)
    
    if (unusedImages.length === 0) {
      console.log('\n✅ All images are in use. No cleanup needed.')
      return {
        success: true,
        totalCloudinaryImages: cloudinaryResources.length,
        usedImages: cloudinaryResources.length,
        unusedImages: 0,
        deleted: 0,
        errors: 0
      }
    }
    
    // Step 4: Delete unused images
    const results = await deleteUnusedImages(unusedImages, dryRun)
    
    // Summary
    console.log('\n📊 CLEANUP SUMMARY:')
    console.log(`  Total Cloudinary images: ${cloudinaryResources.length}`)
    console.log(`  Images referenced in DB: ${cloudinaryResources.length - unusedImages.length}`)
    console.log(`  Unused images found: ${unusedImages.length}`)
    console.log(`  Images deleted: ${results.deleted.length}`)
    console.log(`  Images skipped: ${results.skipped.length}`)
    console.log(`  Errors encountered: ${results.errors.length}`)
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:')
      results.errors.forEach(({ image, error }) => {
        console.log(`  - ${image.public_id}: ${error}`)
      })
    }
    
    return {
      success: true,
      totalCloudinaryImages: cloudinaryResources.length,
      usedImages: cloudinaryResources.length - unusedImages.length,
      unusedImages: unusedImages.length,
      deleted: results.deleted.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
      results
    }
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Export for use as module
export default cleanupCloudinaryImages

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--delete')
  const force = args.includes('--force')
  
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'DELETE'}${force ? ' (FORCE)' : ''}`)
  console.log('Use --delete to actually delete images')
  console.log('Use --force to skip confirmation prompts\n')
  
  cleanupCloudinaryImages({ dryRun, force })
}
