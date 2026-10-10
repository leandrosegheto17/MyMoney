import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import type { ResumoMeta, ResumoOrcamento as Orcamento } from '@mymoney/contrato/respostas/resumo-mes';
import { CartaoMetas } from '../../src/componentes/CartaoMetas';
import { ResumoOrcamento } from '../../src/componentes/ResumoOrcamento';
import { SpriteIcones } from '../../src/componentes/base/SpriteIcones';
import '../../src/estilo/tokens.css';
import '../../src/estilo/global.css';
import './formulario.css';

const ID = (n: number) => `00000000-0000-4000-8000-000000000${n}`;

const orcamento: Orcamento = {
  orcado_centavos: 430000,
  realizado_centavos: 241870,
  percentual: 56,
  situacao: 'dentro',
  destaques: [
    { categoria_id: ID(404), nome: 'Contas da casa', orcado_centavos: 30000, realizado_centavos: 33250, percentual: 111, situacao: 'estourado' },
    { categoria_id: ID(402), nome: 'Delivery/iFood do casal', orcado_centavos: 40000, realizado_centavos: 36800, percentual: 92, situacao: 'atencao' },
    { categoria_id: ID(401), nome: 'Mercado', orcado_centavos: 100000, realizado_centavos: 76820, percentual: 77, situacao: 'dentro' },
  ],
};

const metas: ResumoMeta[] = [
  { meta_id: ID(901), nome: 'Reserva de emergência', alvo_centavos: 3000000, guardado_centavos: 1850000, falta_centavos: 1150000, percentual: 62, prazo: null, mensal_necessario_centavos: null, atingida: false },
  { meta_id: ID(902), nome: 'Viagem Nordeste', alvo_centavos: 1200000, guardado_centavos: 620000, falta_centavos: 580000, percentual: 52, prazo: '2027-07', mensal_necessario_centavos: 64445, atingida: false },
  { meta_id: ID(904), nome: 'Curso de inglês', alvo_centavos: 180000, guardado_centavos: 180000, falta_centavos: 0, percentual: 100, prazo: null, mensal_necessario_centavos: null, atingida: true },
];

const blocos = [
  { bloco: 'casa', orcamento: 'Orçamento da casa', metas: 'Metas da casa', vazioMetas: 'Nenhuma meta da casa.' },
  { bloco: 'eu', orcamento: 'Meu orçamento', metas: 'Minhas metas', vazioMetas: 'Nenhuma meta ainda.' },
] as const;

function Vitrine() {
  return (
    <MemoryRouter>
      <SpriteIcones />
      <main className="vitrine">
        {blocos.map((b) => (
          <section key={b.bloco} aria-label={b.bloco}>
            {[orcamento, null].map((o, i) => (
              <ResumoOrcamento
                key={`o${i}`}
                titulo={o ? b.orcamento : `${b.orcamento} vazio`}
                bloco={b.bloco}
                orcamento={o}
                linkVer="/orcamento"
                textoVer="Ver orçamento"
                textoVazio="Sem orçamento em outubro."
                acaoVazio={<a href="/orcamento">Definir orçamento</a>}
              />
            ))}
            {[metas, []].map((m, i) => (
              <CartaoMetas
                key={`m${i}`}
                titulo={m.length ? b.metas : `${b.metas} vazio`}
                bloco={b.bloco}
                metas={m}
                linkMeta={(id) => `/metas/${id}`}
                textoVazio={b.vazioMetas}
                linkNova="/metas/nova"
              />
            ))}
          </section>
        ))}
      </main>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('raiz') as HTMLElement).render(<Vitrine />);
