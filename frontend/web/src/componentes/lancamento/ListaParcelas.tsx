import type { Lancamento } from '@mymoney/contrato/respostas/lancamento';
import { useId, useRef, useState } from 'react';
import { formatarData } from '../../formatacao/data';
import { formatarMoeda } from '../../formatacao/moeda';
import { Botao } from '../base/Botao';
import { CampoData } from '../base/CampoData';
import { SeloSituacao } from '../base/SeloSituacao';
import estilo from './ListaParcelas.module.css';

type Parcela = Lancamento['parcelas'][number];

interface Props {
  parcelas: Lancamento['parcelas'];
  numParcelas: number;
  /** Quem pagou no crédito pode ajustar a data de cada parcela; o servidor decide de fato. */
  editavel: boolean;
  onAlterarData: (parcelaId: string, data: string) => Promise<void>;
}

const ajustada = (p: Parcela): boolean => 'data_ajustada' in p && p.data_ajustada === true;

/** Parcelas da compra (número, data e valor); com `editavel`, cada uma tem "Alterar data". */
export function ListaParcelas({ parcelas, numParcelas, editavel, onAlterarData }: Props) {
  const idTitulo = useId();
  const [aberta, setAberta] = useState<string | null>(null);
  const campos = useRef(new Map<string, HTMLInputElement>());
  const [salvando, setSalvando] = useState<string | null>(null);

  /** Seletor nativo quando o navegador deixa; senão o campo de data da linha aparece e recebe o foco. */
  function abrir(id: string) {
    const campo = campos.current.get(id);
    setAberta(id);
    try {
      if (typeof campo?.showPicker === 'function') campo.showPicker();
      else campo?.focus();
    } catch {
      campo?.focus();
    }
  }

  async function escolher(p: Parcela, data: string) {
    setAberta(null);
    if (data === '' || data === p.data) return;
    setSalvando(p.id);
    try {
      await onAlterarData(p.id, data);
    } finally {
      setSalvando(null);
    }
  }

  return (
    <section className={estilo.secao} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={estilo.titulo}>
        Parcelas
      </h2>
      <ul className={estilo.lista}>
        {parcelas.map((p) => {
          const rotulo = `${p.numero} de ${numParcelas}`;
          return (
            <li key={p.id}>
              <span className="valor texto-2">
                {p.numero}/{numParcelas}
              </span>
              {editavel ? (
                <>
                  <span className={estilo.info}>
                    <span className="valor">{formatarData(p.data)}</span>
                    {ajustada(p) ? (
                      <span className={estilo.sub}>
                        <SeloSituacao situacao="ajustada" />
                      </span>
                    ) : null}
                  </span>
                  <span className={estilo.direita}>
                    <span className="valor">{formatarMoeda(p.valor_centavos)}</span>
                    <Botao
                      variante="texto"
                      icone="calendario"
                      aria-label={`Alterar data da parcela ${rotulo}`}
                      salvando={salvando === p.id}
                      rotuloOcupado="Salvando…"
                      onClick={() => abrir(p.id)}
                    >
                      Alterar data
                    </Botao>
                  </span>
                  <div className={aberta === p.id ? estilo.seletor : estilo.seletorOculto}>
                    <CampoData
                      rotulo={`Nova data da parcela ${rotulo}`}
                      defaultValue={p.data}
                      tabIndex={aberta === p.id ? undefined : -1}
                      ref={(el) => {
                        if (el) campos.current.set(p.id, el);
                        else campos.current.delete(p.id);
                      }}
                      onChange={(e) => void escolher(p, e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <span className="valor">{formatarData(p.data)}</span>
                  <span className="valor">{formatarMoeda(p.valor_centavos)}</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
