export type Entry = {
  id: string; date: string; title: string; passage: string; themes: string[]; body: string; favorite: boolean;
};

export const blankEntry = (date: string): Entry => ({ id: '', date, title: '', passage: '', themes: [], body: '', favorite: false });
export const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}+/gu, '').toLocaleLowerCase('pt-BR').trim();

export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value;
}

export function cleanThemes(text: string): string[] {
  const byName = new Map<string, string>();
  for (const part of text.split(',')) {
    const clean = part.trim().slice(0, 40);
    if (clean && !byName.has(normalize(clean))) byName.set(normalize(clean), clean);
  }
  return [...byName.values()].slice(0, 12);
}

function isEntry(value: unknown): value is Entry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === 'string' && /^[a-zA-Z0-9_-]{1,75}$/.test(entry.id)
    && typeof entry.date === 'string' && isDate(entry.date)
    && typeof entry.title === 'string' && entry.title.trim().length > 0 && entry.title.length <= 100
    && typeof entry.passage === 'string' && entry.passage.length <= 160
    && typeof entry.body === 'string' && entry.body.trim().length > 0 && entry.body.length <= 15000
    && typeof entry.favorite === 'boolean' && Array.isArray(entry.themes)
    && entry.themes.length <= 12 && entry.themes.every(theme => typeof theme === 'string' && theme.trim().length && theme.length <= 40);
}

export function parseBackup(source: string): Entry[] {
  if (source.length > 5_000_000) throw new Error('O arquivo excede o limite de 5 MB.');
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error('O arquivo não contém JSON válido.');
  }
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 ||
    !('entries' in value) || !Array.isArray(value.entries) || !value.entries.every(isEntry)) {
    throw new Error('O conteúdo não corresponde a um backup do diário (versão 1).');
  }
  const entries: Entry[] = value.entries;
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) throw new Error('Há identificadores repetidos no backup.');
  return entries.map(({ id, date, title, passage, themes, body, favorite }) => ({ id, date, title, passage, themes, body, favorite }));
}

export function mergeBackup(current: Entry[], restored: Entry[]) {
  const byId = new Map(current.map(entry => [entry.id, entry]));
  for (const entry of restored) if (!byId.has(entry.id)) byId.set(entry.id, entry);
  return [...byId.values()];
}

export function filterEntries(entries: Entry[], query = '', theme = '', day = '', favorites = false) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  return entries.filter(entry => {
    const text = normalize([entry.title, entry.body, entry.passage, ...entry.themes].join(' '));
    return (!day || entry.date === day) && (!favorites || entry.favorite)
      && (!theme || entry.themes.some(item => normalize(item) === normalize(theme)))
      && tokens.every(token => text.includes(token));
  }).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'pt-BR'));
}

export function toMarkdown(entries: Entry[]) {
  const heading = (input: string) => input.replace(/[\r\n]+/g, ' ').replace(/[\\`*_{}\[\]<>#+!|]/g, '\\$&');
  return '# Diário devocional\n\n' + entries.map(entry => [
    '## ' + heading(entry.title), entry.date, entry.passage && '**Passagem:** ' + heading(entry.passage),
    entry.themes.length && '**Temas:** ' + entry.themes.map(heading).join(', '), entry.body,
  ].filter(Boolean).join('\n\n')).join('\n\n---\n\n') + '\n';
}
