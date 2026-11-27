import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <a className="skip" href="#conteudo">Ir para o conteúdo</a>
    <header className="masthead">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">≡</span>
        <span>Diário devocional</span>
      </div>
      <span className="collection">Coleção de estudo bíblico</span>
    </header>
    <main id="conteudo" tabIndex={-1}>
      <div className="intro">
        <h1>Diário devocional</h1>
        <nav className="atalhos" aria-label="Seções desta página">
          <a href="#editor">Escrever</a>
          <a href="#calendario">Calendário</a>
          <a href="#registros">Registros</a>
        </nav>
      </div>
      <App />
    </main>
  </StrictMode>,
);
