import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Fix all import paths in controllers
function fixAllControllerImports() {
  const controllersDir = path.join(__dirname, 'controllers')
  
  function processDirectory(dir, depth = 0) {
    if (!fs.existsSync(dir) || depth > 3) return
    
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        processDirectory(filePath, depth + 1)
      } else if (file.endsWith('.js')) {
        try {
          let content = fs.readFileSync(filePath, 'utf8')
          let changed = false
          
          // Fix model imports
          content = content.replace(/from ['"]\.\.\/models\/([^'"]+)['"]/g, 'from \'../../models/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/models\/([^'"]+)['"]/g, 'from \'../../models/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/models\/([^'"]+)['"]/g, 'from \'../../../models/$1\'')
          
          // Fix middleware imports
          content = content.replace(/from ['"]\.\.\/middleware\/([^'"]+)['"]/g, 'from \'../../middleware/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/middleware\/([^'"]+)['"]/g, 'from \'../../middleware/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/middleware\/([^'"]+)['"]/g, 'from \'../../../middleware/$1\'')
          
          // Fix utils imports
          content = content.replace(/from ['"]\.\.\/utils\/([^'"]+)['"]/g, 'from \'../../utils/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/utils\/([^'"]+)['"]/g, 'from \'../../utils/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/utils\/([^'"]+)['"]/g, 'from \'../../../utils/$1\'')
          
          // Fix service imports
          content = content.replace(/from ['"]\.\.\/services\/([^'"]+)['"]/g, 'from \'../../services/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/services\/([^'"]+)['"]/g, 'from \'../../services/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/services\/([^'"]+)['"]/g, 'from \'../../../services/$1\'')
          
          if (changed) {
            fs.writeFileSync(filePath, content)
            console.log(`✅ Fixed: ${path.relative(__dirname, filePath)}`)
          }
        } catch (error) {
          console.error(`❌ Error fixing ${filePath}:`, error.message)
        }
      }
    })
  }
  
  processDirectory(controllersDir)
}

console.log('🔧 Fixing all controller import paths...')
fixAllControllerImports()
console.log('✅ All controller imports fixed!')
