import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const gpusQuery = queryOptions({
  queryKey: ["gpus"],
  queryFn: async () => {
    const { data, error } = await supabase.from("gpus").select("*").order("brand").order("name");
    if (error) throw error;
    return data;
  },
});

export const offersQuery = queryOptions({
  queryKey: ["offers"],
  queryFn: async () => {
    const { data, error } = await supabase.from("offers").select("*").order("price");
    if (error) throw error;
    return data.map((o) => ({ ...o, price: Number(o.price), old_price: o.old_price == null ? null : Number(o.old_price) }));
  },
});

export const storeStatusQuery = queryOptions({
  queryKey: ["store_status"],
  queryFn: async () => {
    const { data, error } = await supabase.from("store_status").select("*");
    if (error) throw error;
    return data;
  },
});

export const batchesQuery = queryOptions({
  queryKey: ["batches"],
  queryFn: async () => {
    const { data, error } = await supabase.from("scrape_batches").select("*").order("started_at", { ascending: false }).limit(5);
    if (error) throw error;
    return data;
  },
});

export const watchlistQuery = queryOptions({
  queryKey: ["watchlist"],
  queryFn: async () => {
    const { data, error } = await supabase.from("watchlist").select("*");
    if (error) throw error;
    return data;
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user!.id;
    const { data } = await supabase.from("user_settings").select("*").eq("user_id", uid).maybeSingle();
    if (data) return data;
    const { data: created, error } = await supabase.from("user_settings").insert({ user_id: uid, email: u.user!.email }).select().single();
    if (error) throw error;
    return created;
  },
});

export const historyQuery = (gpuId: string) => queryOptions({
  queryKey: ["history", gpuId],
  queryFn: async () => {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data, error } = await supabase.from("price_history").select("price,recorded_at,offer_id,in_stock")
      .eq("gpu_id", gpuId).gte("recorded_at", since).order("recorded_at");
    if (error) throw error;
    return data.map((h) => ({ ...h, price: Number(h.price) }));
  },
});

export const alertLogQuery = queryOptions({
  queryKey: ["alert_log"],
  queryFn: async () => {
    const { data, error } = await supabase.from("alert_log").select("*, offers(title,store,url)").order("sent_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data;
  },
});
