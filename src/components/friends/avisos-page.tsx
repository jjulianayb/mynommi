import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "./art";
import { EmptyState } from "./surfaces";
import { useDemoSession } from "./session";
import { Avisos } from "./avisos";

export function AvisosPage() {
  const { cloudUser, demoMode } = useDemoSession();
  return (
    <>
      <div className="page-title">
        <h1>Avisos</h1>
      </div>
      {cloudUser && !demoMode ? (
        <Avisos me={cloudUser.id} />
      ) : (
        <EmptyState
          title="Os avisos são das contas reais."
          text="Entre na sua conta para acompanhar pedidos de amizade, comentários e rolês."
        >
          <Button asChild>
            <Link to="/conta">
              <Icon name="arrow" />
              Entrar
            </Link>
          </Button>
        </EmptyState>
      )}
    </>
  );
}
