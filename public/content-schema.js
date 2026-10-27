// Shared by the editor and build so a saved job follows the same rules in both.
export function validatePortfolio(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.projects)) {
    throw new Error('O portfólio precisa de uma lista de trabalhos.');
  }
  if (data.projects.length > 100) throw new Error('O limite é de 100 trabalhos.');
  // Contents API returns inline Base64 only for files below 1 MB.
  if (new TextEncoder().encode(JSON.stringify(data, null, 2)).length > 900 * 1024) {
    throw new Error('O conteúdo atingiu o limite de 900 KB. Reduza os textos antes de publicar.');
  }
  const slugs = new Set();
  const text = (value, name, limit, required = false) => {
    if (value === undefined && !required) return;
    if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) {
      throw new Error(`${name}: preencha um texto válido de até ${limit} caracteres.`);
    }
  };
  const image = (value) => {
    if (typeof value !== 'string' || value.includes('..') || value.includes('//') ||
        !/^\/(?:images\/[a-zA-Z0-9_/-]+\.(?:svg|png|jpe?g|webp)|uploads\/[a-zA-Z0-9_/-]+\.(?:png|jpe?g|webp))$/.test(value)) {
      throw new Error('Use uma imagem do portfólio em /images/ ou /uploads/.');
    }
  };
  for (const project of data.projects) {
    if (!project || typeof project !== 'object') throw new Error('Trabalho inválido.');
    if (typeof project.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug) || project.slug.length > 80) {
      throw new Error('O endereço do trabalho deve usar letras minúsculas, números e hífens.');
    }
    if (slugs.has(project.slug)) throw new Error(`Endereço duplicado: ${project.slug}.`);
    slugs.add(project.slug);
    if (!['published', 'demo', 'placeholder'].includes(project.status)) throw new Error('Tipo de trabalho inválido.');
    for (const key of ['title', 'category', 'year']) text(project[key], key, 160, true);
    for (const key of ['subtitle', 'alt']) text(project[key], key, 600, key === 'alt' && project.status !== 'placeholder');
    for (const key of ['intro', 'challenge', 'concept', 'solution', 'note']) text(project[key], key, 6000, key === 'intro');
    text(project.number, 'number', 10);
    text(project.accent, 'accent', 30);
    if (project.status !== 'published' && !project.note?.trim()) throw new Error('Exemplos e reservas precisam de uma nota de contexto.');
    if (project.image !== null || project.status !== 'placeholder') image(project.image);
    for (const key of ['services', 'deliverables']) {
      if (!Array.isArray(project[key]) || project[key].length > 24) throw new Error(`${key}: use uma lista de até 24 itens.`);
      project[key].forEach((value) => text(value, key, 240, true));
    }
    if (project.gallery !== undefined) {
      if (!Array.isArray(project.gallery) || project.gallery.length > 8) throw new Error('Use até 8 imagens na galeria.');
      for (const entry of project.gallery) {
        if (!entry || typeof entry !== 'object') throw new Error('Imagem de galeria inválida.');
        image(entry.image);
        text(entry.alt, 'Descrição da imagem', 600, true);
      }
    }
  }
  return data;
}
