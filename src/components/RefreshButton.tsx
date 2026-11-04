import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { triggerRefresh, syncRefresh } from "@/lib/gpu.functions";
import { batchesQuery } from "@/lib/queries";

export function RefreshButton() {
  const qc = useQueryClient();
  const start = useServerFn(triggerRefresh);
  const sync = useServerFn(syncRefresh);
  const { data: batches } = useQuery(batchesQuery);
  const running = batches?.some((b) => b.status === "pending") ?? false;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      try {
        const r = await sync();
        if (r.ingested) { toast.success("Prix mis à jour"); qc.invalidateQueries(); }
        else qc.invalidateQueries({ queryKey: ["batches"] });
      } catch (e) { console.error(e); }
    }, 15000);
    return () => clearInterval(t);
  }, [running, sync, qc]);

  async function go() {
    setBusy(true);
    try {
      const r = await start();
      if (r.started) toast.success(`Actualisation lancée (${r.urls} pages). Résultats dans quelques minutes.`);
      else toast.info(r.reason);
      qc.invalidateQueries({ queryKey: ["batches"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'actualisation");
    } finally { setBusy(false); }
  }

  return (
    <Button variant="hero" onClick={go} disabled={busy || running}>
      <RefreshCw className={running || busy ? "animate-spin" : ""} />
      {running ? "Actualisation en cours…" : "Actualiser les prix"}
    </Button>
  );
}
