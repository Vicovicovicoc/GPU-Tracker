import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { offersQuery, storeStatusQuery } from "@/lib/queries";
import { STORES } from "@/lib/stores";

export const Route = createFileRoute("/_authenticated/boutiques")({
  head: () => ({ meta: [{ title: "Boutiques — GPU Price Tracker" }] }),
  component: Boutiques,
});

const fmt = (date: string | null) => date
  ? new Date(date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
  : "Jamais";

function Boutiques() {
  const { data: status = [], isLoading: loadingStatus } = useQuery(storeStatusQuery);
  const { data: offers = [], isLoading: loadingOffers } = useQuery(offersQuery);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Boutiques partenaires</h1>
        <p className="mt-1 text-sm text-muted-foreground">État des relevés et accès directs aux marchands suivis.</p>
      </div>
      {loadingStatus || loadingOffers ? <p className="text-sm text-muted-foreground">Chargement des boutiques…</p> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {STORES.map((store) => {
            const state = status.find((item) => item.store === store.id);
            const count = offers.filter((offer) => offer.store === store.id && offer.in_stock).length;
            const healthy = Boolean(state?.last_success_at && !state.last_error);
            return (
              <article key={store.id} className="rounded-xl border bg-card-gradient p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{store.name}</h2>
                  {!state ? <Badge variant="outline">En attente</Badge>
                    : state.last_error ? <Badge variant="destructive">Erreur de relevé</Badge>
                    : healthy ? <Badge className="bg-success/15 text-success hover:bg-success/15">Opérationnelle</Badge>
                    : <Badge variant="outline">Pas encore vérifiée</Badge>}
                </div>
                <div className="mt-4 font-mono text-2xl font-semibold">{count}</div>
                <div className="text-xs text-muted-foreground">offres actuellement en stock</div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>Dernière tentative : {fmt(state?.last_attempt_at ?? null)}</p>
                  <p>Dernière réussite : {fmt(state?.last_success_at ?? null)}</p>
                </div>
                {state?.last_error && <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">{state.last_error}</p>}
                <a href={store.origin} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Visiter le site <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
