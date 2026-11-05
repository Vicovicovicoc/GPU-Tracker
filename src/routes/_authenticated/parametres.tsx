import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { settingsQuery } from "@/lib/queries";
import { BRANDS, STORES } from "@/lib/stores";
import { sendTestReport } from "@/lib/gpu.functions";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — GPU Price Tracker" }] }),
  component: Parametres,
});

function Parametres() {
  const qc = useQueryClient();
  const test = useServerFn(sendTestReport);
  const { data: s } = useQuery(settingsQuery);
  if (!s) return null;

  async function save(patch: Database["public"]["Tables"]["user_settings"]["Update"]) {
    const { error } = await supabase.from("user_settings").update(patch).eq("user_id", s!.user_id);
    if (error) toast.error(error.message); else toast.success("Enregistré");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }
  const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold">Paramètres</h1>
      <section className="space-y-4 rounded-xl border bg-card-gradient p-5">
        <div className="flex items-center justify-between">
          <Label>Rapport quotidien par e-mail</Label>
          <Switch checked={s.daily_report} onCheckedChange={(v) => save({ daily_report: v })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>E-mail</Label><Input defaultValue={s.email ?? ""} onBlur={(e) => save({ email: e.target.value || null })} /></div>
          <div><Label>Budget max (€)</Label><Input type="number" defaultValue={s.budget_max ?? ""} onBlur={(e) => save({ budget_max: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Seuil de baisse (%)</Label><Input type="number" defaultValue={s.drop_threshold} onBlur={(e) => save({ drop_threshold: Number(e.target.value) || 15 })} /></div>
          <div><Label>Actualisation (heures)</Label><Input type="number" min={1} max={24} defaultValue={s.refresh_hours} onBlur={(e) => save({ refresh_hours: Number(e.target.value) || 24 })} /></div>
        </div>
        <Button variant="outline" onClick={async () => { const r = await test(); r.sent ? toast.success("Rapport envoyé") : toast.info("Pas encore de prix à envoyer"); }}>Envoyer un rapport test</Button>
      </section>
      <section className="space-y-3 rounded-xl border bg-card-gradient p-5">
        <h2 className="font-semibold">Marques</h2>
        <div className="flex flex-wrap gap-4">
          {BRANDS.map((b) => (
            <label key={b} className="flex items-center gap-2 text-sm">
              <Checkbox checked={s.brands.includes(b)} onCheckedChange={() => save({ brands: toggleIn(s.brands, b) })} />{b}
            </label>
          ))}
        </div>
        <h2 className="pt-2 font-semibold">Boutiques</h2>
        <div className="grid grid-cols-2 gap-2">
          {STORES.map((st) => (
            <label key={st.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={s.stores.includes(st.id)} onCheckedChange={() => save({ stores: toggleIn(s.stores, st.id) })} />{st.name}
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
