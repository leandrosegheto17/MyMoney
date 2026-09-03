import { Link } from "react-router-dom";
import { EmptyState } from "../components/base/EmptyState";

export function NotFoundPage() {
  return (
    <EmptyState
      title="Página não encontrada"
      description="O endereço acessado não existe."
      action={
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          Voltar ao início
        </Link>
      }
    />
  );
}
