import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { clienteConsulta } from './clienteConsulta';
import { rotas } from './rotas';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('elemento #raiz ausente no index.html');

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={clienteConsulta}>
      <RouterProvider router={createBrowserRouter(rotas)} />
    </QueryClientProvider>
  </StrictMode>,
);
