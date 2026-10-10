import type { RouteObject } from 'react-router';
import { SpriteIcones } from './componentes/base/SpriteIcones';
import { Provisoria } from './paginas/Provisoria';

export const rotas: RouteObject[] = [
  {
    path: '/',
    element: (
      <>
        <SpriteIcones />
        <Provisoria />
      </>
    ),
  },
];
