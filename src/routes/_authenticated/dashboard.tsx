import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshButton } from "@/components/RefreshButton";
import { OfferCard } from "@/components/OfferCard";
import { gpusQuery, offersQuery } from "@/lib/queries";
import { discountPct, eur } from "@/lib/stores";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — GPU Price Tracker" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: gpus = [] } = useQuery(gpusQuery);
  const { data: offers = [] } = useQuery(offersQuery);
  const inStock = offers.filter((o) => o.in_stock);
  const avg = inStock.length ? inStock.reduce((s, o) => s + o.price, 0) / inStock.length : null;
  const promos = inStock.filter((o) => discountPct(o.price, o.old_price) > 0);
  const best = [...promos].sort((a, b) => discountPct(b.price, b.old_price) - discountPct(a.price, a.old_price)).slice(0, 8);
  const last = offers.reduce<string | null>((m, o) => (!m || o.last_checked_at > m ? o.last_checked_at : m), null);
  const brand = new Map(gpus.map((g) => [g.id, g.brand]));
  const stats = [
    ["Cartes surveillées", String(gpus.length)],
    ["Prix moyen", eur(avg)],
    ["Meilleure offre", best[0] ? `-${discountPct(best[0].price, best[0].old_price)} %` : "—"],
    ["Promotions", String(promos.length)],
    ["Dernière MAJ", last ? new Date(last).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Jamais"],
  ];
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <RefreshButton />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card-gradient p-4">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="mt-1 font-mono text-xl font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Meilleures offres du jour</h2>
        {best.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {best.map((o) => <OfferCard key={o.id} o={o} brand={brand.get(o.gpu_id)} />)}
          </div>
        ) : (
          <p className="text-muted-foreground">Aucun prix relevé pour l'instant. Lancez une actualisation.</p>
        )}
      </section>
    </div>
  );
}
