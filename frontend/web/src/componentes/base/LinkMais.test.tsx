import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { LinkMais } from './LinkMais';

const classe = (nome: string) => new RegExp(`(^|\\s|_)${nome}(_|\\s|$)`);

describe('LinkMais', () => {
  it('variante link aponta para a rota', () => {
    render(
      <MemoryRouter>
        <LinkMais para="/entrar">Voltar para Entrar</LinkMais>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Voltar para Entrar' });
    expect(link).toHaveAttribute('href', '/entrar');
    expect(link.className).toMatch(classe('link-mais'));
  });

  it('variante botão chama o callback', async () => {
    const aoClicar = vi.fn();
    const user = userEvent.setup();
    render(<LinkMais aoClicar={aoClicar}>Esqueci minha senha</LinkMais>);

    const botao = screen.getByRole('button', { name: 'Esqueci minha senha' });
    expect(botao).toHaveAttribute('type', 'button');
    expect(botao.className).toMatch(classe('link-mais'));
    await user.click(botao);
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it('sem style inline', () => {
    const { container } = render(<LinkMais aoClicar={vi.fn()}>Esqueci minha senha</LinkMais>);

    expect(container.querySelector('[style]')).toBeNull();
  });
});
