import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Cpu, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gpusQuery, offersQuery } from "@/lib/queries";
import { detectAib, detectVramGb, gpuSpecs, sortOffersByPrice, validOffers } from "@/lib/gpu-offers";
import { discountPct, eur, storeName } from "@/lib/stores";

export const Route = createFileRoute("/_authenticated/gpu/$gpuId")({
  head: () => ({ meta: [{ title: "Fiche carte graphique — GPU Price Tracker" }] }),
  component: GpuSheet,
});

const dateFr = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

function GpuSheet() {
  const { gpuId } = Route.useParams();
  const { data: gpus = [], isLoading: loadingGpus } = useQuery(gpusQuery);
  const { data: allOffers = [], isLoading: loadingOffers } = useQuery(offersQuery);
  const [vramFilter, setVramFilter] = useState<number | "all">("all");
  const [hideOut, setHideOut] = useState(false);

  const gpu = gpus.find((g) => g.id === gpuId);
  const specs = gpu ? gpuSpecs(gpu) : null;

  const offers = useMemo(() => {
    if (!gpu) return [];
    const mine = validOffers(allOffers, gpus).filter((o) => o.gpu_id === gpu.id);
    return sortOffersByPrice(mine);
  }, [allOffers, gpus, gpu]);

  const shown = offers
    .filter((o) => !hideOut || o.in_stock)
    .filter((o) => vramFilter === "all" || detectVramGb(o.title) === vramFilter);

  if (loadingGpus) return <p className="text-sm text-muted-foreground">Chargement de la fiche…</p>;
  if (!gpu || !specs) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Carte graphique introuvable.</p>
          <p className="mt-1 text-sm text-muted-foreground">Elle n'existe pas ou n'est plus suivie.</p>
        </div>
      </div>
    );
  }

  const rows: [string, string | null][] = [
    ["Nom complet", gpu.name],
    ["Fabricant du GPU", gpu.brand],
    ["Gamme", specs.series],
    ["Architecture", specs.architecture],
    ["Mémoire vidéo (VRAM)", specs.vramOptions.length ? specs.vramOptions.map((v) => `${v} Go`).join(" · ") + (specs.vramOptions.length > 1 ? " (selon la version)" : "") : null],
    ["Type de mémoire", specs.memoryType],
    ["Bus mémoire", specs.memoryBusBits ? `${specs.memoryBusBits} bits` : null],
  ];
  const inStock = offers.filter((o) => o.in_stock);
  const best = sortOffersByPrice(inStock)[0];

  return (
    <div className="space-y-8">
      <BackLink />
      <section className="grid gap-6 rounded-xl border bg-card-gradient p-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex h-44 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 md:h-full">
          {specs.imageUrl ? (
            <img src={specs.imageUrl} alt={gpu.name} className="h-full w-full object-contain" loading="lazy" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Cpu className="h-10 w-10" aria-hidden />
              <span className="text-xs">Image non disponible</span>
            </div>
          )}
        </div>
        <div>
          <Badge variant="outline">{gpu.brand}</Badge>
          <h1 className="mt-2 text-3xl font-bold">{gpu.name}</h1>
          <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value ?? <span className="font-normal text-muted-foreground">Non renseigné</span>}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap items-end gap-6 border-t pt-4">
            <div>
              <div className="text-xs text-muted-foreground">Meilleur prix disponible</div>
              <div className="font-mono text-2xl font-semibold">{eur(best?.price)}</div>
              {best && <div className="text-xs text-muted-foreground">Chez {storeName(best.store)}</div>}
            </div>
            <Badge className="bg-success/15 text-success hover:bg-success/15">{inStock.length} offre(s) en stock</Badge>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Offres des boutiques</h2>
            <p className="text-sm text-muted-foreground">Triées par prix croissant. Chaque lien mène à la fiche produit de la boutique.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {specs.vramOptions.length > 1 && (
              <label className="flex items-center gap-2">
                Mémoire
                <select
                  className="rounded-md border bg-background px-2 py-1"
                  value={String(vramFilter)}
                  onChange={(e) => setVramFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                >
                  <option value="all">Toutes</option>
                  {specs.vramOptions.map((v) => <option key={v} value={v}>{v} Go</option>)}
                </select>
              </label>
            )}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={hideOut} onChange={(e) => setHideOut(e.target.checked)} />
              Masquer les ruptures
            </label>
          </div>
        </div>

        {loadingOffers ? (
          <p className="text-sm text-muted-foreground">Chargement des offres…</p>
        ) : shown.length ? (
          <ul className="divide-y rounded-xl border bg-card-gradient">
            {shown.map((o) => {
              const aib = detectAib(o.title);
              const vram = detectVramGb(o.title);
              const d = discountPct(o.price, o.old_price);
              return (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{storeName(o.store)}</span>
                      {aib && <Badge variant="outline">{aib}</Badge>}
                      {vram && <Badge variant="outline">{vram} Go</Badge>}
                      {o.in_stock ? <Badge className="bg-success/15 text-success hover:bg-success/15">Disponible</Badge> : <Badge variant="destructive">Rupture</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{o.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Mis à jour le {dateFr(o.last_checked_at)}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xl font-semibold">{eur(o.price)}</div>
                    {d > 0 && (
                      <div className="text-xs">
                        <span className="font-mono text-muted-foreground line-through">{eur(o.old_price)}</span>{" "}
                        <Badge className="bg-accent text-accent-foreground">-{d} %</Badge>
                      </div>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={o.url} target="_blank" rel="noopener noreferrer">
                      Voir chez {storeName(o.store)} <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {offers.length
              ? "Aucune offre ne correspond à ces filtres."
              : "Aucune offre relevée pour le moment. Les prix apparaissent après le prochain relevé des boutiques."}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          La disponibilité est déduite de la page de résultats de la boutique ; vérifie-la sur le site avant d'acheter.
        </p>
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/cartes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Retour au comparateur
    </Link>
  );
}
