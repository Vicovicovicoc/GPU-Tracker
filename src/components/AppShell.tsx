import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Bell, Cpu, LayoutDashboard, LogOut, Menu, Newspaper, Settings, Store, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/newsletter", label: "Newsletter", icon: Newspaper },
  { to: "/cartes", label: "Comparateur GPU", icon: Cpu },
  { to: "/alertes", label: "Alertes", icon: Bell },
  { to: "/boutiques", label: "Boutiques", icon: Store },
  { to: "/parametres", label: "Paramètres", icon: Settings },
  { to: "/compte", label: "Mon compte", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  const side = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="h-8 w-8 rounded-lg bg-brand shadow-glow" />
        <div>
          <div className="text-sm font-bold leading-none">GPU Price</div>
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground">TRACKER · FR</div>
        </div>
      </div>
      {nav.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
        >
          <n.icon className="h-4 w-4" /> {n.label}
        </Link>
      ))}
      <button onClick={signOut} className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent">
        <LogOut className="h-4 w-4" /> Déconnexion
      </button>
    </nav>
  );
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:block">{side}</aside>
      <div className={cn("fixed inset-0 z-40 md:hidden", open ? "block" : "hidden")}>
        <div className="absolute inset-0 bg-background/70" onClick={() => setOpen(false)} />
        <aside className="relative h-full w-64 border-r border-sidebar-border bg-sidebar">
          <button className="absolute right-3 top-3" onClick={() => setOpen(false)} aria-label="Fermer"><X className="h-5 w-5" /></button>
          {side}
        </aside>
      </div>
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <span className="font-semibold">GPU Price Tracker</span>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
