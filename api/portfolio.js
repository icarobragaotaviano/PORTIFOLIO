import { createPortfolioAccess } from '../server/portfolio-access.js';
import { createPortfolioHome, createPortfolioPage } from '../server/portfolio-page.js';

const access = createPortfolioAccess();
const page = createPortfolioPage({ access });
const home = createPortfolioHome({ access });
const read = request => {
  const url = new URL(request.url);
  if (url.searchParams.get('action') === 'home' || ['/', '/index.html'].includes(url.pathname)) return home(request);
  return url.searchParams.get('action') === 'page' || url.pathname.startsWith('/projetos/') ? page(request) : access(request);
};

export async function GET(request) { return read(request); }
export async function HEAD(request) { return read(request); }
export async function POST(request) { return access(request); }
export async function PUT(request) { return access(request); }
export async function DELETE(request) { return access(request); }
