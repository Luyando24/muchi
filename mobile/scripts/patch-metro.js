const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(walk(fullPath));
    } else if (file === 'loadConfig.js') {
      files.push(fullPath);
    }
  }
  return files;
}

const nodeModules = path.join(__dirname, '..', 'node_modules');
console.log(`Searching for loadConfig.js and lightningcss index.js in ${nodeModules}...`);

function walkAll(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(walkAll(fullPath));
    } else if (file === 'loadConfig.js' || (file === 'index.js' && fullPath.includes('lightningcss'))) {
      files.push(fullPath);
    }
  }
  return files;
}

const targetFiles = walkAll(nodeModules);

for (const filepath of targetFiles) {
  let content = fs.readFileSync(filepath, 'utf8');
  if (filepath.endsWith('loadConfig.js')) {
    if (content.includes('await import(absolutePath)') && !content.includes('pathToFileURL')) {
      console.log(`Patching metro-config ${filepath}...`);
      content = content.replace(
        'await import(absolutePath)',
        `await import(absolutePath.startsWith('file://') ? absolutePath : require('url').pathToFileURL(absolutePath).href)`
      );
      fs.writeFileSync(filepath, content, 'utf8');
    } else {
      console.log(`Skipped metro-config: ${filepath}`);
    }
  } else if (filepath.includes('lightningcss') && filepath.endsWith('index.js')) {
    if (content.includes('lightningcss-${parts.join(\'-\')}') && !content.includes('lightningcss-win32-x64-msvc@1.32.0')) {
      console.log(`Patching lightningcss ${filepath}...`);
      content = content.replace(
        /try\s*\{\s*module\.exports\s*=\s*require\(`lightningcss-\$\{parts\.join\('-'\)\}`\);\s*\}\s*catch\s*\(err\)\s*\{\s*module\.exports\s*=\s*require\(`\.\.\/lightningcss\.\$\{parts\.join\('-'\)\}\.node`\);\s*\}/g,
        `try {
    module.exports = require(\`lightningcss-\${parts.join('-')}\`);
  } catch (err) {
    if (process.platform === 'win32') {
      try {
        module.exports = require('c:/Users/User/Desktop/MUCHI/mobile/node_modules/.pnpm/lightningcss-win32-x64-msvc@1.32.0/node_modules/lightningcss-win32-x64-msvc/lightningcss.win32-x64-msvc.node');
      } catch (winErr) {
        module.exports = require(\`../lightningcss.\${parts.join('-')}.node\`);
      }
    } else {
      module.exports = require(\`../lightningcss.\${parts.join('-')}.node\`);
    }
  }`
      );
      fs.writeFileSync(filepath, content, 'utf8');
    } else {
      console.log(`Skipped lightningcss: ${filepath}`);
    }
  }
}
console.log('Patching completed successfully.');
