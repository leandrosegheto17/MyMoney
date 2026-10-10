import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchSimulado } = vi.hoisted(() => ({ fetchSimulado: vi.fn<typeof fetch>() }))

vi.mock('../cliente', async (importOriginal) => {
  const real = await importOriginal<typeof import('../cliente')>()
  let cliente: ReturnType<typeof real.criarCliente> | undefined
  return {
    ...real,
    obterCliente: () =>
      (cliente ??= real.criarCliente({
        url: 'http://127.0.0.1:54321',
        chave: 'chave-falsa',
        fetch: (...args: Parameters<typeof fetch>) => fetchSimulado(...args),
      })),
  }
})

import { registrarPagamentoCartao } from './formas'

function lerResposta(nome: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`../../../../../.md/mockup/respostas/${nome}.json`, import.meta.url), 'utf8'),
  )
}

function responder(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const ID_PAGAMENTO = '00000000-0000-4000-8000-000000000c01'
const ID_XP = '00000000-0000-4000-8000-000000000303'
const ID_ITAU = '00000000-0000-4000-8000-000000000202'

const DADOS = {
  id: ID_PAGAMENTO,
  formaId: ID_XP,
  contaId: ID_ITAU,
  valorCentavos: 50000,
  data: '2026-10-09',
}

beforeEach(() => {
  fetchSimulado.mockReset()
})

describe('registrarPagamentoCartao', () => {
  it('chama a RPC registrar_pagamento_cartao com os p_* esperados', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(200, ID_PAGAMENTO))

    await registrarPagamentoCartao(DADOS)

    const [entrada, init] = fetchSimulado.mock.calls[0]
    const url = new URL(entrada instanceof Request ? entrada.url : String(entrada))
    expect(url.pathname).toBe('/rest/v1/rpc/registrar_pagamento_cartao')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Profile')).toBe('api')
    expect(JSON.parse(String(init?.body))).toEqual({
      p_id: ID_PAGAMENTO,
      p_forma_id: ID_XP,
      p_conta_id: ID_ITAU,
      p_valor_centavos: 50000,
      p_data: '2026-10-09',
    })
  })

  it('traduz registro_invalido', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(400, lerResposta('erro-registro-invalido')))

    await expect(registrarPagamentoCartao(DADOS)).rejects.toMatchObject({
      tipo: 'regra',
      codigo: 'registro_invalido',
    })
  })

  it('traduz falha de rede para rede', async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(registrarPagamentoCartao(DADOS)).rejects.toMatchObject({ tipo: 'rede' })
  })
})
