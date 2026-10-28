import { useVersaoNova } from "@/lib/versao";
import { Icon } from "./art";

/** Aviso de versão nova: quem deixa o app aberto no celular não fica para trás. */
export function VersaoNova() {
  const nova = useVersaoNova();
  if (!nova) return null;
  return (
    <div className="versao-nova" role="status">
      <span>
        <Icon name="spark" />
        Tem uma versão nova da nommi.
      </span>
      <button type="button" onClick={() => window.location.reload()}>
        Atualizar
      </button>
    </div>
  );
}
