import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankEntry, cleanThemes, filterEntries, isDate, mergeBackup, parseBackup, toMarkdown } from '../src/journal.ts';

const entry = { ...blankEntry('2026-11-14'), id: 'estudo-1', title: 'Oração', body: 'Crescer em comunidade.', passage: 'Atos 2', themes: ['Comunhão'], favorite: true };
const wrap = (entries: unknown[]) => JSON.stringify({ version: 1, entries });

test('busca ignora acentos e combina filtros de tema, data e favoritos', () => {
  assert.deepEqual(filterEntries([entry], 'oracao comunidade', 'comunhao', '2026-11-14', true), [entry]);
  assert.equal(filterEntries([entry], '', '', '2026-11-13').length, 0);
  assert.equal(filterEntries([{ ...entry, favorite: false }], '', '', '', true).length, 0);
});
test('temas são limpos e deduplicados', () => assert.deepEqual(cleanThemes(' Comunhão, , comunhao, Fé '), ['Comunhão', 'Fé']));
test('valida datas reais, incluindo ano bissexto', () => {
  assert.equal(isDate('2028-02-29'), true);
  assert.equal(isDate('2026-02-29'), false);
});
test('backup faz ida e volta e rejeita versão, JSON e campos inválidos', () => {
  assert.deepEqual(parseBackup(wrap([entry])), [entry]);
  assert.throws(() => parseBackup('{'), /JSON/);
  assert.throws(() => parseBackup('{"version":2,"entries":[]}'), /versão/);
  assert.throws(() => parseBackup(wrap([{ ...entry, date: '2026-02-31' }])), /versão/);
});
test('restauração rejeita IDs duplicados e preserva edição local em conflitos', () => {
  assert.throws(() => parseBackup(wrap([entry, entry])), /repetidos/);
  const other = { ...entry, id: 'estudo-2' };
  assert.deepEqual(mergeBackup([entry], [{ ...entry, title: 'Antigo' }, other]), [entry, other]);
});
test('Markdown inclui título, passagem, temas e conteúdo', () => {
  assert.match(toMarkdown([entry]), /## Oração[\s\S]+Atos 2[\s\S]+Comunhão[\s\S]+Crescer em comunidade/);
});
