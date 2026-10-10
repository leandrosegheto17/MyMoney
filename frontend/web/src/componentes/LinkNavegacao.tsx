import { NavLink } from 'react-router';
import { Icone } from './base/Icone';
import { destinoDoItem, type ItemNavegacao } from './itensNavegacao';

interface Props {
  item: ItemNavegacao;
  mes?: string;
}

/** Link de um item de navegação; `aria-current="page"` vem do NavLink. */
export function LinkNavegacao({ item, mes }: Props) {
  return (
    <NavLink to={destinoDoItem(item, mes)} end={item.exato}>
      <Icone nome={item.icone} />
      {item.rotulo}
    </NavLink>
  );
}
