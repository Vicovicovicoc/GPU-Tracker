import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BellRing, LineChart, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GPU Price Tracker — prix des cartes graphiques en France" },
      { name: "description", content: "Suivez les prix réels des cartes graphiques NVIDIA, AMD et Intel chez LDLC, Amazon, TopAchat et plus. Alertes et rapport quotidien par e-mail." },
      { property: "og:title", content: "GPU Price Tracker" },
      { property: "og:description", content: "Surveillance automatique des prix des cartes graphiques sur le marché français." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Activity, t: "7 boutiques françaises", d: "Amazon, LDLC, TopAchat, Cdiscount, Materiel.net, Rue du Commerce, Back Market." },
  { icon: LineChart, t: "Historique des prix", d: "24 h, 7 jours, 30 jours, plus bas et plus haut enregistrés." },
  { icon: BellRing, t: "Alertes seuil & baisses", d: "Un e-mail dès qu'une carte passe sous votre prix ou chute de 15 %." },
  { icon: Mail, t: "Rapport à 8 h", d: "Les meilleures offres du jour dans votre boîte chaque matin." },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="font-mono text-xs tracking-[0.3em] text-primary">GPU PRICE TRACKER</div>
        <h1 className="mt-4 text-5xl font-bold leading-tight md:text-6xl">
          Le bon prix pour votre <span className="text-brand">carte graphique</span>.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Des prix relevés sur les vraies fiches des boutiques françaises, en euros. Aucun prix inventé.
        </p>
        {!isSupabaseConfigured() && (
          <div role="status" className="mt-8 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            <p className="font-semibold text-foreground">Connexion Supabase à configurer</p>
            <p className="mt-1 text-muted-foreground">
              La page d’accueil reste disponible, mais la connexion et les données du tableau de bord
              seront activées après avoir connecté le projet Supabase dans Lovable Cloud.
            </p>
          </div>
        )}
        <div className="mt-10 flex gap-3">
          <Button variant="hero" size="lg" asChild><Link to="/dashboard">Ouvrir le tableau de bord</Link></Button>
          <Button variant="outline" size="lg" asChild><Link to="/auth">Se connecter</Link></Button>
        </div>
        <div className="mt-20 grid gap-4 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.t} className="rounded-xl border bg-card-gradient p-6 animate-rise">
              <f.icon className="h-6 w-6 text-primary" />
              <div className="mt-3 font-semibold">{f.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
