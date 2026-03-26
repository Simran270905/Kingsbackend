import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Function to check and fix imports in all files
function fixAllImports() {
  const directories = [
    'src/controllers',
    'src/routes',
    'src/middleware',
    'src/services',
    'src/utils'
  ]
  
  const fixes = []
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) return
    
    const files = fs.readdirSync(dir, { recursive: true })
    
    files.forEach(file => {
      if (typeof file === 'string' && file.endsWith('.js')) {
        const filePath = path.join(dir, file)
        try {
          let content = fs.readFileSync(filePath, 'utf8')
          let changed = false
          
          // Fix common import issues
          const patterns = [
            // Fix middleware imports
            { from: /from ['"]\.\.\/middleware\/([^'"]+)['"]/g, to: 'from \'../../middleware/$1\'' },
            { from: /from ['"]\.\.\/\.\.\/middleware\/([^'"]+)['"]/g, to: 'from \'../../middleware/$1\'' },
            
            // Fix utils imports
            { from: /from ['"]\.\.\/utils\/([^'"]+)['"]/g, to: 'from \'../../utils/$1\'' },
            { from: /from ['"]\.\.\/\.\.\/utils\/([^'"]+)['"]/g, to: 'from \'../../utils/$1\'' },
            
            // Fix services imports
            { from: /from ['"]\.\.\/services\/([^'"]+)['"]/g, to: 'from \'../../services/$1\'' },
            { from: /from ['"]\.\.\/\.\.\/services\/([^'"]+)['"]/g, to: 'from \'../../services/$1\'' },
            
            // Fix models imports
            { from: /from ['"]\.\.\/models\/([^'"]+)['"]/g, to: 'from \'../../models/$1\'' },
            { from: /from ['"]\.\.\/\.\.\/models\/([^'"]+)['"]/g, to: 'from \'../../models/$1\'' },
            
            // Fix controllers imports
            { from: /from ['"]\.\.\/controllers\/([^'"]+)['"]/g, to: 'from \'../../controllers/$1\'' },
            { from: /from ['"]\.\.\/\.\.\/controllers\/([^'"]+)['"]/g, to: 'from \'../../controllers/$1\'' }
          ]
          
          patterns.forEach(pattern => {
            if (pattern.from.test(content)) {
              content = content.replace(pattern.from, pattern.to)
              changed = true
            }
          })
          
          if (changed) {
            fs.writeFileSync(filePath, content)
            fixes.push(`Fixed: ${filePath}`)
          }
        } catch (error) {
          fixes.push(`Error: ${filePath} - ${error.message}`)
        }
      }
    })
  })
  
  return fixes
}

// Function to check for missing files and create basic ones
function createMissingFiles() {
  const missingFiles = []
  
  // Check for missing cloudinary config
  if (!fs.existsSync('src/config/cloudinary.js')) {
    const cloudinaryConfig = `import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export { cloudinary, CloudinaryStorage }
export default cloudinary`
    
    fs.writeFileSync('src/config/cloudinary.js', cloudinaryConfig)
    missingFiles.push('Created: src/config/cloudinary.js')
  }
  
  return missingFiles
}

// Run all fixes
console.log('🔧 Running comprehensive fixes...')
const importFixes = fixAllImports()
const missingFileFixes = createMissingFiles()

console.log('\n✅ Import Fixes:')
importFixes.forEach(fix => console.log(`  ${fix}`))

console.log('\n✅ Missing File Fixes:')
missingFileFixes.forEach(fix => console.log(`  ${fix}`))

console.log('\n🎉 All fixes completed!')
