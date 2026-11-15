import { useState } from 'react';
import type { FormEvent } from 'react';
import { dateKey, monthDays } from './dates.ts';
import { download } from './download.ts';
import { blankEntry, cleanThemes, filterEntries, isDate, mergeBackup, parseBackup, parseStoredEntries, toMarkdown } from './journal.ts';
import type { Entry } from './journal.ts';
import { useLocalState } from './storage.ts';

export default function App() {
  const today = dateKey();
  const [entries, setEntries, storageError] = useLocalState<Entry[]>('devocional-v1', [], parseStoredEntries);
  const [draft, setDraft] = useState(() => blankEntry(today));
  const [rawThemes, setThemes] = useState('');
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [favorites, setFavorites] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState('');
  const shown = filterEntries(entries, query, theme, day, favorites);
  const themes = cleanThemes(entries.flatMap(entry => entry.themes).join(','));
  const dates = monthDays(month);
  const offset = (new Date(dates[0] + 'T12:00:00').getDay() + 6) % 7;
  const markedDates = new Set(entries.map(entry => entry.date));

  function edit(entry: Entry) {
    setDraft(entry);
    setThemes(entry.themes.join(', '));
    setError('');
    setStatus('');
    setRemoving('');
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.body.trim() || !isDate(draft.date)) {
      setError('Preencha o título, o texto e uma data válida.');
      return;
    }
    const entry = { ...draft, id: draft.id || crypto.randomUUID(), title: draft.title.trim(), themes: cleanThemes(rawThemes) };
    setEntries(previous => [...previous.filter(item => item.id !== entry.id), entry]);
    setDraft(entry);
    setMonth(entry.date.slice(0, 7));
    setDay('');
    setError('');
    setStatus('Registro salvo no navegador.');
  }

  function favorite(entry: Entry) {
    setEntries(previous => previous.map(item => item.id === entry.id ? { ...item, favorite: !item.favorite } : item));
    if (draft.id === entry.id) setDraft(previous => ({ ...previous, favorite: !entry.favorite }));
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    setError('');
    setStatus('');
    try {
      if (file.size > 5_000_000) throw new Error('O arquivo excede o limite de 5 MB.');
      const restored = parseBackup(await file.text());
      setEntries(previous => mergeBackup(previous, restored));
      setStatus('Backup mesclado. Registros existentes foram preservados.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível ler o backup.');
    }
  }

  return <div className="split">
    <section className="panel stack">
      <div className="row between">
        <h2>{draft.id ? 'Editar registro' : 'Novo registro'}</h2>
        {draft.id && <button onClick={() => edit(blankEntry(today))}>Novo registro</button>}
      </div>
      <form className="form" onSubmit={save}>
        <div className="two collapse">
          <label>Título<input required maxLength={100} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
          <label>Data<input type="date" required value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label>
        </div>
        <label>Referência bíblica<input maxLength={160} value={draft.passage} onChange={e => setDraft({ ...draft, passage: e.target.value })} /></label>
        <label>Temas separados por vírgula<input maxLength={400} value={rawThemes} onChange={e => setThemes(e.target.value)} /></label>
        <label>Anotação<textarea className="journal-body" required maxLength={15000} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} /></label>
        <button className="primary">Salvar registro</button>
      </form>
      {(error || storageError) && <p role="alert" className="error">{error || storageError}</p>}
      {status && <p role="status">{status}</p>}
      <details>
        <summary>Exportação e backup</summary>
        <div className="stack">
          <p className="muted">Os arquivos baixados contêm o texto das anotações. A restauração adiciona somente registros inéditos.</p>
          <div className="row">
            <button disabled={!shown.length} onClick={() => download('devocional.md', toMarkdown(shown), 'text/markdown')}>Exportar resultados em Markdown</button>
            <button onClick={() => download('devocional-backup.json', JSON.stringify({ version: 1, entries }, null, 2), 'application/json')}>Baixar backup</button>
          </div>
          <label>Restaurar backup JSON<input type="file" accept=".json,application/json" onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = '';
            void restore(file);
          }} /></label>
        </div>
      </details>
    </section>
    <aside className="stack">
      <section className="panel stack">
        <label>Mês dos registros<input type="month" value={month} onChange={e => {
          if (/^\d{4}-\d{2}$/.test(e.target.value)) {
            setMonth(e.target.value);
            setDay('');
          }
        }} /></label>
        <div className="calendar" aria-label="Calendário do diário">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(label => <small key={label}>{label}</small>)}
          {Array.from({ length: offset }, (_, index) => <span key={index} />)}
          {dates.map(date => <button key={date} className={markedDates.has(date) ? 'marked-day' : ''}
            aria-label={date + (markedDates.has(date) ? ', com registro' : '')} aria-pressed={day === date} onClick={() => setDay(day === date ? '' : date)}>{Number(date.slice(-2))}</button>)}
        </div>
        {day && <button onClick={() => setDay('')}>Limpar filtro de data</button>}
      </section>
      <section className="panel stack">
        <h2>Registros</h2>
        <label>Pesquisar<input type="search" placeholder="Título, tema, passagem ou anotação" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <label>Filtrar tema<select value={theme} onChange={e => setTheme(e.target.value)}>
          <option value="">Todos os temas</option>{themes.map(item => <option key={item}>{item}</option>)}
        </select></label>
        <label className="check"><input type="checkbox" checked={favorites} onChange={e => setFavorites(e.target.checked)} /> Somente favoritos</label>
        {!shown.length && <p className="muted">Nenhum registro para os filtros atuais.</p>}
        <ul className="list">{shown.map(entry => <li className="subtle stack" key={entry.id}>
          <div><strong>{entry.title}</strong><p className="muted">{entry.date.split('-').reverse().join('/')} {entry.passage && '· ' + entry.passage}</p></div>
          {entry.themes.length > 0 && <div className="tags">{entry.themes.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>}
          <p>{entry.body.length > 180 ? entry.body.slice(0, 180) + '…' : entry.body}</p>
          <div className="row">
            <button onClick={() => edit(entry)}>Editar</button>
            <button aria-pressed={entry.favorite} onClick={() => favorite(entry)}>Favorito</button>
            {removing === entry.id ? <>
              <button className="danger" onClick={() => {
                setEntries(previous => previous.filter(item => item.id !== entry.id));
                if (draft.id === entry.id) edit(blankEntry(today));
                setRemoving('');
              }}>Confirmar exclusão</button>
              <button onClick={() => setRemoving('')}>Cancelar</button>
            </> : <button className="quiet danger" onClick={() => setRemoving(entry.id)}>Excluir</button>}
          </div>
        </li>)}</ul>
      </section>
    </aside>
  </div>;
}
