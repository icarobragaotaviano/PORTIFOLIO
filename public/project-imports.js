const PROJECTS_KEY = 'ib_studio_projects_v1';
const JUDO_IMPORT_KEY = 'ib_studio_import_judo_jorge_queiroz_v1';
const JUDO_SLUG = 'judo-jorge-queiroz';

// Import this supplied case once, preserving all local edits and later deletions.
export function importSuppliedProjects(saved, incoming, storage) {
  if (!Array.isArray(saved) || !Array.isArray(incoming)) return saved;

  try {
    if (storage.getItem(JUDO_IMPORT_KEY)) return saved;
  } catch {
    return saved;
  }

  const supplied = incoming.find((project) => project?.slug === JUDO_SLUG);
  if (!supplied) return saved;

  const exists = saved.some((project) => project?.slug === JUDO_SLUG ||
    (supplied.id != null && project?.id === supplied.id));
  if (exists) {
    try { storage.setItem(JUDO_IMPORT_KEY, '1'); } catch {}
    return saved;
  }

  const next = [...saved, supplied];
  try {
    storage.setItem(PROJECTS_KEY, JSON.stringify(next));
  } catch {
    return saved;
  }
  try { storage.setItem(JUDO_IMPORT_KEY, '1'); } catch {}
  return next;
}
