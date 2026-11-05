import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { alertLogQuery } from "@/lib/queries";
import { eur, storeName } from "@/lib/stores";

export const Route = createFileRoute("/_authenticated/alertes")({
  head: () => ({ meta: [{ title: "Alertes — GPU Price Tracker" }] }),
  component: Alertes,
});

function Alertes() {
  const { data = [], isLoading, isError } = useQuery(alertLogQuery);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Centre des alertes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Historique des baisses de prix et des seuils que tu as définis.</p>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Chargement des alertes…</p> : isError ? (
        <p className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">Impossible de charger l'historique des alertes.</p>
      ) : data.length ? (
        <div className="divide-y rounded-xl border bg-card-gradient">
          {data.map((alert) => (
            <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-medium">{alert.offers?.title ?? "Offre indisponible"}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{alert.kind === "drop" ? "Baisse de prix" : "Seuil atteint"}</Badge>
                  <span>{storeName(alert.offers?.store ?? "")}</span>
                  <span>·</span>
                  <time dateTime={alert.sent_at}>{new Date(alert.sent_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</time>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-semibold">{eur(Number(alert.price))}</span>
                {alert.offers?.url && (
                  <a href={alert.offers.url} target="_blank" rel="noopener noreferrer" aria-label="Voir l'offre" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    Voir <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune alerte envoyée pour l'instant. Suis une carte et définis un prix cible pour commencer.</p>}
    </div>
  );
}
