import { describe, expect, it } from "vitest";
import { ApiError, networkApiError, toApiError } from "./errors";

describe("toApiError", () => {
  it("mapeia HTTP 409 (RN-08/RN-09/CHECK) para kind 'conflict'", () => {
    const error = toApiError({ message: "conta possui lançamentos vinculados", code: "23503" }, 409);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe("conflict");
    expect(error.status).toBe(409);
    expect(error.message).toContain("conta possui lançamentos vinculados");
  });

  it("mapeia HTTP 400 (campo obrigatório ausente) para kind 'validation'", () => {
    const error = toApiError({ message: "null value in column" }, 400);
    expect(error.kind).toBe("validation");
  });

  it("mapeia HTTP 403 (RLS/gate de MFA) para kind 'forbidden' com mensagem amigável", () => {
    const error = toApiError({ message: "permission denied", code: "42501" }, 403);
    expect(error.kind).toBe("forbidden");
    expect(error.message).toMatch(/permissão|segundo fator/i);
  });

  it("mapeia HTTP 404 (RLS não distingue 'não existe' de 'não autorizado') para kind 'forbidden'", () => {
    const error = toApiError({ message: "not found" }, 404);
    expect(error.kind).toBe("forbidden");
  });

  it("sem status HTTP disponível, usa a classe 23 do SQLSTATE como fallback para 'conflict'", () => {
    const error = toApiError({ message: "check violation", code: "23514" });
    expect(error.kind).toBe("conflict");
  });

  it("preserva code/details/hint originais para debug", () => {
    const error = toApiError({ message: "x", code: "23505", details: "Key already exists", hint: "use PATCH" }, 409);
    expect(error.code).toBe("23505");
    expect(error.details).toBe("Key already exists");
    expect(error.hint).toBe("use PATCH");
  });
});

describe("networkApiError", () => {
  it("marca kind 'network' quando não há resposta HTTP (ex.: offline)", () => {
    const error = networkApiError(new Error("Failed to fetch"));
    expect(error.kind).toBe("network");
    expect(error.message).toContain("Failed to fetch");
  });
});
