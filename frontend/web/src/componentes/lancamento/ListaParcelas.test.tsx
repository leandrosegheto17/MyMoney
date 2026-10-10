import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListaParcelas } from './ListaParcelas';

const RESPOSTAS = new URL('../../../../../.md/mockup/respostas/', import.meta.url);
const ler = (nome: string) =>
  JSON.parse(readFileSync(new URL(nome, RESPOSTAS), 'utf8')) as { parcelas: unknown[]; num_parcelas: number };

const PAGADOR = ler('lancamento-pagador.json');
const OUTRO = ler('lancamento-outro-membro.json');
const ID_PARCELA_2 = '00000000-0000-4000-8000-000000000621';

function renderizar(fonte: typeof PAGADOR, editavel: boolean, onAlterarData = vi.fn().mockResolvedValue(undefined)) {
  render(
    <ListaParcelas
      parcelas={fonte.parcelas as never}
      numParcelas={fonte.num_parcelas}
      editavel={editavel}
      onAlterarData={onAlterarData}
    />,
  );
  const secao = screen.getByRole('region', { name: 'Parcelas' });
  return { secao, onAlterarData };
}

describe('ListaParcelas: pagador no crédito (editável)', () => {
  it('3 itens com k/N, data dd/mm/aaaa e valor', () => {
    const { secao } = renderizar(PAGADOR, true);
    const itens = within(secao).getAllByRole('listitem');
    expect(itens).toHaveLength(3);
    expect(itens[0]).toHaveTextContent('1/3');
    expect(itens[0]).toHaveTextContent('10/09/2026');
    expect(itens[0]).toHaveTextContent('R$ 650,00');
    expect(itens[1]).toHaveTextContent('2/3');
    expect(itens[1]).toHaveTextContent('10/10/2026');
    expect(itens[2]).toHaveTextContent('3/3');
    expect(itens[2]).toHaveTextContent('17/11/2026');
  });

  it('3 botões "Alterar data da parcela k de 3", do tipo button', () => {
    renderizar(PAGADOR, true);
    for (const k of [1, 2, 3]) {
      const botao = screen.getByRole('button', { name: `Alterar data da parcela ${k} de 3` });
      expect(botao).toHaveAttribute('type', 'button');
      expect(botao).toHaveTextContent('Alterar data');
    }
  });

  it('selo "data ajustada" só na 3/3', () => {
    const { secao } = renderizar(PAGADOR, true);
    const itens = within(secao).getAllByRole('listitem');
    expect(itens[0]).not.toHaveTextContent('data ajustada');
    expect(itens[1]).not.toHaveTextContent('data ajustada');
    expect(itens[2]).toHaveTextContent('data ajustada');
  });

  it('escolher a data chama onAlterarData com o id da parcela e a data', async () => {
    const { onAlterarData } = renderizar(PAGADOR, true);
    const botao = screen.getByRole('button', { name: 'Alterar data da parcela 2 de 3' });
    fireEvent.click(botao);

    const linha = botao.closest('li') as HTMLElement;
    const campo = linha.querySelector('input[type="date"]') as HTMLInputElement;
    expect(campo).not.toBeNull();
    fireEvent.change(campo, { target: { value: '2026-11-05' } });

    await waitFor(() => expect(onAlterarData).toHaveBeenCalledWith(ID_PARCELA_2, '2026-11-05'));
    expect(onAlterarData).toHaveBeenCalledTimes(1);
  });

  it('enquanto salva, o controle da linha fica ocupado', async () => {
    let resolver: () => void = () => {};
    const onAlterarData = vi.fn(() => new Promise<void>((r) => (resolver = r)));
    renderizar(PAGADOR, true, onAlterarData);
    const botao = screen.getByRole('button', { name: 'Alterar data da parcela 2 de 3' });
    fireEvent.click(botao);
    const campo = (botao.closest('li') as HTMLElement).querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(campo, { target: { value: '2026-11-05' } });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Alterar data da parcela 2 de 3' })).toHaveAttribute(
        'aria-disabled',
        'true',
      ),
    );
    resolver();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Alterar data da parcela 2 de 3' })).not.toHaveAttribute(
        'aria-disabled',
        'true',
      ),
    );
  });
});

describe('ListaParcelas: outro membro (só leitura)', () => {
  it('nenhum botão nem selo', () => {
    const { secao } = renderizar(OUTRO, false);
    expect(within(secao).queryAllByRole('button')).toHaveLength(0);
    expect(secao).not.toHaveTextContent('data ajustada');
    expect(secao).not.toHaveTextContent('Alterar data');
    expect(secao.querySelector('input')).toBeNull();
  });

  it('continua mostrando k/N, data e valor', () => {
    const { secao } = renderizar(OUTRO, false);
    const itens = within(secao).getAllByRole('listitem');
    expect(itens).toHaveLength(3);
    expect(itens[2]).toHaveTextContent('3/3');
    expect(itens[2]).toHaveTextContent('17/11/2026');
    expect(itens[2]).toHaveTextContent('R$ 650,00');
  });

  it('mesmo com data_ajustada na resposta, não editável não mostra selo', () => {
    const { secao } = renderizar(PAGADOR, false);
    expect(within(secao).queryAllByRole('button')).toHaveLength(0);
    expect(secao).not.toHaveTextContent('data ajustada');
  });
});
