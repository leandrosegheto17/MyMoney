import { Outlet, type RouteObject } from 'react-router';
import { SpriteIcones } from './componentes/base/SpriteIcones';
import { mapaRotas } from './mapaRotas';

function Raiz() {
  return (
    <>
      <SpriteIcones />
      <Outlet />
    </>
  );
}

export const rotas: RouteObject[] = [{ element: <Raiz />, children: mapaRotas }];
