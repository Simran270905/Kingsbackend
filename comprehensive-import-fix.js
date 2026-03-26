import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Function to scan and fix all imports
function fixAllImports() {
  const jsFiles = []
  
  // Find all JS files recursively
  function findJSFiles(dir) {
    if (!fs.existsSync(dir)) return
    
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        findJSFiles(filePath)
      } else if (file.endsWith('.js')) {
        jsFiles.push(filePath)
      }
    })
  }
  
  findJSFiles(__dirname)
  
  console.log(`🔍 Found ${jsFiles.length} JavaScript files`)
  
  let fixedFiles = 0
  
  jsFiles.forEach(filePath => {
    try {
      let content = fs.readFileSync(filePath, 'utf8')
      let changed = false
      
      // Fix utils imports (most common issue)
      if (content.includes('../utils/')) {
        content = content.replace(/from ['"]\.\.\/\.\.\/utils\/([^'"]+)['"]/g, 'from \'../utils/$1\'')
        changed = true
      }
      
      // Fix utils imports with different depths
      if (content.includes('../../utils/')) {
        content = content.replace(/from ['"]\.\.\/\.\.\/utils\/([^'"]+)['"]/g, 'from \'../../utils/$1\'')
        changed = true
      }
      
      // Fix controller imports
      if (content.includes('../controllers/')) {
        content = content.replace(/from ['"]\.\.\/\.\.\/controllers\/([^'"]+)['"]/g, 'from \'../controllers/$1\'')
        changed = true
      }
      
      // Fix middleware imports
      if (content.includes('../middleware/')) {
        content = content.replace(/from ['"]\.\.\/\.\.\/middleware\/([^'"]+)['"]/g, 'from \'../middleware/$1\'')
        changed = true
      }
      
      // Fix model imports
      if (content.includes('../models/')) {
        content = content.replace(/from ['"]\.\.\/\.\.\/models\/([^'"]+)['"]/g, 'from \'../models/$1\'')
        changed = true
      }
      
      // Fix config imports
      if (content.includes('../config/')) {
        content = content.replace(/from ['"]\.\.\/\.\.\/config\/([^'"]+)['"]/g, 'from \'../config/$1\'')
        changed = true
      }
      
      // Fix service imports
      if (content.includes('../services/')) {
        content = content.replace(/from ['"]\.\.\/\.\.\/services\/([^'"]+)['"]/g, 'from \'../services/$1\'')
        changed = true
      }
      
      // Fix src imports (remove src prefix)
      content = content.replace(/from ['"]\.\/src\/([^'"]+)['"]/g, 'from \'./$1\'')
      content = content.replace(/from ['"]\.\.\/src\/([^'"]+)['"]/g, 'from \'../$1\'')
      content = content.replace(/from ['"]\.\.\/\.\.\/src\/([^'"]+)['"]/g, 'from \'../../$1\'')
      
      // Fix absolute src imports
      content = content.replace(/from ['"]src\/([^'"]+)['"]/g, 'from \'./$1\'')
      
      if (changed) {
        fs.writeFileSync(filePath, content)
        fixedFiles++
        console.log(`✅ Fixed: ${path.relative(__dirname, filePath)}`)
      }
    } catch (error) {
      console.error(`❌ Error fixing ${filePath}:`, error.message)
    }
  })
  
  console.log(`\n🎉 Fixed ${fixedFiles} files out of ${jsFiles.length} total`)
}

// Function to check server-minimal.js imports
function checkMinimalServer() {
  const minimalServerPath = path.join(__dirname, 'server-minimal.js')
  
  if (!fs.existsSync(minimalServerPath)) {
    console.log('❌ server-minimal.js not found')
    return
  }
  
  try {
    const content = fs.readFileSync(minimalServerPath, 'utf8')
    const imports = content.match(/import.*from\s+['"][^'"]+['"]/g) || []
    
    console.log('\n🔍 Checking server-minimal.js imports:')
    imports.forEach(imp => console.log(`   ${imp}`))
    
    // Check for any problematic imports
    const problematicImports = imports.filter(imp => 
      imp.includes('src/') || 
      imp.includes('../../utils/') ||
      imp.includes('../../controllers/') ||
      imp.includes('../../middleware/') ||
      imp.includes('../../models/') ||
      imp.includes('../../config/') ||
      imp.includes('../../services/')
    )
    
    if (problematicImports.length > 0) {
      console.log('\n❌ Problematic imports found in server-minimal.js:')
      problematicImports.forEach(imp => console.log(`   ${imp}`))
      
      // Fix server-minimal.js
      let fixedContent = content
      fixedContent = fixedContent.replace(/from ['"]\.\.\/\.\.\/utils\/([^'"]+)['"]/g, 'from \'./utils/$1\'')
      fixedContent = fixedContent.replace(/from ['"]\.\.\/\.\.\/controllers\/([^'"]+)['"]/g, 'from \'./controllers/$1\'')
      fixedContent = fixedContent.replace(/from ['"]\.\.\/\.\.\/middleware\/([^'"]+)['"]/g, 'from \'./middleware/$1\'')
      fixedContent = fixedContent.replace(/from ['"]\.\.\/\.\.\/models\/([^'"]+)['"]/g, 'from \'./models/$1\'')
      fixedContent = fixedContent.replace(/from ['"]\.\.\/\.\.\/config\/([^'"]+)['"]/g, 'from \'./config/$1\'')
      
      fs.writeFileSync(minimalServerPath, fixedContent)
      console.log('✅ Fixed server-minimal.js imports')
    } else {
      console.log('✅ No problematic imports found in server-minimal.js')
    }
  } catch (error) {
    console.error('❌ Error checking server-minimal.js:', error.message)
  }
}

// Run all fixes
console.log('🔧 Starting comprehensive import fix...')
checkMinimalServer()
fixAllImports()

console.log('\n🚀 All import fixes completed!')
