import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({ meta: [{ title: "parametres — GPU Price Tracker" }] }),
  component: () => <div className="rounded-xl border bg-card-gradient p-8 text-muted-foreground">Section en cours de construction.</div>,
});
