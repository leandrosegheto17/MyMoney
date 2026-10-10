import { QueryClient } from '@tanstack/react-query';

export const clienteConsulta = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: true } },
});
