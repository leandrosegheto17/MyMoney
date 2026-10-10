import { readFileSync } from 'node:fs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../dados/consultas/metas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../dados/consultas/metas')>()),
  buscarMeta: vi.fn(),
  buscarMetas: vi.fn(),
}))
vi.mock('../dados/comandos/metas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../dados/comandos/metas')>()),
  salvarMeta: vi.fn(),
}))

import { RegiaoAvisos } from '../componentes/base/RegiaoAvisos'
import { salvarMeta } from '../dados/comandos/metas'
import { buscarMeta } from '../dados/consultas/metas'
import { MetaFormulario } from './MetaFormulario'

const ID_VIAGEM = '00000000-0000-4000-8000-000000000902'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function lerResposta<T>(nome: string): T {
  return JSON.parse(
    readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}.json`, import.meta.url), 'utf8'),
  ) as T
}

function renderizar(caminho: string) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const roteador = createMemoryRouter(
    [
      { path: '/metas', element: <p>Lista de metas</p> },
      { path: '/metas/nova', element: <MetaFormulario /> },
      { path: '/metas/:id/editar', element: <MetaFormulario /> },
      { path: '/metas/:id', element: <p>Detalhe da meta</p> },
    ],
    { initialEntries: [caminho] },
  )
  render(
    <QueryClientProvider client={cliente}>
      <RegiaoAvisos>
        <RouterProvider router={roteador} />
      </RegiaoAvisos>
    </QueryClientProvider>,
  )
  return { roteador, usuario: userEvent.setup() }
}

function prepararEdicao() {
  vi.mocked(buscarMeta).mockResolvedValue(lerResposta<unknown[]>('meta-detalhe')[0] as never)
}

const argumentosSalvar = (i = 0) => vi.mocked(salvarMeta).mock.calls[i][0] as Record<string, unknown>

afterEach(() => {
  vi.clearAllMocks()
})

describe('T12 editar meta', () => {
  it('carrega nome, alvo, prazo e mostra o escopo só como texto', async () => {
    prepararEdicao()
    renderizar(`/metas/${ID_VIAGEM}/editar`)

    expect(await screen.findByLabelText('Nome')).toHaveValue('Viagem Nordeste')
    expect(screen.getByRole('heading', { level: 1, name: 'Editar meta' })).toBeInTheDocument()
    expect(screen.getByLabelText('Valor-alvo')).toHaveValue('R$ 12.000,00')
    expect(screen.getByLabelText('Prazo (opcional)')).toHaveValue('2027-07')
    expect(screen.getByText('Com prazo, o app mostra quanto guardar por mês.')).toBeInTheDocument()
    expect(screen.getByText('Da casa')).toBeInTheDocument()
    expect(
      screen.getByText('O escopo é escolhido na criação e não muda depois, para não expor o histórico.'),
    ).toBeInTheDocument()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para a meta' })).toHaveAttribute(
      'href',
      `/metas/${ID_VIAGEM}`,
    )
  })

  it('salvar envia nome, alvo e prazo, sem escopo', async () => {
    prepararEdicao()
    vi.mocked(salvarMeta).mockResolvedValue(ID_VIAGEM as never)
    const { usuario } = renderizar(`/metas/${ID_VIAGEM}/editar`)

    const nome = await screen.findByLabelText('Nome')
    await usuario.clear(nome)
    await usuario.type(nome, 'Viagem Bahia')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(salvarMeta).toHaveBeenCalledTimes(1))
    const args = argumentosSalvar()
    expect(args).toMatchObject({ id: ID_VIAGEM, nome: 'Viagem Bahia', alvoCentavos: 1200000, prazo: '2027-07' })
    expect(args.escopo).toBeUndefined()
  })

  it('sucesso avisa "Meta salva" e vai para o detalhe', async () => {
    prepararEdicao()
    vi.mocked(salvarMeta).mockResolvedValue(ID_VIAGEM as never)
    const { roteador, usuario } = renderizar(`/metas/${ID_VIAGEM}/editar`)

    await screen.findByLabelText('Nome')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Meta salva')).toBeInTheDocument()
    await waitFor(() => expect(roteador.state.location.pathname).toBe(`/metas/${ID_VIAGEM}`))
    expect(screen.getByText('Detalhe da meta')).toBeInTheDocument()
  })

  it('prazo apagado vai como nulo', async () => {
    prepararEdicao()
    vi.mocked(salvarMeta).mockResolvedValue(ID_VIAGEM as never)
    const { usuario } = renderizar(`/metas/${ID_VIAGEM}/editar`)

    fireEvent.change(await screen.findByLabelText('Prazo (opcional)'), { target: { value: '' } })
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(salvarMeta).toHaveBeenCalledTimes(1))
    expect(argumentosSalvar().prazo).toBeNull()
  })

  it('sem rede avisa, mantém os campos e reenvia com o mesmo id', async () => {
    prepararEdicao()
    vi.mocked(salvarMeta).mockRejectedValueOnce({ tipo: 'rede' }).mockResolvedValueOnce(ID_VIAGEM as never)
    const { roteador, usuario } = renderizar(`/metas/${ID_VIAGEM}/editar`)

    const nome = await screen.findByLabelText('Nome')
    await usuario.clear(nome)
    await usuario.type(nome, 'Viagem Bahia')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(/Sem conexão/)).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Viagem Bahia')
    expect(roteador.state.location.pathname).toBe(`/metas/${ID_VIAGEM}/editar`)

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(salvarMeta).toHaveBeenCalledTimes(2))
    expect(argumentosSalvar(1).id).toBe(argumentosSalvar(0).id)
  })

  it('meta inexistente ou alheia mostra "Esta meta não existe mais"', async () => {
    vi.mocked(buscarMeta).mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' })
    renderizar(`/metas/${ID_VIAGEM}/editar`)

    expect(await screen.findByRole('heading', { name: 'Esta meta não existe mais' })).toBeInTheDocument()
    expect(screen.getByText('Ela pode ter sido excluída.')).toBeInTheDocument()
    const voltar = screen.getAllByRole('link', { name: 'Voltar para Metas' })
    expect(voltar.some((l) => l.getAttribute('href') === '/metas')).toBe(true)
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
  })
})

describe('T12 nova meta', () => {
  it('mostra o escopo como escolha, com "Minha" marcada por padrão', async () => {
    renderizar('/metas/nova')

    expect(await screen.findByRole('heading', { level: 1, name: 'Nova meta' })).toBeInTheDocument()
    const grupo = screen.getByRole('group', { name: 'Escopo' })
    expect(within(grupo).getByRole('radio', { name: 'Minha' })).toBeChecked()
    expect(within(grupo).getByRole('radio', { name: 'Da casa' })).not.toBeChecked()
    expect(
      screen.getByText(
        'Minha: só você vê. Da casa: os dois veem alvo, guardado, aportes e onde está guardado. Não muda depois.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar meta' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para Metas' })).toHaveAttribute('href', '/metas')
    expect(buscarMeta).not.toHaveBeenCalled()
  })

  it('?escopo=casa vem com "Da casa" marcada', async () => {
    renderizar('/metas/nova?escopo=casa')

    expect(await screen.findByRole('radio', { name: 'Da casa' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Minha' })).not.toBeChecked()
  })

  it('?escopo=eu vem com "Minha" marcada', async () => {
    renderizar('/metas/nova?escopo=eu')

    expect(await screen.findByRole('radio', { name: 'Minha' })).toBeChecked()
  })

  it('criar envia nome, alvo, prazo e o escopo escolhido, com id novo', async () => {
    vi.mocked(salvarMeta).mockResolvedValue('ok' as never)
    const { usuario } = renderizar('/metas/nova')

    await usuario.type(await screen.findByLabelText('Nome'), 'Carro novo')
    await usuario.type(screen.getByLabelText('Valor-alvo'), '2000000')
    fireEvent.change(screen.getByLabelText('Prazo (opcional)'), { target: { value: '2028-12' } })
    await usuario.click(screen.getByRole('radio', { name: 'Da casa' }))
    await usuario.click(screen.getByRole('button', { name: 'Criar meta' }))

    await waitFor(() => expect(salvarMeta).toHaveBeenCalledTimes(1))
    const args = argumentosSalvar()
    expect(args).toMatchObject({ nome: 'Carro novo', alvoCentavos: 2000000, prazo: '2028-12', escopo: 'conjunto' })
    expect(String(args.id)).toMatch(UUID)
  })

  it('padrão "Minha" envia escopo individual e prazo vazio vai nulo', async () => {
    vi.mocked(salvarMeta).mockResolvedValue('ok' as never)
    const { usuario } = renderizar('/metas/nova')

    await usuario.type(await screen.findByLabelText('Nome'), 'Notebook')
    await usuario.type(screen.getByLabelText('Valor-alvo'), '600000')
    await usuario.click(screen.getByRole('button', { name: 'Criar meta' }))

    await waitFor(() => expect(salvarMeta).toHaveBeenCalledTimes(1))
    expect(argumentosSalvar()).toMatchObject({ escopo: 'individual', prazo: null })
  })

  it('sucesso na criação avisa e vai para o detalhe da meta nova', async () => {
    vi.mocked(salvarMeta).mockResolvedValue('ok' as never)
    const { roteador, usuario } = renderizar('/metas/nova')

    await usuario.type(await screen.findByLabelText('Nome'), 'Notebook')
    await usuario.type(screen.getByLabelText('Valor-alvo'), '600000')
    await usuario.click(screen.getByRole('button', { name: 'Criar meta' }))

    expect(await screen.findByText('Meta salva')).toBeInTheDocument()
    const id = String(argumentosSalvar().id)
    await waitFor(() => expect(roteador.state.location.pathname).toBe(`/metas/${id}`))
  })

  it('alvo zero mostra o erro no campo e põe o foco nele, sem enviar', async () => {
    const { usuario } = renderizar('/metas/nova')

    await usuario.type(await screen.findByLabelText('Nome'), 'Carro novo')
    fireEvent.change(screen.getByLabelText('Prazo (opcional)'), { target: { value: '2028-12' } })
    await usuario.click(screen.getByRole('button', { name: 'Criar meta' }))

    const alvo = screen.getByLabelText('Valor-alvo')
    expect(await screen.findByText('Informe um valor-alvo maior que zero.')).toBeInTheDocument()
    expect(alvo).toHaveAttribute('id', 'alvo')
    expect(alvo).toHaveAttribute('aria-invalid', 'true')
    expect(alvo.getAttribute('aria-describedby') ?? '').toContain('alvo-erro')
    expect(alvo).toHaveFocus()
    expect(salvarMeta).not.toHaveBeenCalled()
  })

  it('nome vazio mostra erro e põe o foco no nome', async () => {
    const { usuario } = renderizar('/metas/nova')

    await usuario.type(await screen.findByLabelText('Valor-alvo'), '600000')
    await usuario.click(screen.getByRole('button', { name: 'Criar meta' }))

    expect(await screen.findByText('Informe o nome da meta.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveFocus()
    expect(salvarMeta).not.toHaveBeenCalled()
  })

  it('duas tentativas da mesma criação usam o mesmo id', async () => {
    vi.mocked(salvarMeta).mockRejectedValueOnce({ tipo: 'rede' }).mockResolvedValueOnce('ok' as never)
    const { usuario } = renderizar('/metas/nova')

    await usuario.type(await screen.findByLabelText('Nome'), 'Notebook')
    await usuario.type(screen.getByLabelText('Valor-alvo'), '600000')
    await usuario.click(screen.getByRole('button', { name: 'Criar meta' }))
    expect(await screen.findByText(/Sem conexão/)).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Notebook')
    expect(screen.getByLabelText('Valor-alvo')).toHaveValue('R$ 6.000,00')

    await usuario.click(screen.getByRole('button', { name: 'Criar meta' }))
    await waitFor(() => expect(salvarMeta).toHaveBeenCalledTimes(2))
    expect(argumentosSalvar(1).id).toBe(argumentosSalvar(0).id)
  })
})
