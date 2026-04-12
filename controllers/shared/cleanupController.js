import cleanupCloudinaryImages from '../scripts/cleanupCloudinaryImages.js'

/**
 * Clean up unused Cloudinary images
 * GET /api/cleanup/cloudinary?dryRun=true&force=false
 */
export const cleanupCloudinary = async (req, res) => {
  try {
    const { dryRun = 'true', force = 'false' } = req.query
    
    const options = {
      dryRun: dryRun === 'true',
      force: force === 'true'
    }
    
    // Only allow admin users
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      })
    }
    
    const result = await cleanupCloudinaryImages(options)
    
    res.json({
      success: true,
      message: options.dryRun 
        ? 'Dry run completed. Use dryRun=false to actually delete images.'
        : 'Cleanup completed',
      data: result
    })
    
  } catch (error) {
    console.error('Cleanup controller error:', error)
    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error.message
    })
  }
}
