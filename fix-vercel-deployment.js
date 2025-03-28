const fs = require('fs');
const path = require('path');

// Function to create Vercel serverless functions from server.js
function convertServerToFunctions() {
  const serverPath = path.join(__dirname, 'server.js');
  if (!fs.existsSync(serverPath)) {
    console.log('No server.js found. Skipping server conversion.');
    return;
  }

  const serverContent = fs.readFileSync(serverPath, 'utf8');
  const apiDir = path.join(__dirname, 'api');
  if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir);

  // Extract basic Express routes (simplified example)
  const loginRouteMatch = serverContent.match(/app\.(get|post)\(['"]\/api\/login['"],\s*(async\s*)?\(?([^)]*)\)?\s*=>\s*{([^}]*)}/);
  if (loginRouteMatch) {
    const method = loginRouteMatch[1];
    const handlerBody = loginRouteMatch[4];
    const loginFunction = `
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  ${handlerBody}
};
    `;
    fs.writeFileSync(path.join(apiDir, 'login.js'), loginFunction.trim(), 'utf8');
    console.log('Created api/login.js as a serverless function');
  } else {
    console.log('Could not auto-convert server.js routes. Manual conversion needed.');
  }
}

// Function to create vercel.json for static site + serverless functions
function setupVercelConfig() {
  const vercelConfigPath = path.join(__dirname, 'vercel.json');
  const vercelConfig = {
    version: 2,
    builds: [
      { src: 'public/**', use: '@vercel/static' },
      { src: 'api/*.js', use: '@vercel/node' }
    ],
    routes: [
      { src: '/api/(.*)', dest: '/api/$1' },
      { src: '/(.*)', dest: '/public/$1' }
    ]
  };
  if (!fs.existsSync(vercelConfigPath)) {
    fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2), 'utf8');
    console.log('Created vercel.json for static site + serverless functions');
  } else {
    console.log('vercel.json already exists; skipping creation');
  }
}

// Function to check client-side JS for localhost references
function fixClientJs() {
  const appJsPath = path.join(__dirname, 'public', 'app.js');
  if (fs.existsSync(appJsPath)) {
    let content = fs.readFileSync(appJsPath, 'utf8');
    const originalContent = content;
    content = content.replace(/['"]http:\/\/localhost:3000\/api/g, '"/api');
    if (content !== originalContent) {
      fs.writeFileSync(appJsPath, content, 'utf8');
      console.log('Updated localhost references in public/app.js');
    }
  }
}

// Main execution
console.log('Fixing Vercel deployment for static site + serverless...');

// Convert server.js to serverless functions
convertServerToFunctions();

// Setup vercel.json
setupVercelConfig();

// Fix client-side JS
fixClientJs();

console.log('Script complete! Please follow these steps:');
console.log('1. Run `npm install @vercel/node --save-dev` if not already installed.');
console.log('2. Test locally by serving public/ (e.g., `npx serve public`) and checking api/ functions.');
console.log('3. Add environment variables to Vercel dashboard if needed (from .env.local).');
console.log('4. Commit changes: `git add . && git commit -m "Fix Vercel static deployment"`');
console.log('5. Push to GitHub: `git push origin main`');
console.log('6. Verify on Vercel: https://latin-vocab-git-main-tivojns-projects.vercel.app');
