import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rotas } from '../../rotas';

function estaOculta(el: HTMLElement): boolean {
  for (let atual: HTMLElement | null = el; atual; atual = atual.parentElement) {
    if (atual.hidden || atual.getAttribute('aria-hidden') === 'true' || atual.hasAttribute('inert')) return true;
    const estilo = getComputedStyle(atual);
    if (estilo.display === 'none' || estilo.visibility === 'hidden') return true;
  }
  return false;
}

async function montar() {
  const router = createMemoryRouter(rotas, { initialEntries: ['/ensaio-teclado'] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: 'Ensaio do teclado' });
  return {
    folha: () => screen.getByRole('dialog', { hidden: true }),
    campo: () => screen.getByLabelText('Valor') as HTMLInputElement,
    mais: () => screen.getByRole('button', { name: 'Lançar' }),
    botao: (nome: string) => screen.getByRole('button', { name: nome, hidden: true }),
  };
}

let fetchEspiao: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchEspiao = vi.fn();
  vi.stubGlobal('fetch', fetchEspiao);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('EnsaioTeclado', () => {
  it('ao abrir, a folha já está montada e oculta, com o campo numérico', async () => {
    const t = await montar();
    expect(t.folha()).toBeInTheDocument();
    expect(estaOculta(t.folha())).toBe(true);
    const campo = screen.getByLabelText('Valor', { selector: 'input' }) as HTMLInputElement;
    expect(campo).toHaveAttribute('inputmode', 'numeric');
    expect(campo.type).toBe('text');
  });

  it('o "+" mostra a folha e foca o campo no mesmo handler síncrono', async () => {
    const t = await montar();
    const foco = vi.spyOn(HTMLElement.prototype, 'focus');

    fireEvent.click(t.mais());

    expect(foco).toHaveBeenCalled();
    expect(document.activeElement).toBe(t.campo());
    expect(estaOculta(t.folha())).toBe(false);
    expect(screen.getByText(/foco no campo: sim/i)).toBeInTheDocument();
  });

  it('conta as tentativas e o "Zerar" volta a 0', async () => {
    const t = await montar();
    for (let i = 0; i < 3; i++) {
      fireEvent.click(t.mais());
      fireEvent.click(t.botao('Fechar'));
    }
    expect(screen.getByText(/\b3 tentativas\b/)).toBeInTheDocument();

    fireEvent.click(t.botao('Zerar'));
    expect(screen.getByText(/\b0 tentativas\b/)).toBeInTheDocument();
  });

  it.each(['Fechar', 'Salvar (simulado)'])('"%s" oculta a folha, limpa o campo e um novo "+" foca de novo', async (nome) => {
    const t = await montar();
    fireEvent.click(t.mais());
    fireEvent.change(t.campo(), { target: { value: '4590' } });

    fireEvent.click(t.botao(nome));

    expect(estaOculta(t.folha())).toBe(true);
    expect(t.campo().value).toBe('');
    expect(document.activeElement).not.toBe(t.campo());

    fireEvent.click(t.mais());
    expect(document.activeElement).toBe(t.campo());
    expect(estaOculta(t.folha())).toBe(false);
  });

  it('"Salvar (simulado)" soma um lançamento simulado', async () => {
    const t = await montar();
    fireEvent.click(t.mais());
    fireEvent.click(t.botao('Salvar (simulado)'));
    expect(screen.getByText(/lançamentos simulados/i)).toHaveTextContent('1');
  });

  it('o contador fica numa região aria-live polite', async () => {
    await montar();
    const regiao = screen.getByText(/tentativas/).closest('[aria-live]');
    expect(regiao).toHaveAttribute('aria-live', 'polite');
  });

  it('nenhuma chamada de rede em todo o fluxo', async () => {
    const t = await montar();
    fireEvent.click(t.mais());
    fireEvent.change(t.campo(), { target: { value: '100' } });
    fireEvent.click(t.botao('Salvar (simulado)'));
    fireEvent.click(t.mais());
    fireEvent.click(t.botao('Fechar'));
    fireEvent.click(t.botao('Zerar'));
    expect(fetchEspiao).not.toHaveBeenCalled();
  });
});
