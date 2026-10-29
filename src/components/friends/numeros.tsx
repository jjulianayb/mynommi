import { oQueOsNumerosDizem, taxaDeVolta, useNumeros } from "@/lib/numeros";
import { EmptyState } from "./surfaces";

const dia = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

/** O painel da Ju: só ela vê, e os números não contam conta de teste. */
export function Numeros({ souAdmin }: { souAdmin: boolean }) {
  const { numeros, dias, ready } = useNumeros(souAdmin);
  if (!souAdmin)
    return <EmptyState title="Esta área é da moderação." text="Os números são de quem cuida." />;
  if (!ready) return <p className="small-note">Contando…</p>;
  if (!numeros) return <p className="small-note">Não deu para carregar os números agora.</p>;

  const pico = Math.max(1, ...dias.map((d) => d.quantas));

  return (
    <section className="numeros">
      <p className="numeros-leitura">{oQueOsNumerosDizem(numeros)}</p>

      <h3>Quem está aqui</h3>
      <div className="numeros-grade">
        <div>
          <b>{numeros.cadastrados}</b>
          <span>cadastradas</span>
        </div>
        <div>
          <b>{numeros.entraramSemana}</b>
          <span>entraram na semana</span>
        </div>
        <div className="destaque">
          <b>{numeros.ativosSemana}</b>
          <span>abriram na semana</span>
        </div>
        <div>
          <b>{numeros.ativosMes}</b>
          <span>abriram no mês</span>
        </div>
      </div>

      <h3>Quem volta</h3>
      <div className="numeros-grade">
        <div className="destaque">
          <b>{taxaDeVolta(numeros)}%</b>
          <span>voltaram outro dia</span>
        </div>
        <div>
          <b>{numeros.diasPorPessoa}</b>
          <span>dias por pessoa na semana</span>
        </div>
      </div>

      <h3>Amizade acontecendo</h3>
      <div className="numeros-grade">
        <div className="destaque">
          <b>{numeros.amizades}</b>
          <span>amizades</span>
        </div>
        <div>
          <b>{numeros.amizadesSemana}</b>
          <span>nesta semana</span>
        </div>
        <div>
          <b>{numeros.conversas}</b>
          <span>conversas abertas</span>
        </div>
        <div>
          <b>{numeros.tribosVivas}</b>
          <span>tribos com 2+ pessoas</span>
        </div>
      </div>

      <h3>Perfil e movimento</h3>
      <div className="numeros-grade">
        <div>
          <b>{numeros.comFoto}</b>
          <span>com foto</span>
        </div>
        <div>
          <b>{numeros.comInteresses}</b>
          <span>com interesses</span>
        </div>
        <div>
          <b>{numeros.storiesSemana}</b>
          <span>stories na semana</span>
        </div>
        <div>
          <b>{numeros.rolesFuturos}</b>
          <span>rolês marcados</span>
        </div>
      </div>

      <h3>Quem abriu, dia a dia</h3>
      <div
        className="numeros-barras"
        role="img"
        aria-label="Pessoas que abriram o app a cada dia do último mês"
      >
        {dias.map((d) => (
          <span key={d.dia} title={`${dia(d.dia)}: ${d.quantas}`}>
            <i style={{ height: Math.max(3, Math.round((d.quantas / pico) * 100)) + "%" }} />
          </span>
        ))}
      </div>
      <p className="small-note">
        Do dia {dias[0] ? dia(dias[0].dia) : ""} até hoje. O app guarda só o dia em que cada pessoa
        abriu — não guarda tela, clique nem lugar.
      </p>
    </section>
  );
}
