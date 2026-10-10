import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SeletorMes } from '../../src/componentes/SeletorMes';
import { SpriteIcones } from '../../src/componentes/base/SpriteIcones';
import { escreverMesNaUrl, lerMesDaUrl } from '../../src/formatacao/mes';
import '../../src/estilo/tokens.css';
import '../../src/estilo/global.css';
import './formulario.css';

function mudarMesNaUrl(mes: string) {
  const params = escreverMesNaUrl(new URLSearchParams(window.location.search), mes);
  window.history.replaceState(null, '', `?${params.toString()}`);
}

function Vitrine() {
  const [mes, setMes] = useState(lerMesDaUrl(new URLSearchParams(window.location.search)) ?? '2026-10');

  function aoMudar(novo: string) {
    setMes(novo);
    mudarMesNaUrl(novo);
  }

  return (
    <>
      <SpriteIcones />
      <main className="vitrine">
        <SeletorMes mes={mes} aoMudar={aoMudar} prefixoOculto="Período: " />
      </main>
    </>
  );
}

createRoot(document.getElementById('raiz') as HTMLElement).render(<Vitrine />);
