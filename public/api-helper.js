const BASE_PATH = window.location.pathname.startsWith('/Latin-Vocab-Shadcn') ? '/Latin-Vocab-Shadcn' : '';

function apiUrl(path) {
  return `${BASE_PATH}${path}`;
}
