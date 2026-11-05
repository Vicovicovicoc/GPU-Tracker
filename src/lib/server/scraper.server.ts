import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { STORES, storeName, titleMatches } from "@/lib/stores";
import { sendEmail, emailLayout, offerRow } from "./brevo.server";
import { parseListing } from "@/lib/parse-listing";

const FC = "https://api.firecrawl.dev/v2";

function fcHeaders() {
  const key = process.env['FIRECRAWL_API_KEY'];
  if (!key) throw new Error("Firecrawl n'est pas configuré");
  return { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
}

/** Start a Firecrawl batch scrape for every due GPU × store. Returns the batch id or null. */
export async function startRefresh({ force = false } = {}) {
  const db = supabaseAdmin;
  const { data: pending } = await db
    .from("scrape_batches").select("id,started_at").eq("status", "pending")
    .gte("started_at", new Date(Date.now() - 20 * 60_000).toISOString());
  if (pending && pending.length) return { started: false, reason: "Une actualisation est déjà en cours" };

  const { data: settings } = await db.from("user_settings").select("refresh_hours,stores");
  const hours = Math.min(24, ...(settings ?? []).map((s) => s.refresh_hours));
  const storeIds = new Set<string>((settings ?? []).flatMap((s) => s.stores));
  if (!storeIds.size) STORES.forEach((s) => storeIds.add(s.id));

  const cutoff = new Date(Date.now() - (force ? 0 : hours * 3600_000 - 5 * 60_000)).toISOString();
  const { data: gpus } = await db.from("gpus").select("*")
    .or(`last_refreshed_at.is.null,last_refreshed_at.lt.${cutoff}`);
  if (!gpus?.length) return { started: false, reason: "Rien à actualiser pour le moment" };

  const jobs = gpus.flatMap((g) =>
    STORES.filter((s) => storeIds.has(s.id)).map((s) => ({ url: s.searchUrl(g.search_query), gpu_id: g.id, store: s.id })),
  );
  await db.from("scrape_jobs").upsert(jobs.map((j) => ({ ...j, started_at: new Date().toISOString() })));

  const res = await fetch(`${FC}/batch/scrape`, {
    method: "POST",
    headers: fcHeaders(),
    body: JSON.stringify({
      urls: jobs.map((j) => j.url),
      formats: ["markdown"],
      onlyMainContent: true,
      location: { country: "FR", languages: ["fr-FR"] },
      ignoreInvalidURLs: true,
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Firecrawl [${res.status}]: ${body}`);
  const { id } = JSON.parse(body) as { id: string };
  await db.from("scrape_batches").insert({ id, url_count: jobs.length });
  await db.from("gpus").update({ last_refreshed_at: new Date().toISOString() }).in("id", gpus.map((g) => g.id));
  return { started: true, batchId: id, urls: jobs.length };
}

interface FcDoc { markdown?: string; metadata?: { sourceURL?: string; url?: string; statusCode?: number; error?: string } }

/** Poll pending batches and ingest finished ones. */
export async function syncBatches() {
  const db = supabaseAdmin;
  const { data: batches } = await db.from("scrape_batches").select("*").eq("status", "pending").order("started_at");
  let ingested = 0;
  for (const b of batches ?? []) {
    let url: string | null = `${FC}/batch/scrape/${b.id}`;
    const docs: FcDoc[] = [];
    let status = "";
    while (url) {
      const res: Response = await fetch(url, { headers: fcHeaders() });
      const text = await res.text();
      if (!res.ok) {
        await db.from("scrape_batches").update({ status: "failed", error: `[${res.status}] ${text.slice(0, 500)}` }).eq("id", b.id);
        url = null; status = "failed"; break;
      }
      const j = JSON.parse(text) as { status: string; data?: FcDoc[]; next?: string | null };
      status = j.status;
      if (status !== "completed") { url = null; break; }
      docs.push(...(j.data ?? []));
      url = j.next ? j.next.replace("https://api.firecrawl.dev/v2", FC) : null;
    }
    if (status === "completed") {
      await ingestDocs(docs);
      await db.from("scrape_batches").update({ status: "done", ingested_at: new Date().toISOString() }).eq("id", b.id);
      ingested++;
    } else if (status !== "failed" && Date.now() - new Date(b.started_at).getTime() > 3 * 3600_000) {
      await db.from("scrape_batches").update({ status: "failed", error: "Délai dépassé" }).eq("id", b.id);
    }
  }
  return { ingested, pending: (batches?.length ?? 0) - ingested };
}

async function ingestDocs(docs: FcDoc[]) {
  const db = supabaseAdmin;
  const { data: jobs } = await db.from("scrape_jobs").select("url,gpu_id,store");
  const jobByUrl = new Map((jobs ?? []).map((j) => [j.url, j]));
  const { data: gpus } = await db.from("gpus").select("id,name,match_token");
  const gpuById = new Map((gpus ?? []).map((g) => [g.id, g]));
  const now = new Date().toISOString();
  const storeOk = new Map<string, string | null>();

  for (const doc of docs) {
    const src = doc.metadata?.sourceURL ?? doc.metadata?.url ?? "";
    const job = jobByUrl.get(src);
    if (!job) continue;
    const gpu = gpuById.get(job.gpu_id);
    const store = STORES.find((s) => s.id === job.store)!;
    const code = doc.metadata?.statusCode ?? 200;
    if (code >= 400 || doc.metadata?.error) {
      if (!storeOk.has(store.id)) storeOk.set(store.id, `HTTP ${code}${doc.metadata?.error ? " " + doc.metadata.error : ""}`);
      continue;
    }
    storeOk.set(store.id, null);
    if (!gpu) continue;

    const seen: string[] = [];
    for (const p of parseListing(doc.markdown ?? "", store.origin)) {
      if (!p.title || !p.url || typeof p.price !== "number") continue;
      if (p.price < 60 || p.price > 6000) continue;
      if (!titleMatches(p.title, gpu.match_token)) continue;
      let parsedLink: URL;
      try { parsedLink = new URL(p.url, store.origin); } catch { continue; }
      if (parsedLink.origin !== new URL(store.origin).origin) continue;
      const link = parsedLink.toString();
      const old = typeof p.old_price === "number" && p.old_price > p.price ? p.old_price : null;
      const inStock = p.in_stock !== false;
      seen.push(link);

      const { data: prev } = await db.from("offers").select("id,price").eq("url", link).maybeSingle();
      const { data: offer } = await db.from("offers").upsert({
        gpu_id: gpu.id, store: store.id, title: p.title.slice(0, 300), url: link,
        price: p.price, old_price: old, in_stock: inStock, last_checked_at: now,
      }, { onConflict: "url" }).select("id").single();
      if (!offer) continue;
      await db.from("price_history").insert({ offer_id: offer.id, gpu_id: gpu.id, price: p.price, in_stock: inStock });
      if (inStock) await checkAlerts({ offerId: offer.id, gpuId: gpu.id, gpuName: gpu.name, title: p.title, store: store.id, url: link, price: p.price, prevPrice: prev ? Number(prev.price) : null });
    }
    // Offers previously seen for this card at this store but missing now → out of stock
    let q = db.from("offers").update({ in_stock: false, last_checked_at: now }).eq("gpu_id", gpu.id).eq("store", store.id);
    if (seen.length) q = q.not("url", "in", `(${seen.map((u) => `"${u.replace(/"/g, "")}"`).join(",")})`);
    await q;
  }

  for (const [store, err] of storeOk) {
    await db.from("store_status").upsert(err
      ? { store, last_error: err, last_attempt_at: now }
      : { store, last_error: null, last_attempt_at: now, last_success_at: now });
  }
}

async function userEmail(userId: string, fallback: string | null) {
  if (fallback) return fallback;
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

async function checkAlerts(o: { offerId: string; gpuId: string; gpuName: string; title: string; store: string; url: string; price: number; prevPrice: number | null }) {
  const db = supabaseAdmin;
  const { data: watchers } = await db.from("watchlist").select("user_id,max_price").eq("gpu_id", o.gpuId);
  if (!watchers?.length) return;
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  for (const w of watchers) {
    const { data: s } = await db.from("user_settings").select("*").eq("user_id", w.user_id).maybeSingle();
    if (s && !s.stores.includes(o.store)) continue;
    const threshold = s?.drop_threshold ?? 15;
    const kinds: { kind: string; note: string }[] = [];
    if (w.max_price != null && o.price <= Number(w.max_price)) kinds.push({ kind: "threshold", note: `sous votre seuil de ${Number(w.max_price).toFixed(0)} €` });
    if (o.prevPrice && ((o.prevPrice - o.price) / o.prevPrice) * 100 >= threshold)
      kinds.push({ kind: "drop", note: `baisse de ${Math.round(((o.prevPrice - o.price) / o.prevPrice) * 100)} % (avant ${o.prevPrice.toFixed(2)} €)` });
    for (const k of kinds) {
      const { data: already } = await db.from("alert_log").select("id").eq("user_id", w.user_id)
        .eq("offer_id", o.offerId).eq("kind", k.kind).gte("sent_at", since).limit(1);
      if (already?.length) continue;
      const to = await userEmail(w.user_id, s?.email ?? null);
      if (!to) continue;
      try {
        await sendEmail(to, `🔔 ${o.gpuName} à ${o.price.toFixed(2)} € chez ${storeName(o.store)}`,
          emailLayout(`Alerte prix : ${o.gpuName}`, offerRow({ title: o.title, store: storeName(o.store), price: o.price, url: o.url, note: k.note })));
        await db.from("alert_log").insert({ user_id: w.user_id, offer_id: o.offerId, kind: k.kind, price: o.price });
      } catch (e) { console.error("alert email failed", e); }
    }
  }
}

/** Build and send the daily report for one user. */
export async function sendDailyReport(userId: string) {
  const db = supabaseAdmin;
  const { data: s } = await db.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  const to = await userEmail(userId, s?.email ?? null);
  if (!to) return false;
  const brands = s?.brands ?? ["NVIDIA", "AMD", "Intel"];
  const stores = s?.stores ?? STORES.map((x) => x.id);
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();

  const { data: offers } = await db.from("offers").select("*, gpus!inner(name,brand)").in("store", stores).in("gpus.brand", brands);
  const all = (offers ?? []).map((o) => ({ ...o, price: Number(o.price), old_price: o.old_price ? Number(o.old_price) : null }));
  const inStock = all.filter((o) => o.in_stock && (!s?.budget_max || o.price <= Number(s.budget_max)));

  const bestByGpu = new Map<string, (typeof all)[number]>();
  for (const o of inStock) { const b = bestByGpu.get(o.gpu_id); if (!b || o.price < b.price) bestByGpu.set(o.gpu_id, o); }
  const best = [...bestByGpu.values()].sort((a, b) => a.price - b.price).slice(0, 8);
  const promos = inStock.filter((o) => o.old_price && (o.old_price - o.price) / o.old_price >= 0.1)
    .sort((a, b) => (b.old_price! - b.price) / b.old_price! - (a.old_price! - a.price) / a.old_price!).slice(0, 6);
  const fresh = inStock.filter((o) => o.first_seen_at >= since).slice(0, 6);

  const { data: hist } = await db.from("price_history").select("offer_id,price,recorded_at").gte("recorded_at", new Date(Date.now() - 48 * 3600_000).toISOString()).order("recorded_at");
  const firstPrice = new Map<string, number>();
  for (const h of hist ?? []) if (!firstPrice.has(h.offer_id)) firstPrice.set(h.offer_id, Number(h.price));
  const drops = inStock.filter((o) => (firstPrice.get(o.id) ?? 0) > o.price).slice(0, 6);

  const { data: watch } = await db.from("watchlist").select("gpu_id").eq("user_id", userId);
  const watched = new Set((watch ?? []).map((w) => w.gpu_id));
  const oos = all.filter((o) => !o.in_stock && watched.has(o.gpu_id)).slice(0, 6);

  const section = (t: string, items: string[]) => `<h2 style="font-size:16px;margin:22px 0 10px">${t}</h2>${items.length ? items.join("") : '<p style="color:#8a8f99;font-size:13px">Rien à signaler.</p>'}`;
  const row = (o: (typeof all)[number], note?: string) => offerRow({ title: o.title, store: storeName(o.store), price: o.price, old_price: o.old_price, url: o.url, note });

  const html = emailLayout("Votre rapport du jour", [
    section("Meilleures offres du jour", best.map((o) => row(o, o.gpus.name))),
    section("Baisses de prix", drops.map((o) => row(o, `avant ${firstPrice.get(o.id)!.toFixed(2)} €`))),
    section("Nouvelles cartes détectées", fresh.map((o) => row(o))),
    section("Promotions intéressantes", promos.map((o) => row(o))),
    section("Indisponibles / en rupture (vos cartes suivies)", oos.map((o) => row(o, "rupture"))),
  ].join(""));
  if (!all.length) return false;
  await sendEmail(to, `GPU Price Tracker · rapport du ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`, html);
  return true;
}
