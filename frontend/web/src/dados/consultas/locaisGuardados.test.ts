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

import { buscarLocaisGuardados } from './locaisGuardados'

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

beforeEach(() => {
  fetchSimulado.mockReset()
})

describe('buscarLocaisGuardados', () => {
  it('chama a RPC locais_guardados e devolve a lista de textos', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(200, lerResposta('locais-guardados')))

    await expect(buscarLocaisGuardados()).resolves.toEqual(['Caixinha Nubank', 'CDB Banco Inter'])

    const [entrada, init] = fetchSimulado.mock.calls[0]
    const url = new URL(entrada instanceof Request ? entrada.url : String(entrada))
    expect(url.pathname).toBe('/rest/v1/rpc/locais_guardados')
    expect(init?.method ?? (entrada instanceof Request ? entrada.method : undefined)).toBe('POST')
  })

  it('traduz falha de rede para rede', async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(buscarLocaisGuardados()).rejects.toMatchObject({ tipo: 'rede' })
  })

  it('traduz 503 para indisponivel', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(503, lerResposta('erro-servico')))

    await expect(buscarLocaisGuardados()).rejects.toMatchObject({ tipo: 'indisponivel' })
  })
})
