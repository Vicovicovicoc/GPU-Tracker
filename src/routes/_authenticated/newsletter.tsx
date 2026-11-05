import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Newspaper } from "lucide-react";
import { gpusQuery, offersQuery, settingsQuery, watchlistQuery } from "@/lib/queries";
import { OfferCard, type Offer } from "@/components/OfferCard";
import { discountPct } from "@/lib/stores";

export const Route = createFileRoute("/_authenticated/newsletter")({
  head: () => ({ meta: [{ title: "Newsletter — GPU Price Tracker" }] }),
  component: Newsletter,
});

function Newsletter() {
  const { data: offers } = useQuery(offersQuery);
  const { data: gpus } = useQuery(gpusQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { data: watch } = useQuery(watchlistQuery);
  if (!offers || !gpus || !settings) return null;

  const gpuById = new Map(gpus.map((g) => [g.id, g]));
  const brands = settings.brands ?? [];
  const stores = settings.stores ?? [];
  const budget = settings.budget_max ? Number(settings.budget_max) : null;

  const all = offers.filter((o) => {
    const g = gpuById.get(o.gpu_id);
    return g && brands.includes(g.brand) && stores.includes(o.store);
  });
  const inStock = all.filter((o) => o.in_stock && (!budget || o.price <= budget));

  const bestByGpu = new Map<string, Offer>();
  for (const o of inStock) {
    const b = bestByGpu.get(o.gpu_id);
    if (!b || o.price < b.price) bestByGpu.set(o.gpu_id, o);
  }
  const best = [...bestByGpu.values()].sort((a, b) => a.price - b.price).slice(0, 8);
  const promos = inStock
    .filter((o) => discountPct(o.price, o.old_price) >= 10)
    .sort((a, b) => discountPct(b.price, b.old_price) - discountPct(a.price, a.old_price))
    .slice(0, 6);
  const since = Date.now() - 24 * 3600_000;
  const fresh = inStock.filter((o) => new Date(o.first_seen_at).getTime() >= since).slice(0, 6);
  const watched = new Set((watch ?? []).map((w) => w.gpu_id));
  const oos = all.filter((o) => !o.in_stock && watched.has(o.gpu_id)).slice(0, 6);

  const brand = (o: Offer) => gpuById.get(o.gpu_id)?.brand;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Newspaper className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Newsletter</h1>
          <p className="text-sm text-muted-foreground">
            Votre rapport du jour, filtré selon vos paramètres — le même contenu que l'e-mail quotidien.
          </p>
        </div>
      </div>
      <Section title="Meilleures offres du jour" items={best} brand={brand} />
      <Section title="Promotions intéressantes" items={promos} brand={brand} />
      <Section title="Nouvelles cartes détectées" items={fresh} brand={brand} />
      <Section title="Indisponibles / en rupture (vos cartes suivies)" items={oos} brand={brand} />
    </div>
  );
}

function Section({ title, items, brand }: { title: string; items: Offer[]; brand: (o: Offer) => string | undefined }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((o) => <OfferCard key={o.id} o={o} brand={brand(o)} />)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Rien à signaler.</p>
      )}
    </section>
  );
}
