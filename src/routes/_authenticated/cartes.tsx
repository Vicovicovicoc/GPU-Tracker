import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Star, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { gpusQuery, offersQuery, watchlistQuery } from "@/lib/queries";
import { BRANDS, eur, storeName } from "@/lib/stores";
import { gpuSpecs, validOffers } from "@/lib/gpu-offers";

export const Route = createFileRoute("/_authenticated/cartes")({
  head: () => ({ meta: [{ title: "Cartes graphiques — GPU Price Tracker" }] }),
  component: Cartes,
});

function specLine(gpu: Parameters<typeof gpuSpecs>[0]) {
  const s = gpuSpecs(gpu);
  return [s.vramOptions.length ? `${s.vramOptions.join(" / ")} Go` : null, s.memoryType, s.architecture].filter(Boolean).join(" · ") || "Caractéristiques non renseignées";
}

function Cartes() {
  const qc = useQueryClient();
  const { data: gpus = [], isLoading: loadingGpus } = useQuery(gpusQuery);
  const { data: allOffers = [], isLoading: loadingOffers } = useQuery(offersQuery);
  const { data: watch = [] } = useQuery(watchlistQuery);
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("all");
  const [sort, setSort] = useState("price");
  const [watchedOnly, setWatchedOnly] = useState(false);

  const offers = useMemo(() => validOffers(allOffers, gpus), [allOffers, gpus]);
  const offersByGpu = useMemo(() => {
    const map = new Map<string, typeof offers>();
    for (const offer of offers) {
      const current = map.get(offer.gpu_id) ?? [];
      current.push(offer);
      map.set(offer.gpu_id, current);
    }
    return map;
  }, [offers]);

  const list = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("fr-FR");
    return gpus
      .filter((gpu) => gpu.name.toLocaleLowerCase("fr-FR").includes(needle))
      .filter((gpu) => brand === "all" || gpu.brand === brand)
      .filter((gpu) => !watchedOnly || watch.some((item) => item.gpu_id === gpu.id))
      .map((gpu) => {
        const available = (offersByGpu.get(gpu.id) ?? []).filter((offer) => offer.in_stock);
        return { gpu, available, best: [...available].sort((a, b) => a.price - b.price)[0] };
      })
      .sort((a, b) => {
        if (sort === "name") return a.gpu.name.localeCompare(b.gpu.name, "fr");
        if (sort === "offers") return b.available.length - a.available.length;
        if (a.best && b.best) return a.best.price - b.best.price;
        if (a.best) return -1;
        if (b.best) return 1;
        return a.gpu.name.localeCompare(b.gpu.name, "fr");
      });
  }, [gpus, q, brand, watchedOnly, watch, offersByGpu, sort]);

  async function toggle(gpuId: string) {
    try {
      const item = watch.find((x) => x.gpu_id === gpuId);
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw authError ?? new Error("Connecte-toi pour suivre une carte.");
      const result = item
        ? await supabase.from("watchlist").delete().eq("id", item.id)
        : await supabase.from("watchlist").insert({ gpu_id: gpuId, user_id: data.user.id });
      if (result.error) throw result.error;
      toast.success(item ? "Carte retirée de ta liste" : "Carte ajoutée à ta liste");
      await qc.invalidateQueries({ queryKey: ["watchlist"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier la liste.");
    }
  }

  async function setMax(id: string, value: string) {
    const max = value.trim() ? Number(value) : null;
    if (max !== null && (!Number.isFinite(max) || max <= 0)) {
      toast.error("Entre un prix supérieur à 0 €.");
      return;
    }
    const { error } = await supabase.from("watchlist").update({ max_price: max }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Seuil d'alerte enregistré");
    await qc.invalidateQueries({ queryKey: ["watchlist"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Comparateur de GPU</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recherche, trie et compare les prix disponibles chez les boutiques suivies.</p>
      </div>
      <div className="grid gap-3 rounded-xl border bg-card-gradient p-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
        <Input placeholder="Rechercher une carte graphique…" value={q} onChange={(event) => setQ(event.target.value)} />
        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger><SelectValue placeholder="Toutes les marques" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les marques</SelectItem>
            {BRANDS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger><SelectValue placeholder="Trier par" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="price">Prix le plus bas</SelectItem>
            <SelectItem value="offers">Plus d'offres</SelectItem>
            <SelectItem value="name">Nom A → Z</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={watchedOnly ? "default" : "outline"} onClick={() => setWatchedOnly((value) => !value)}>
          <SlidersHorizontal className="mr-2 h-4 w-4" /> Suivies uniquement
        </Button>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{list.length} carte(s) affichée(s)</span>
        <span>{offers.filter((offer) => offer.in_stock).length} offres en stock au total</span>
      </div>
      {loadingGpus || loadingOffers ? <p className="text-sm text-muted-foreground">Chargement du catalogue…</p> : list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(({ gpu, available, best }) => {
            const item = watch.find((entry) => entry.gpu_id === gpu.id);
            return (
              <article key={gpu.id} className="rounded-xl border bg-card-gradient p-4 transition-shadow hover:shadow-glow">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant="outline">{gpu.brand}</Badge>
                    <h2 className="mt-2 font-semibold">
                      <Link to="/gpu/$gpuId" params={{ gpuId: gpu.id }} className="hover:text-primary hover:underline" aria-label={`Ouvrir la fiche de ${gpu.name}`}>{gpu.name}</Link>
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">{specLine(gpu)}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => toggle(gpu.id)} aria-label={item ? "Ne plus suivre" : "Suivre cette carte"}>
                    <Star className={item ? "fill-primary text-primary" : ""} />
                  </Button>
                </div>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Meilleur prix disponible</div>
                    <div className="font-mono text-2xl font-semibold">{eur(best?.price)}</div>
                  </div>
                  <Badge className="bg-success/15 text-success hover:bg-success/15">{available.length} offre(s)</Badge>
                </div>
                {best && <p className="mt-1 text-xs text-muted-foreground">Chez {storeName(best.store)}</p>}
                {item && (
                  <form className="mt-4 flex gap-2 border-t pt-3" onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void setMax(item.id, String(form.get("max") ?? ""));
                  }}>
                    <Input name="max" type="number" min="1" step="0.01" placeholder="Alerte sous… €" defaultValue={item.max_price ?? ""} aria-label="Prix maximum pour l'alerte" />
                    <Button type="submit" variant="outline">Enregistrer</Button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Aucune carte ne correspond à ces filtres.</p>
          <p className="mt-1 text-sm text-muted-foreground">Modifie la recherche ou réinitialise les filtres.</p>
          <Button className="mt-4" variant="outline" onClick={() => { setQ(""); setBrand("all"); setWatchedOnly(false); setSort("price"); }}>Réinitialiser</Button>
        </div>
      )}
    </div>
  );
}
