import { readFileSync } from 'node:fs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RegiaoAvisos } from '../../componentes/base/RegiaoAvisos'
import { FormaPagamento } from '../FormaPagamento'

const h = vi.hoisted(() => ({
  buscarForma: vi.fn<(id: string) => Promise<unknown>>(),
  buscarContas: vi.fn<() => Promise<unknown>>(),
  buscarContexto: vi.fn<() => Promise<unknown>>(),
  salvarForma: vi.fn<(args: Record<string, unknown>) => Promise<unknown>>(),
  definirPreferida: vi.fn<(args: unknown) => Promise<unknown>>(),
  arquivarForma: vi.fn<(id: string) => Promise<unknown>>(),
  excluirForma: vi.fn<(id: string) => Promise<unknown>>(),
  registrarPagamentoCartao: vi.fn<(args: Record<string, unknown>) => Promise<unknown>>(),
}))

vi.mock('../../ganchos/useFormasPagamento', async (importOriginal) => {
  const { useMutation, useQuery } = await import('@tanstack/react-query')
  return {
    ...(await importOriginal<typeof import('../../ganchos/useFormasPagamento')>()),
    useForma: (id: string) =>
      useQuery({ queryKey: ['formas_pagamento', id], queryFn: () => h.buscarForma(id), enabled: Boolean(id) }),
    useComandosForma: () => ({
      salvarForma: useMutation({ mutationFn: h.salvarForma }),
      definirPreferida: useMutation({ mutationFn: h.definirPreferida }),
      arquivarForma: useMutation({ mutationFn: h.arquivarForma }),
      excluirForma: useMutation({ mutationFn: h.excluirForma }),
      registrarPagamentoCartao: useMutation({ mutationFn: h.registrarPagamentoCartao }),
    }),
  }
})
vi.mock('../../ganchos/useContas', async (importOriginal) => {
  const { useQuery } = await import('@tanstack/react-query')
  return {
    ...(await importOriginal<typeof import('../../ganchos/useContas')>()),
    useContas: () => useQuery({ queryKey: ['contas'], queryFn: h.buscarContas }),
  }
})
vi.mock('../../ganchos/useContexto', async () => {
  const { useQuery } = await import('@tanstack/react-query')
  return { useContexto: () => useQuery({ queryKey: ['contexto'], queryFn: h.buscarContexto }) }
})

const ID_XP = '00000000-0000-4000-8000-000000000303'
const ID_PIX = '00000000-0000-4000-8000-000000000301'
const ID_NUBANK = '00000000-0000-4000-8000-000000000201'
const ID_ITAU = '00000000-0000-4000-8000-000000000202'

type Linha = Record<string, unknown>

function lerResposta<T>(nome: string): T {
  return JSON.parse(
    readFileSync(new URL(`../../../../../.md/mockup/respostas/${nome}.json`, import.meta.url), 'utf8'),
  ) as T
}

const formaXp = (extra: Linha = {}) => ({ ...lerResposta<Linha[]>('forma-xp')[0], ...extra })

function montar(caminho: string) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const roteador = createMemoryRouter(
    [
      { path: '/ajustes/formas', element: <p>Página de formas</p> },
      { path: '/ajustes/formas/:id', element: <FormaPagamento /> },
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

const temPagamento = (r: ReturnType<typeof montar>['roteador']) =>
  new URLSearchParams(r.state.location.search).has('pagamento')
const argumentos = (i = 0) => h.registrarPagamentoCartao.mock.calls[i][0]
const contaSelecionada = (dialogo: HTMLElement) =>
  (within(dialogo).getByLabelText('Conta de origem') as HTMLSelectElement).selectedOptions[0].textContent

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-09T15:00:00Z'))
  h.buscarForma.mockResolvedValue(formaXp())
  h.buscarContas.mockResolvedValue(lerResposta('contas'))
  h.buscarContexto.mockResolvedValue(lerResposta('contexto'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('T21 folha de pagamento do cartão', () => {
  it('abre sobre a T18 com título, cartão, conta padrão, data de hoje e nota', async () => {
    montar(`/ajustes/formas/${ID_XP}?pagamento=1`)

    const dialogo = await screen.findByRole('dialog', { name: 'Pagamento do cartão' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(within(dialogo).getByText('Cartão de crédito XP')).toBeInTheDocument()
    expect(within(dialogo).getByText(/vence dia 10/)).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Valor pago')).toHaveValue('R$ 0,00')
    await waitFor(() => expect(contaSelecionada(dialogo)).toBe('Itaú'))
    expect(within(dialogo).getByLabelText('Data')).toHaveValue('2026-10-09')
    expect(within(dialogo).getByText(/Não conta como despesa/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar pagamento' })).toBeInTheDocument()
  })

  it('forma sem conta de pagamento usa a primeira conta ativa', async () => {
    h.buscarForma.mockResolvedValue(formaXp({ conta: null }))
    montar(`/ajustes/formas/${ID_XP}?pagamento=1`)

    const dialogo = await screen.findByRole('dialog', { name: 'Pagamento do cartão' })
    await waitFor(() => expect(contaSelecionada(dialogo)).toBe('Nubank'))
  })

  it('oferece só as contas ativas', async () => {
    const contas = lerResposta<Linha[]>('contas')
    contas.push({ ...contas[0], id: '00000000-0000-4000-8000-000000000299', nome: 'Antiga', arquivada: true })
    h.buscarContas.mockResolvedValue(contas)
    montar(`/ajustes/formas/${ID_XP}?pagamento=1`)

    const dialogo = await screen.findByRole('dialog', { name: 'Pagamento do cartão' })
    const select = within(dialogo).getByLabelText('Conta de origem')
    await waitFor(() =>
      expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Nubank', 'Itaú']),
    )
  })

  it('sem contas mostra o atalho para cadastrar, sem botão de registrar', async () => {
    h.buscarContas.mockResolvedValue(lerResposta('contas-vazio'))
    montar(`/ajustes/formas/${ID_XP}?pagamento=1`)

    const dialogo = await screen.findByRole('dialog', { name: 'Pagamento do cartão' })
    expect(
      await within(dialogo).findByRole('heading', { level: 3, name: 'Cadastre uma conta corrente' }),
    ).toBeInTheDocument()
    expect(
      within(dialogo).getByText('O pagamento do cartão sai de uma conta. Cadastre a conta primeiro.'),
    ).toBeInTheDocument()
    expect(within(dialogo).getByRole('link', { name: 'Cadastrar conta' })).toHaveAttribute(
      'href',
      '/ajustes/contas/nova',
    )
    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).not.toBeInTheDocument()
  })

  it('valor zero mostra erro no campo e põe o foco nele, sem enviar', async () => {
    const { usuario } = montar(`/ajustes/formas/${ID_XP}?pagamento=1`)

    const dialogo = await screen.findByRole('dialog', { name: 'Pagamento do cartão' })
    await usuario.click(screen.getByRole('button', { name: 'Registrar pagamento' }))

    expect(await within(dialogo).findByText('Informe um valor maior que zero.')).toBeInTheDocument()
    const valor = within(dialogo).getByLabelText('Valor pago')
    expect(valor).toHaveAttribute('aria-invalid', 'true')
    expect(valor).toHaveAccessibleDescription(expect.stringContaining('Informe um valor maior que zero.'))
    expect(valor).toHaveFocus()
    expect(h.registrarPagamentoCartao).not.toHaveBeenCalled()
  })

  it('registrar envia forma, conta, valor e data; sucesso avisa e fecha a folha', async () => {
    h.registrarPagamentoCartao.mockResolvedValue('ok')
    const { roteador, usuario } = montar(`/ajustes/formas/${ID_XP}?pagamento=1`)

    const dialogo = await screen.findByRole('dialog', { name: 'Pagamento do cartão' })
    await waitFor(() => expect(contaSelecionada(dialogo)).toBe('Itaú'))
    await usuario.type(within(dialogo).getByLabelText('Valor pago'), '50000')
    await usuario.click(screen.getByRole('button', { name: 'Registrar pagamento' }))

    await waitFor(() => expect(h.registrarPagamentoCartao).toHaveBeenCalledTimes(1))
    expect(argumentos()).toMatchObject({
      formaId: ID_XP,
      contaId: ID_ITAU,
      valorCentavos: 50000,
      data: '2026-10-09',
    })
    expect(String(argumentos().id)).toMatch(/^[0-9a-f-]{36}$/)
    expect(await screen.findByText('Pagamento registrado')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(temPagamento(roteador)).toBe(false)
  })

  it('outra conta escolhida vai no envio', async () => {
    h.registrarPagamentoCartao.mockResolvedValue('ok')
    const { usuario } = montar(`/ajustes/formas/${ID_XP}?pagamento=1`)

    const dialogo = await screen.findByRole('dialog', { name: 'Pagamento do cartão' })
    await waitFor(() => expect(contaSelecionada(dialogo)).toBe('Itaú'))
    await usuario.selectOptions(within(dialogo).getByLabelText('Conta de origem'), 'Nubank')
    await usuario.type(within(dialogo).getByLabelText('Valor pago'), '12345')
    await usuario.click(screen.getByRole('button', { name: 'Registrar pagamento' }))

    await waitFor(() => expect(h.registrarPagamentoCartao).toHaveBeenCalledTimes(1))
    expect(argumentos()).toMatchObject({ contaId: ID_NUBANK, valorCentavos: 12345 })
  })

  it('durante o envio o botão mostra "Registrando…"', async () => {
    h.registrarPagamentoCartao.mockReturnValue(new Promise(() => {}))
    const { usuario } = montar(`/ajustes/formas/${ID_XP}?pagamento=1`)

    const dialogo = await screen.findByRole('dialog', { name: 'Pagamento do cartão' })
    await usuario.type(within(dialogo).getByLabelText('Valor pago'), '50000')
    await usuario.click(screen.getByRole('button', { name: 'Registrar pagamento' }))

    expect(await screen.findByRole('button', { name: /Registrando…/ })).toBeInTheDocument()
  })

  it('sem rede avisa, mantém os campos e reenvia com o mesmo id', async () => {
    h.registrarPagamentoCartao.mockRejectedValueOnce({ tipo: 'rede' }).mockResolvedValueOnce('ok')
    const { roteador, usuario } = montar(`/ajustes/formas/${ID_XP}?pagamento=1`)

    const dialogo = await screen.findByRole('dialog', { name: 'Pagamento do cartão' })
    await waitFor(() => expect(contaSelecionada(dialogo)).toBe('Itaú'))
    await usuario.selectOptions(within(dialogo).getByLabelText('Conta de origem'), 'Nubank')
    await usuario.type(within(dialogo).getByLabelText('Valor pago'), '50000')
    await usuario.click(screen.getByRole('button', { name: 'Registrar pagamento' }))

    expect(await screen.findByText(/Sem conexão/)).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Valor pago')).toHaveValue('R$ 500,00')
    expect(contaSelecionada(dialogo)).toBe('Nubank')
    expect(temPagamento(roteador)).toBe(true)

    await usuario.click(screen.getByRole('button', { name: 'Registrar pagamento' }))
    await waitFor(() => expect(h.registrarPagamentoCartao).toHaveBeenCalledTimes(2))
    expect(argumentos(1).id).toBe(argumentos(0).id)
  })

  it('erro de regra do servidor vira aviso com texto próprio, sem eco do servidor', async () => {
    h.registrarPagamentoCartao.mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' })
    const { usuario } = montar(`/ajustes/formas/${ID_XP}?pagamento=1`)

    const dialogo = await screen.findByRole('dialog', { name: 'Pagamento do cartão' })
    await usuario.type(within(dialogo).getByLabelText('Valor pago'), '50000')
    await usuario.click(screen.getByRole('button', { name: 'Registrar pagamento' }))

    await waitFor(() => expect(h.registrarPagamentoCartao).toHaveBeenCalledTimes(1))
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(screen.queryByText('registro_invalido')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Pagamento do cartão' })).toBeInTheDocument()
  })
})

describe('T21 abertura e fechamento', () => {
  it('?pagamento=1 numa forma Pix é retirado sem abrir a folha', async () => {
    h.buscarForma.mockResolvedValue({
      ...lerResposta<Linha[]>('formas-pagamento')[0],
      id: ID_PIX,
    })
    const { roteador } = montar(`/ajustes/formas/${ID_PIX}?pagamento=1`)

    await waitFor(() => expect(temPagamento(roteador)).toBe(false))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('parâmetro estranho é retirado sem abrir a folha', async () => {
    const { roteador } = montar(`/ajustes/formas/${ID_XP}?pagamento=xyz`)

    await waitFor(() => expect(temPagamento(roteador)).toBe(false))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Esc fecha, tira o parâmetro e devolve o foco ao link de origem', async () => {
    const { roteador, usuario } = montar(`/ajustes/formas/${ID_XP}`)

    await usuario.click(await screen.findByRole('link', { name: 'Registrar pagamento do cartão' }))
    await screen.findByRole('dialog', { name: 'Pagamento do cartão' })
    await usuario.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(temPagamento(roteador)).toBe(false)
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Registrar pagamento do cartão' })).toHaveFocus(),
    )
  })
})
