import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { discountPct, eur, storeName } from "@/lib/stores";

export interface Offer {
  id: string; title: string; store: string; url: string; price: number; old_price: number | null;
  in_stock: boolean; last_checked_at: string; gpu_id: string;
}

export function OfferCard({ o, brand }: { o: Offer; brand?: string | undefined }) {
  const d = discountPct(o.price, o.old_price);
  return (
    <div className="flex flex-col rounded-xl border bg-card-gradient p-4 transition-shadow hover:shadow-glow animate-rise">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{brand ?? ""} · {storeName(o.store)}</span>
        {o.in_stock ? <Badge className="bg-success/15 text-success hover:bg-success/15">En stock</Badge> : <Badge variant="destructive">Rupture</Badge>}
      </div>
      <div className="mt-2 line-clamp-2 min-h-10 text-sm font-medium">{o.title}</div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-mono text-2xl font-semibold">{eur(o.price)}</span>
        {o.old_price && o.old_price > o.price && <span className="font-mono text-sm text-muted-foreground line-through">{eur(o.old_price)}</span>}
        {d > 0 && <Badge className="bg-accent text-accent-foreground">-{d} %</Badge>}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>MAJ {new Date(o.last_checked_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
        <a href={o.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Voir <ExternalLink className="h-3 w-3" /></a>
      </div>
    </div>
  );
}
