import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Botao } from '../../src/componentes/base/Botao';
import { DialogoConfirmacao } from '../../src/componentes/base/DialogoConfirmacao';
import { Folha } from '../../src/componentes/base/Folha';
import { SpriteIcones } from '../../src/componentes/base/SpriteIcones';
import '../../src/estilo/tokens.css';
import '../../src/estilo/global.css';

const TEXTOS = {
  excluir: {
    titulo: 'Excluir esta compra e as 3 parcelas?',
    texto: 'Geladeira nova, R$ 1.950,00 em 3x. A exclusão vale para os dois e não pode ser desfeita.',
    rotuloConfirmar: 'Excluir',
    variante: 'destrutiva',
    iconeConfirmar: 'lixo',
  },
  sair: {
    titulo: 'Sair de todos os aparelhos?',
    texto:
      'Você vai precisar entrar de novo com e-mail e senha em todos os aparelhos, inclusive neste. Lançamentos aguardando envio continuam guardados no aparelho.',
    rotuloConfirmar: 'Sair de todos',
    variante: 'destrutiva',
    iconeConfirmar: 'sair',
  },
  descarte: {
    titulo: 'Descartar ajuste de data?',
    texto:
      'A parcela 3/3 teve a data ajustada à mão (17/11). Ao mudar o valor total, as 3 parcelas são recalculadas pelo vencimento do cartão e esse ajuste será descartado.',
    rotuloConfirmar: 'Recalcular e salvar',
    variante: 'neutra',
    iconeConfirmar: undefined,
  },
} as const;

function Vitrine() {
  const caso = new URLSearchParams(window.location.search).get('caso') as keyof typeof TEXTOS | null;
  const [dialogo, setDialogo] = useState(false);
  const [confirmacoes, setConfirmacoes] = useState(0);
  const dados = TEXTOS[caso ?? 'excluir'] ?? TEXTOS.excluir;
  return (
    <main>
      <h1>Vitrine do Diálogo de confirmação</h1>
      <p role="status">Confirmações: {confirmacoes}</p>
      <Folha aberta aoFechar={() => {}} titulo="Lançamento">
        <Botao variante="secundario" onClick={() => setDialogo(true)}>
          Abrir diálogo
        </Botao>
        <DialogoConfirmacao
          aberto={dialogo}
          {...dados}
          aoConfirmar={() => {
            setConfirmacoes((n) => n + 1);
            setDialogo(false);
          }}
          aoCancelar={() => setDialogo(false)}
        />
      </Folha>
    </main>
  );
}

createRoot(document.getElementById('raiz')!).render(
  <>
    <SpriteIcones />
    <Vitrine />
  </>,
);
