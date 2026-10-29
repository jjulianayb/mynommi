import { useState, useEffect, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "./art";
import { Sheet, LoadingState, Brand } from "./surfaces";
import { useDemoSession } from "./session";
import { Welcome } from "./entry";
import { isRealHost } from "@/lib/nommi-access";
import rioPhoto from "@/assets/welcome-rio.jpg";
import { useNaoLidas } from "@/lib/direct-messages";
import { useAvisosNaoLidos } from "@/lib/avisos";
import { Tour } from "./tour";
import { VersaoNova } from "./versao-nova";
import { esquecerTour, tourJaVisto } from "@/lib/tour";
import { registrarAcesso } from "@/lib/numeros";
import { useAceite } from "@/lib/aceite";
import { AvisoDeAceite } from "./aceite";

/** Cada item da navegação vira um alvo do tour. */
const alvoDoItem = (to: string) =>
  ({ "/": "inicio", "/descobrir": "descobrir", "/grupos": "tribos", "/perfil": "meu-nommi" })[to] ??
  undefined;
const entryPaths = ["/conta", "/cadastro", "/login", "/login-parceiro", "/recuperar-senha"];
const legalPaths = ["/termos", "/privacidade", "/ajuda"];
export function SocialShell({ children }: { children: ReactNode }) {
  const { session, ready, signOut, cloudUser, demoMode } = useDemoSession();
  const naoLidas = useNaoLidas(cloudUser && !demoMode ? cloudUser.id : null);
  const avisosNovos = useAvisosNaoLidos(cloudUser && !demoMode ? cloudUser.id : null);
  const { pathname, searchStr } = useLocation();
  const [create, setCreate] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [tourAberto, setTourAberto] = useState(false);
  const real = !!cloudUser && !demoMode;
  // Uma linha por pessoa por dia: é o que responde "quantas voltaram".
  useEffect(() => {
    if (real) void registrarAcesso();
  }, [real, cloudUser?.id]);
  // Ninguém usa a nommi sem ter lido o texto que está no ar. As telas de termos
  // e privacidade ficam livres, senão a pessoa não consegue ler o que vai aceitar.
  const aceite = useAceite(real, cloudUser && !demoMode ? cloudUser.id : null);
  // O tour só começa na página inicial, onde estão as coisas que ele aponta.
  useEffect(() => {
    if (!real || pathname !== "/" || tourJaVisto(cloudUser?.id ?? null)) return;
    const t = setTimeout(() => setTourAberto(true), 900);
    return () => clearTimeout(t);
  }, [real, pathname, cloudUser?.id]);
  useEffect(() => {
    setCreate(false);
    setDrawer(false);
  }, [pathname, searchStr]);
  if (!ready)
    return (
      <div className="friends-app">
        <div className="entry-layout">
          <Brand />
          <LoadingState />
        </div>
      </div>
    );
  if (entryPaths.includes(pathname) || (!session && legalPaths.includes(pathname)))
    return (
      <div className="friends-app public-app com-cenario">
        <div
          className="cenario-fundo"
          aria-hidden="true"
          style={{ backgroundImage: `url(${rioPhoto})` }}
        />
        <div className="cenario-veu" aria-hidden="true" />
        <div className="cenario-conteudo">{children}</div>
      </div>
    );
  if (!session)
    return pathname === "/" ? (
      <div className="friends-app">
        <Welcome />
      </div>
    ) : (
      <Navigate to="/conta" replace />
    );
  if (
    cloudUser &&
    !cloudUser.profileComplete &&
    !legalPaths.includes(pathname) &&
    pathname !== "/admin"
  )
    return <Navigate to="/conta" replace />;
  if (["/parceiro", "/carteira"].includes(pathname) && !isRealHost(cloudUser, demoMode))
    return (
      <div className="friends-app">
        <div className="entry-layout">
          <Brand />
          <h1>Um espaço para Anfitriões.</h1>
          <p className="intro">Esta área é exclusiva de contas reais de quem recebe as tribos.</p>
          <Button asChild className="wide">
            <Link to="/">
              Voltar ao meu Nommi
              <Icon name="arrow" />
            </Link>
          </Button>
        </div>
      </div>
    );
  const items = [
    { to: "/" as const, label: "Início", icon: "home" },
    { to: "/descobrir" as const, label: "Descobrir", icon: "spark" },
    { to: "/grupos" as const, label: "Tribos", icon: "teia" },
    { to: "/perfil" as const, label: "Meu nommi", icon: "users" },
  ];
  return (
    <div className="friends-app social-app drawer-app nommi-refresh">
      {aceite.pronto && aceite.pendente && !legalPaths.includes(pathname) && (
        <AvisoDeAceite onAceitar={aceite.aceitar} />
      )}
      <header className="app-header">
        <Link to="/" aria-label="Nommi, início">
          <Brand />
        </Link>
        <div className="top-actions">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={"Conversas" + (naoLidas > 0 ? ", " + naoLidas + " por ler" : "")}
          >
            <Link to="/conversas" data-tour="conversas">
              <span className="nav-icon">
                <Icon name="chat" />
                {naoLidas > 0 && (
                  <span className="nav-dot" aria-hidden="true">
                    {naoLidas > 9 ? "9+" : naoLidas}
                  </span>
                )}
              </span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menu"
            aria-expanded={drawer}
            onClick={() => setDrawer(true)}
          >
            <Icon name="menu" />
          </Button>
        </div>
      </header>
      <main className="screen">
        <div key={pathname} className="screen-transition">
          {children}
        </div>
        <footer className="safety-note">
          {demoMode && (
            <>
              Apresentação com perfis fictícios.
              <br />
            </>
          )}
          Maiores de 18 anos · O Nommi não substitui apoio psicológico. CVV 188.
          <div>
            <Link to="/ajuda">Ajuda</Link>
            <span>·</span>
            <Link to="/termos">Termos</Link>
            <span>·</span>
            <Link to="/privacidade">Privacidade</Link>
          </div>
        </footer>
      </main>
      <nav className="bottom-nav nommi-bottom" aria-label="Navegação principal">
        {items.slice(0, 2).map((n) => (
          <Button key={n.to} asChild variant="ghost" data-tour={alvoDoItem(n.to)}>
            <Link to={n.to} activeOptions={{ exact: true }} activeProps={{ className: "selected" }}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </Link>
          </Button>
        ))}
        <Button
          variant="default"
          size="icon"
          className="bottom-create"
          data-tour="criar"
          aria-label="Criar"
          aria-expanded={create}
          onClick={() => setCreate(true)}
        >
          <Icon name="plus" />
        </Button>
        {items.slice(2).map((n) => (
          <Button key={n.to} asChild variant="ghost" data-tour={alvoDoItem(n.to)}>
            <Link
              to={n.to}
              search={{}}
              activeOptions={{ exact: true }}
              activeProps={{ className: "selected" }}
            >
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </Link>
          </Button>
        ))}
      </nav>
      <VersaoNova />
      {tourAberto && cloudUser && <Tour me={cloudUser.id} onFim={() => setTourAberto(false)} />}
      {drawer && (
        <Sheet title="Seu nommi" side="right" onClose={() => setDrawer(false)}>
          <nav aria-label="Menu secundário" className="drawer-navigation">
            <Button asChild variant="ghost" className="drawer-link">
              <Link to="/configuracoes" search={{ section: "perfil" }}>
                <Icon name="settings" />
                Configurações
              </Link>
            </Button>
            <Button asChild variant="ghost" className="drawer-link">
              <Link to="/radar">
                <Icon name="pin" />
                Radar nommi
              </Link>
            </Button>
            <Button asChild variant="ghost" className="drawer-link">
              <Link to="/convites">
                <Icon name="spark" />
                Rolês abertos
              </Link>
            </Button>
            <Button asChild variant="ghost" className="drawer-link">
              <Link to="/amigos">
                <Icon name="users" />
                Meus amigos
              </Link>
            </Button>
            <Button asChild variant="ghost" className="drawer-link">
              <Link to="/clube">
                <Icon name="gift" />
                Clube
              </Link>
            </Button>
            {real && (
              <Button
                variant="ghost"
                className="drawer-link"
                onClick={() => {
                  esquecerTour(cloudUser!.id);
                  setDrawer(false);
                  setTourAberto(true);
                }}
              >
                <Icon name="spark" />
                Fazer o tour do app
              </Button>
            )}
            <Button asChild variant="ghost" className="drawer-link">
              <Link to="/ajuda">
                <Icon name="help" />
                Ajuda
              </Link>
            </Button>
            <Button asChild variant="ghost" className="drawer-link">
              <Link to="/termos">
                <Icon name="document" />
                Termos
              </Link>
            </Button>
          </nav>
        </Sheet>
      )}
      {create && (
        <Sheet title="Qual é o plano?" onClose={() => setCreate(false)}>
          {[
            { to: "/convites" as const, label: "Criar rolê aberto", icon: "plus" },
            { to: "/convidar" as const, label: "Chamar minha tribo", icon: "teia" },
            { to: "/postar-momento" as const, label: "Contar como foi", icon: "image" },
          ].map((a) => (
            <Button asChild variant="ghost" className="sheet-option" key={a.to}>
              <Link to={a.to} search={a.to === "/convites" ? { criar: true } : {}}>
                <Icon name={a.icon} />
                <span>{a.label}</span>
                <Icon name="arrow" />
              </Link>
            </Button>
          ))}
        </Sheet>
      )}
    </div>
  );
}
export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const { signOut } = useDemoSession();
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="profile-menu-button"
        aria-label="Menu do perfil"
        onClick={() => setOpen(true)}
      >
        <Icon name="more" />
      </Button>
      {open && (
        <Sheet title="Meu nommi" onClose={() => setOpen(false)}>
          <Button asChild variant="ghost" className="sheet-option">
            <Link to="/configuracoes" search={{ section: "perfil" }}>
              <Icon name="settings" />
              Editar meu nommi
            </Link>
          </Button>
          <Button asChild variant="ghost" className="sheet-option">
            <Link to="/configuracoes" search={{ section: "seguranca" }}>
              <Icon name="lock" />
              Privacidade e segurança
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="sheet-option danger-text"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            <Icon name="logout" />
            Sair
          </Button>
        </Sheet>
      )}
    </>
  );
}
