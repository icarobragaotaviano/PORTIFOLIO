import { layout } from './templates.mjs';
import { normalizePublicProject, renderPortfolioProject } from '../public/portfolio.js';

/** Server-side page used by both the local server and the publishing endpoint. */
export function portfolioProjectPage(input, base = '/', allProjects = []) {
  const project = normalizePublicProject(input);
  return layout({ base, title: project.title, description: project.description, portfolioCount: allProjects.length || 1, body: renderPortfolioProject(project, base, allProjects) });
}
