import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { alertLogQuery } from "@/lib/queries";
import { eur, storeName } from "@/lib/stores";

export const Route = createFileRoute("/_authenticated/alertes")({
  head: () => ({ meta: [{ title: "Alertes — GPU Price Tracker" }] }),
  component: Alertes,
});

function Alertes() {
  const { data = [] } = useQuery(alertLogQuery);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Alertes envoyées</h1>
      <p className="text-sm text-muted-foreground">Suivez une carte (étoile) dans « Cartes » et fixez un seuil pour recevoir un e-mail.</p>
      {data.length ? (
        <div className="divide-y rounded-xl border bg-card-gradient">
          {data.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div>
                <div className="font-medium">{a.offers?.title}</div>
                <div className="text-xs text-muted-foreground">
                  {a.kind === "drop" ? "Baisse de prix" : "Sous le seuil"} · {storeName(a.offers?.store ?? "")} · {new Date(a.sent_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
              <span className="font-mono">{eur(Number(a.price))}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-muted-foreground">Aucune alerte envoyée pour l'instant.</p>}
    </div>
  );
}
