// Base path detection for subdirectory deployment
const BASE_PATH = window.location.pathname.startsWith('/Latin-Vocab-Shadcn') ? '/Latin-Vocab-Shadcn' : '';

// Helper function to create API URL with base path
function apiUrl(path) {
  return `${BASE_PATH}${path}`;
}

// Update all fetch calls to use apiUrl helper
// Replace fetch('/api/...') with fetch(apiUrl('/api/...'))

// THIS CODE SHOULD BE INSERTED AT THE BEGINNING OF app.js
// And all API calls should be updated to use apiUrl()
