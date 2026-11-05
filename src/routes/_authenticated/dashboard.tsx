import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Line, LineChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { RefreshButton } from "@/components/RefreshButton";
import { OfferCard } from "@/components/OfferCard";
import { Badge } from "@/components/ui/badge";
import { ChartContainer } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gpusQuery, offersQuery, historyQuery, storeStatusQuery } from "@/lib/queries";
import { discountPct, eur } from "@/lib/stores";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — GPU Price Tracker" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: gpus = [], isLoading: loadingGpus } = useQuery(gpusQuery);
  const { data: offers = [], isLoading: loadingOffers } = useQuery(offersQuery);
  const { data: stores = [] } = useQuery(storeStatusQuery);
  const [selectedGpu, setSelectedGpu] = useState("");
  const selectedId = selectedGpu || gpus[0]?.id || "";
  const { data: history = [], isLoading: loadingHistory } = useQuery({
    ...historyQuery(selectedId),
    enabled: Boolean(selectedId),
  });

  const inStock = offers.filter((o) => o.in_stock);
  const promos = inStock.filter((o) => discountPct(o.price, o.old_price) > 0);
  const best = [...promos]
    .sort((a, b) => discountPct(b.price, b.old_price) - discountPct(a.price, a.old_price))
    .slice(0, 8);
  const brand = new Map(gpus.map((g) => [g.id, g.brand]));
  const operationalStores = stores.filter((s) => !s.last_error && s.last_success_at).length;
  const last = offers.reduce<string | null>((m, o) => (!m || o.last_checked_at > m ? o.last_checked_at : m), null);
  const dailyLowest = new Map<string, { day: string; price: number; timestamp: number }>();
  for (const point of history) {
    if (!point.in_stock) continue;
    const date = new Date(point.recorded_at);
    const key = date.toISOString().slice(0, 10);
    const current = dailyLowest.get(key);
    if (!current || point.price < current.price) {
      dailyLowest.set(key, {
        day: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        price: point.price,
        timestamp: date.getTime(),
      });
    }
  }
  const chartData = [...dailyLowest.values()].sort((a, b) => a.timestamp - b.timestamp);

  const stats = [
    { label: "GPU référencés", value: String(gpus.length), detail: "Cartes dans le catalogue" },
    { label: "Offres en stock", value: String(inStock.length), detail: "Prix actuellement disponibles" },
    { label: "Promotions", value: String(promos.length), detail: "Offres avec réduction détectée" },
    { label: "Boutiques opérationnelles", value: `${operationalStores}/${stores.length || 7}`, detail: "Dernier relevé réussi" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary hover:bg-primary/15">LIVE · FRANCE</Badge>
            <span className="text-xs text-muted-foreground">Suivi des prix GPU</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted-foreground">Toutes les offres et tendances au même endroit.</p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card-gradient p-4">
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className="mt-2 font-mono text-3xl font-semibold">{stat.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{stat.detail}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border bg-card-gradient p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Historique des prix</h2>
            <p className="text-sm text-muted-foreground">Meilleur prix relevé chaque jour, sur les 30 derniers jours.</p>
          </div>
          <Select value={selectedId} onValueChange={setSelectedGpu}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Choisir une carte" /></SelectTrigger>
            <SelectContent>
              {gpus.map((gpu) => <SelectItem key={gpu.id} value={gpu.id}>{gpu.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {loadingGpus || loadingHistory ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Chargement de l'historique…</div>
        ) : chartData.length ? (
          <ChartContainer config={{ price: { label: "Prix", color: "var(--primary)" } }} className="h-64 w-full">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickFormatter={(value) => `${Number(value)} €`} tickLine={false} axisLine={false} width={64} />
              <Tooltip formatter={(value) => [eur(Number(value)), "Prix"]} labelFormatter={(label) => `Date : ${label}`} />
              <Line type="monotone" dataKey="price" stroke="var(--color-price)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <p className="font-medium">Pas encore assez d'historique</p>
            <p className="text-sm text-muted-foreground">Les courbes apparaîtront dès que des relevés de prix seront enregistrés.</p>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Meilleures promotions</h2>
            <p className="text-sm text-muted-foreground">Les réductions les plus importantes détectées.</p>
          </div>
          <span className="text-xs text-muted-foreground">Dernière mise à jour : {last ? new Date(last).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Aucune"}</span>
        </div>
        {loadingOffers ? <p className="text-sm text-muted-foreground">Chargement des offres…</p> : best.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {best.map((offer) => <OfferCard key={offer.id} o={offer} brand={brand.get(offer.gpu_id)} />)}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune promotion détectée pour le moment. Lance une actualisation pour rechercher de nouvelles offres.</p>
        )}
      </section>
    </div>
  );
}
