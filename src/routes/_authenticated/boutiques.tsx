import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { offersQuery, storeStatusQuery } from "@/lib/queries";
import { STORES } from "@/lib/stores";

export const Route = createFileRoute("/_authenticated/boutiques")({
  head: () => ({ meta: [{ title: "Boutiques — GPU Price Tracker" }] }),
  component: Boutiques,
});

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Jamais");

function Boutiques() {
  const { data: status = [] } = useQuery(storeStatusQuery);
  const { data: offers = [] } = useQuery(offersQuery);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Boutiques</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STORES.map((s) => {
          const st = status.find((x) => x.store === s.id);
          const n = offers.filter((o) => o.store === s.id && o.in_stock).length;
          return (
            <div key={s.id} className="rounded-xl border bg-card-gradient p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{s.name}</span>
                {!st ? <Badge variant="outline">Pas encore lue</Badge>
                  : st.last_error ? <Badge variant="destructive">Erreur</Badge>
                  : <Badge className="bg-success/15 text-success hover:bg-success/15">OK</Badge>}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{n} offre(s) en stock</div>
              <div className="text-xs text-muted-foreground">Dernière réussite : {fmt(st?.last_success_at ?? null)}</div>
              {st?.last_error && <div className="mt-1 text-xs text-destructive">{st.last_error}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
