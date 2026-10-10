import { readFileSync } from 'node:fs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../dados/consultas/metas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../dados/consultas/metas')>()),
  buscarMetas: vi.fn(),
}))

import { buscarMetas } from '../dados/consultas/metas'
import { Metas } from './Metas'

type LinhaMeta = Record<string, unknown> & { escopo: string }

function lerResposta<T>(nome: string): T {
  return JSON.parse(
    readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}.json`, import.meta.url), 'utf8'),
  ) as T
}

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={['/metas']}>
        <Metas />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { cliente }
}

const secao = (nome: string) => screen.getByRole('region', { name: nome })

afterEach(() => {
  vi.clearAllMocks()
})

describe('T10 Metas: sucesso', () => {
  it('separa "Da casa" e "Minhas" na ordem da API', async () => {
    vi.mocked(buscarMetas).mockResolvedValue(lerResposta('metas'))
    renderizar()

    const casa = await screen.findByRole('region', { name: 'Da casa' })
    const minhas = secao('Minhas')
    expect(within(casa).getAllByRole('link').map((l) => l.textContent)).toEqual([
      expect.stringContaining('Reserva de emergência'),
      expect.stringContaining('Viagem Nordeste'),
    ])
    expect(within(minhas).getAllByRole('link').map((l) => l.textContent)).toEqual([
      expect.stringContaining('Notebook novo'),
      expect.stringContaining('Curso de inglês'),
    ])
    expect(screen.getByRole('heading', { level: 1, name: 'Metas' })).toBeInTheDocument()
  })

  it('cartão com prazo mostra guardado, falta, % e valor mensal vindos da API', async () => {
    vi.mocked(buscarMetas).mockResolvedValue(lerResposta('metas'))
    renderizar()

    const cartao = await screen.findByRole('link', { name: /Viagem Nordeste/ })
    expect(within(cartao).getByText('52%')).toBeInTheDocument()
    expect(within(cartao).getByText('Guardado R$ 6.200,00 de R$ 12.000,00')).toBeInTheDocument()
    expect(within(cartao).getByText('Faltam R$ 5.800,00')).toBeInTheDocument()
    expect(within(cartao).getByText('Até jul/2027 · R$ 644,45 por mês')).toBeInTheDocument()
    const barra = within(cartao).getByRole('progressbar', { name: 'Viagem Nordeste' })
    expect(barra).toHaveAttribute('aria-valuenow', '52')
    expect(barra.className).toMatch(/barra-casa/)
    expect(cartao).toHaveAttribute('href', '/metas/00000000-0000-4000-8000-000000000902')
  })

  it('cartão sem prazo mostra "Sem prazo"', async () => {
    vi.mocked(buscarMetas).mockResolvedValue(lerResposta('metas'))
    renderizar()

    const cartao = await screen.findByRole('link', { name: /Reserva de emergência/ })
    expect(within(cartao).getByText('62%')).toBeInTheDocument()
    expect(within(cartao).getByText('Faltam R$ 11.500,00')).toBeInTheDocument()
    expect(within(cartao).getByText('Sem prazo')).toBeInTheDocument()
    expect(cartao).toHaveAttribute('href', '/metas/00000000-0000-4000-8000-000000000901')
  })

  it('meta individual usa a barra "eu"', async () => {
    vi.mocked(buscarMetas).mockResolvedValue(lerResposta('metas'))
    renderizar()

    const cartao = await screen.findByRole('link', { name: /Notebook novo/ })
    expect(within(cartao).getByRole('progressbar', { name: 'Notebook novo' }).className).toMatch(/barra-eu/)
  })

  it('meta atingida tem selo "Atingida", barra "dentro" e "100%" na linha final', async () => {
    vi.mocked(buscarMetas).mockResolvedValue(lerResposta('metas'))
    renderizar()

    const cartao = await screen.findByRole('link', { name: /Curso de inglês/ })
    expect(within(cartao).getByText('Atingida')).toBeInTheDocument()
    expect(within(cartao).getByText('100%')).toBeInTheDocument()
    expect(within(cartao).getByText('Faltam R$ 0,00')).toBeInTheDocument()
    const barra = within(cartao).getByRole('progressbar', { name: 'Curso de inglês' })
    expect(barra).toHaveAttribute('aria-valuenow', '100')
    expect(barra.className).toMatch(/barra-dentro/)
  })

  it('não recalcula: mostra exatamente os números recebidos', async () => {
    const metas = lerResposta<LinhaMeta[]>('metas')
    metas[1] = { ...metas[1], percentual: 7, falta_centavos: 1, mensal_necessario_centavos: 2 }
    vi.mocked(buscarMetas).mockResolvedValue(metas as never)
    renderizar()

    const cartao = await screen.findByRole('link', { name: /Viagem Nordeste/ })
    expect(within(cartao).getByText('7%')).toBeInTheDocument()
    expect(within(cartao).getByText('Faltam R$ 0,01')).toBeInTheDocument()
    expect(within(cartao).getByText('Até jul/2027 · R$ 0,02 por mês')).toBeInTheDocument()
    expect(within(cartao).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '7')
  })

  it('"Nova meta" no cabeçalho leva ao formulário', async () => {
    vi.mocked(buscarMetas).mockResolvedValue(lerResposta('metas'))
    renderizar()

    expect(await screen.findByRole('link', { name: 'Nova meta' })).toHaveAttribute('href', '/metas/nova')
  })
})

describe('T10 Metas: vazio', () => {
  it('sem metas mostra o estado de cada seção com o escopo no link', async () => {
    vi.mocked(buscarMetas).mockResolvedValue(lerResposta('metas-vazio'))
    renderizar()

    const casa = await screen.findByRole('region', { name: 'Da casa' })
    const minhas = secao('Minhas')
    expect(
      within(casa).getByText(
        'Nenhuma meta da casa ainda. Uma meta da casa mostra aos dois quanto falta e quem guardou.',
      ),
    ).toBeInTheDocument()
    expect(within(casa).getByRole('link', { name: 'Nova meta da casa' })).toHaveAttribute(
      'href',
      '/metas/nova?escopo=casa',
    )
    expect(within(minhas).getByText('Nenhuma meta sua ainda. Só você vê as suas metas.')).toBeInTheDocument()
    expect(within(minhas).getByRole('link', { name: 'Nova meta minha' })).toHaveAttribute(
      'href',
      '/metas/nova?escopo=eu',
    )
    expect(screen.getByRole('link', { name: 'Nova meta' })).toHaveAttribute('href', '/metas/nova')
  })

  it('só a seção sem metas mostra o estado vazio', async () => {
    const individuais = lerResposta<LinhaMeta[]>('metas').filter((m) => m.escopo === 'individual')
    vi.mocked(buscarMetas).mockResolvedValue(individuais as never)
    renderizar()

    const casa = await screen.findByRole('region', { name: 'Da casa' })
    const minhas = secao('Minhas')
    expect(within(casa).getByRole('link', { name: 'Nova meta da casa' })).toBeInTheDocument()
    expect(within(minhas).queryByText(/Nenhuma meta sua ainda/)).not.toBeInTheDocument()
    expect(within(minhas).queryByRole('link', { name: 'Nova meta minha' })).not.toBeInTheDocument()
    expect(within(minhas).getAllByRole('link')).toHaveLength(2)
  })
})

describe('T10 Metas: carregando e erro', () => {
  it('carregando mostra o aviso para leitor de tela e mantém "Nova meta"', async () => {
    vi.mocked(buscarMetas).mockReturnValue(new Promise(() => {}))
    renderizar()

    expect(await screen.findByText('Carregando as metas…')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nova meta' })).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('erro sem cache mostra o estado de erro, sem as seções, e "Tentar de novo" busca de novo', async () => {
    vi.mocked(buscarMetas).mockRejectedValue({ tipo: 'rede' })
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Não foi possível carregar' })).toBeInTheDocument()
    expect(screen.getByText('Verifique a conexão e tente de novo.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Da casa' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nova meta' })).toBeInTheDocument()

    vi.mocked(buscarMetas).mockResolvedValue(lerResposta('metas'))
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByRole('link', { name: /Viagem Nordeste/ })).toBeInTheDocument()
  })

  it('erro com cache mantém os cartões e mostra a faixa "Mostrando dados de"', async () => {
    vi.mocked(buscarMetas).mockResolvedValue(lerResposta('metas'))
    const { cliente } = renderizar()
    await screen.findByRole('link', { name: /Viagem Nordeste/ })

    vi.mocked(buscarMetas).mockRejectedValue({ tipo: 'rede' })
    await act(async () => {
      await cliente.refetchQueries()
    })

    await waitFor(() => expect(screen.getByText(/Mostrando dados de/)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /Viagem Nordeste/ })).toBeInTheDocument()
  })
})
