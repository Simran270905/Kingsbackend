import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const controllersDir = path.join(__dirname, 'src/controllers')

// Function to fix imports in a file
function fixImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    
    // Fix model imports
    content = content.replace(/from ['"]\.\.\/models\/([^'"]+)['"]/g, 'from \'../../models/$1\'')
    content = content.replace(/from ['"]\.\.\/\.\.\/models\/([^'"]+)['"]/g, 'from \'../../models/$1\'')
    
    // Fix middleware imports
    content = content.replace(/from ['"]\.\.\/middleware\/([^'"]+)['"]/g, 'from \'../../middleware/$1\'')
    content = content.replace(/from ['"]\.\.\/\.\.\/middleware\/([^'"]+)['"]/g, 'from \'../../middleware/$1\'')
    
    // Fix utils imports
    content = content.replace(/from ['"]\.\.\/utils\/([^'"]+)['"]/g, 'from \'../../utils/$1\'')
    content = content.replace(/from ['"]\.\.\/\.\.\/utils\/([^'"]+)['"]/g, 'from \'../../utils/$1\'')
    
    // Fix service imports
    content = content.replace(/from ['"]\.\.\/services\/([^'"]+)['"]/g, 'from \'../../services/$1\'')
    content = content.replace(/from ['"]\.\.\/\.\.\/services\/([^'"]+)['"]/g, 'from \'../../services/$1\'')
    
    fs.writeFileSync(filePath, content)
    console.log(`✅ Fixed imports in: ${filePath}`)
  } catch (error) {
    console.error(`❌ Error fixing imports in ${filePath}:`, error.message)
  }
}

// Function to recursively process files
function processDirectory(dir) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      processDirectory(filePath)
    } else if (file.endsWith('.js')) {
      fixImports(filePath)
    }
  })
}

// Start processing
console.log('🔧 Fixing import paths in controllers...')
processDirectory(controllersDir)
console.log('✅ Import path fixing completed!')
