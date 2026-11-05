import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { gpusQuery, offersQuery, watchlistQuery } from "@/lib/queries";
import { eur, storeName } from "@/lib/stores";

export const Route = createFileRoute("/_authenticated/cartes")({
  head: () => ({ meta: [{ title: "Cartes graphiques — GPU Price Tracker" }] }),
  component: Cartes,
});

function Cartes() {
  const qc = useQueryClient();
  const { data: gpus = [] } = useQuery(gpusQuery);
  const { data: offers = [] } = useQuery(offersQuery);
  const { data: watch = [] } = useQuery(watchlistQuery);
  const [q, setQ] = useState("");
  const list = gpus.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()));

  async function toggle(gpuId: string) {
    const w = watch.find((x) => x.gpu_id === gpuId);
    const { data: u } = await supabase.auth.getUser();
    const { error } = w
      ? await supabase.from("watchlist").delete().eq("id", w.id)
      : await supabase.from("watchlist").insert({ gpu_id: gpuId, user_id: u.user!.id });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["watchlist"] });
  }

  async function setMax(id: string, v: string) {
    const { error } = await supabase.from("watchlist").update({ max_price: v ? Number(v) : null }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Seuil enregistré");
    qc.invalidateQueries({ queryKey: ["watchlist"] });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Cartes graphiques</h1>
      <Input placeholder="Rechercher une carte…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((g) => {
          const os = offers.filter((o) => o.gpu_id === g.id && o.in_stock);
          const best = os[0];
          const w = watch.find((x) => x.gpu_id === g.id);
          return (
            <div key={g.id} className="rounded-xl border bg-card-gradient p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">{g.brand}</div>
                  <div className="font-semibold">{g.name}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => toggle(g.id)} aria-label="Suivre">
                  <Star className={w ? "fill-primary text-primary" : ""} />
                </Button>
              </div>
              <div className="mt-3 font-mono text-xl">{eur(best?.price)}</div>
              <div className="text-xs text-muted-foreground">
                {best ? `chez ${storeName(best.store)} · ${os.length} offre(s) en stock` : "Aucune offre en stock"}
              </div>
              {w && (
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); setMax(w.id, new FormData(e.currentTarget).get("m") as string); }}>
                  <Input name="m" type="number" placeholder="Alerte sous… €" defaultValue={w.max_price ?? ""} />
                  <Button type="submit" variant="outline">OK</Button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
