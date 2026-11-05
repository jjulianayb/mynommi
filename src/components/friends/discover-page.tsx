import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal, ArrowRight, MessageCircle, MapPin, Heart, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCombinar, porqueApareceu, recadoDaResposta } from "@/lib/combinar";
import { ChipIcone } from "./combinar";
import { useConversas } from "@/lib/direct-messages";
import { useChegada } from "@/lib/chegada";
import { useRealTeias } from "@/lib/real-teias";
import { enderecoDaImagem } from "@/lib/covers";
import { paraCss } from "@/lib/enquadrar";
import { figurinhaDe } from "@/lib/figurinhas";
import { usePosts } from "@/lib/posts";
import { SemFoto, Icon } from "./art";
import { Esqueleto } from "./surfaces";
import { SafetyMenu, PostCard } from "./social-feed";
import { PeopleSearch } from "./real-people";
import { useFriends } from "./store";

export function DiscoverPage({ me }: { me: string }) {
  const { state, notify } = useFriends();
  const match = useCombinar(true);
  const chats = useConversas(me);
  const tribes = useRealTeias(me);
  const suggestions = useChegada(me);
  const [query, setQuery] = useState("");
  const [interest, setInterest] = useState("");
  const [mode, setMode] = useState<"tout" | "people" | "tribes">("tout");
  const [filters, setFilters] = useState(false);
  const [busy, setBusy] = useState(false);
  const [matched, setMatched] = useState<string | null>(null);
  const posts = usePosts(me);
  const text = query.trim().toLocaleLowerCase("pt-BR");
  const candidates = match.fila.filter(c => (!text || `${c.nome} ${c.cidade} ${c.interesses.join(" ")}`.toLocaleLowerCase("pt-BR").includes(text)) && (!interest || c.interesses.some(i => i.toLowerCase() === interest.toLowerCase())));
  const person = candidates[0];
  const recommended = suggestions.sugeridas.filter(t => !t.iAmMember && (!text || `${t.name} ${t.category}`.toLowerCase().includes(text)) && (!interest || `${t.name} ${t.category}`.toLowerCase().includes(interest.toLowerCase())));
  const mine = tribes.rows.filter(t => tribes.joined.includes(t.id) && t.kind !== "role");
  const common = candidates.filter(c => c.tribosEmComum > 0 && c.userId !== person?.userId);
  const editorial = posts.posts.filter(p => !p.mine && p.body && !p.body.startsWith("[" ) && (interest ? p.body.toLowerCase().includes(interest.toLowerCase()) : state.interests.some(i => p.body.toLowerCase().includes(i.toLowerCase())))).slice(0, 3);
  async function respond(sim: boolean) {
    if (!person || busy) return;
    setBusy(true);
    const r = await match.responder(person, sim);
    notify(recadoDaResposta(r, person.nome));
    if (r === "match") { setMatched(person.userId); void chats.reload(); }
    if (r === "erro") void match.recarregar();
    setBusy(false);
  }
  return <div className="discovery">
    <header className="discovery-heading"><div><h1>Descobrir<span aria-hidden="true">✳</span></h1></div><Button variant="ghost" size="icon" aria-label="Abrir filtros" aria-expanded={filters} onClick={() => setFilters(!filters)}><SlidersHorizontal size={21}/></Button></header>
    <label className="discovery-search"><Search size={20}/><input type="search" value={query} onChange={e => setQuery(e.target.value)} maxLength={40} placeholder="Pessoas, tribos e interesses" aria-label="Buscar pessoas, tribos e interesses"/>{query && <Button variant="ghost" size="icon" aria-label="Limpar busca" onClick={() => setQuery("")}><X size={18}/></Button>}</label>
    {filters && <div className="discovery-modes" aria-label="Filtrar descoberta">{([['tout','Tudo'],['people','Pessoas'],['tribes','Tribos']] as const).map(([key,label]) => <Button variant={mode === key ? "default" : "ghost"} key={key} onClick={() => setMode(key)} aria-pressed={mode === key}>{label}</Button>)}<Button asChild variant="ghost"><Link to="/radar"><MapPin size={17}/>Radar</Link></Button></div>}
    {state.interests.length > 0 && <div className="discovery-interests"><Button variant={interest ? "ghost" : "default"} onClick={() => setInterest("")} aria-pressed={!interest}>Para você</Button>{state.interests.map(i => <Button key={i} variant={interest === i ? "default" : "secondary"} onClick={() => setInterest(interest === i ? "" : i)} aria-pressed={interest === i}><ChipIcone i={i}/> {i}</Button>)}</div>}
    {mode !== "tribes" && chats.conversas.length > 0 && <section className="discovery-section"><div className="discovery-section-title"><h2>Continue suas conexões</h2><Link to="/conversas" aria-label="Ver todas as conversas"><ArrowRight size={20}/></Link></div><div className="discovery-friends">{chats.conversas.map(c => <div key={c.outroId}><Link to="/nommi/$id" params={{id:c.outroId}} className="discovery-friend-photo">{c.avatar ? <img src={enderecoDaImagem(c.avatar) ?? undefined} alt={c.nickname}/> : <SemFoto nome={c.nickname} size={68}/>}</Link><Link to="/nommi/$id" params={{id:c.outroId}}><b>{c.nickname.split(" ")[0]}</b></Link><Link to="/conversas/$id" params={{id:c.outroId}} className="discovery-chat" aria-label={`Conversar com ${c.nickname}`}><MessageCircle size={16}/>{c.naoLidas > 0 ? <span>{c.naoLidas}</span> : "Conversar"}</Link></div>)}</div></section>}
    {mode !== "tribes" && <section className="discovery-section"><div className="discovery-section-title"><div><h2>Gente que pode combinar</h2></div><Heart size={23}/></div>
      {!match.ready ? <Esqueleto tipo="cartoes"/> : person ? <>
        <article className={`discovery-person ${person.avatar ? "has-photo" : "no-photo"}`}>
          <Link to="/nommi/$id" params={{id:person.userId}} className="discovery-person-image" aria-label={`Ver perfil de ${person.nome}`}>{person.avatar ? <img src={enderecoDaImagem(person.avatar) ?? undefined} alt={person.nome} style={{objectPosition:paraCss(person.fotoFoco)}}/> : <SemFoto nome={person.nome} size={150}/>}</Link>
          <div className="discovery-person-details"><h3>{person.nome}{person.verificada && <Check size={20} aria-label="Perfil verificado"/>}</h3>{person.cidade && <p><MapPin size={16}/>{person.cidade}</p>}<div className="discovery-person-tags">{person.emComum.slice(0,3).map(i => <span key={i}>{figurinhaDe(i)} {i}</span>)}</div><p className="discovery-reason">{porqueApareceu(person)}</p><Button disabled={busy} onClick={() => void respond(true)}><Icon name="users"/>Quero conhecer</Button></div>
        </article><div className="discovery-person-bottom"><Button variant="ghost" disabled={busy} onClick={() => void respond(false)}><X size={17}/>Agora não</Button><SafetyMenu me={me} targetUserId={person.userId} targetUserName={person.nome}/></div>
      </> : <div className="discovery-empty"><Icon name="spark"/><h3>{query || interest ? "Ainda não apareceu alguém nessa busca." : "Por aqui, você já viu todo mundo."}</h3><p>{query || interest ? "Experimente outro interesse ou continue explorando as tribos." : "As amizades continuam nas conversas, e tem tribo para descobrir."}</p><Button variant="secondary" onClick={() => {setInterest("");setQuery("");void match.recarregar();}}>Ver de novo</Button></div>}
      {matched && <div className="discovery-match"><b>Deu match! A conversa está aberta.</b><Button asChild><Link to="/conversas/$id" params={{id:matched}}>Dizer oi <ArrowRight size={18}/></Link></Button></div>}
    </section>}
    {mode !== "people" && <section className="discovery-section"><div className="discovery-section-title"><div><h2>Tribos que são sua cara</h2></div><Link to="/grupos" aria-label="Explorar todas as tribos"><ArrowRight size={20}/></Link></div>{!suggestions.ready ? <Esqueleto tipo="cartoes"/> : <div className="discovery-tribes">{recommended.map((t,index) => {const cover=tribes.rows.find(r => r.id === t.id)?.cover_path;return <Link to="/grupos/$id" params={{id:String(t.id)}} key={t.id} className={`discovery-tribe tribe-tone-${index%3}`}><div className="discovery-tribe-cover">{cover ? <img src={enderecoDaImagem(cover) ?? undefined} alt=""/> : <span>{figurinhaDe(t.category || t.name)}</span>}<small>{t.category || "Tribo"}</small></div><h3>{t.name}</h3>{t.about && <p>{t.about}</p>}<footer>{t.members} {t.members === 1 ? "pessoa" : "pessoas"}<ArrowRight size={18}/></footer></Link>})}</div>}{suggestions.ready && !recommended.length && <div className="discovery-empty"><h3>Seu próximo assunto pode estar numa tribo.</h3><Button asChild variant="secondary"><Link to="/grupos">Explorar tribos<ArrowRight size={18}/></Link></Button></div>}</section>}
    {mode !== "tribes" && common.length > 0 && <section className="discovery-section"><div className="discovery-section-title"><h2>Pessoas das suas tribos</h2></div><div className="discovery-common">{common.slice(0,6).map(c => <Link key={c.userId} to="/nommi/$id" params={{id:c.userId}}>{c.avatar ? <img src={enderecoDaImagem(c.avatar) ?? undefined} alt=""/> : <SemFoto nome={c.nome} size={56}/>}<div><b>{c.nome}</b><p>{c.tribosEmComum} {c.tribosEmComum === 1 ? "tribo em comum" : "tribos em comum"}</p></div><ArrowRight size={18}/></Link>)}</div></section>}
    {mode !== "people" && mine.length > 0 && <section className="discovery-section"><div className="discovery-section-title"><h2>O assunto continua aqui</h2><Link to="/grupos">Suas tribos <ArrowRight size={17}/></Link></div><div className="discovery-own">{mine.map(t => <Link key={t.id} to="/grupos/$id" params={{id:String(t.id)}}><span>{figurinhaDe(t.category || t.name)}</span><b>{t.name}</b></Link>)}</div></section>}
    {mode !== "tribes" && query && <section className="discovery-section"><h2>Procurar por apelido ou cidade</h2><PeopleSearch userId={me}/></section>}
    {mode === "tout" && editorial.length > 0 && <section className="discovery-section"><div className="discovery-section-title"><div><h2>Dos seus interesses</h2></div></div>{editorial.map(p => <PostCard key={p.id} post={p} me={me} onReact={posts.react} onRemove={posts.remove} nickname={state.nickname}/>)}</section>}
    <footer className="discovery-invite"><span aria-hidden="true">✳</span><div><h2>Amizade boa também se convida.</h2><Button asChild variant="ghost"><Link to="/convidar">Trazer alguém para a nommi <ArrowRight size={18}/></Link></Button></div></footer>
  </div>;
}