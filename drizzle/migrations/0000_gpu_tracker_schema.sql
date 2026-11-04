CREATE TABLE public.gpus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  brand text NOT NULL CHECK (brand IN ('NVIDIA','AMD','Intel')),
  search_query text NOT NULL,
  match_token text NOT NULL,
  last_refreshed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.gpus TO authenticated;
GRANT ALL ON public.gpus TO service_role;
ALTER TABLE public.gpus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read gpus" ON public.gpus FOR SELECT TO authenticated USING (true);
CREATE POLICY "add gpus" ON public.gpus FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gpu_id uuid NOT NULL REFERENCES public.gpus(id) ON DELETE CASCADE,
  store text NOT NULL,
  title text NOT NULL,
  url text NOT NULL UNIQUE,
  price numeric(10,2) NOT NULL,
  old_price numeric(10,2),
  in_stock boolean NOT NULL DEFAULT true,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.offers(gpu_id);
GRANT SELECT ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read offers" ON public.offers FOR SELECT TO authenticated USING (true);

CREATE TABLE public.price_history (
  id bigserial PRIMARY KEY,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  gpu_id uuid NOT NULL REFERENCES public.gpus(id) ON DELETE CASCADE,
  price numeric(10,2) NOT NULL,
  in_stock boolean NOT NULL DEFAULT true,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.price_history(gpu_id, recorded_at);
GRANT SELECT ON public.price_history TO authenticated;
GRANT ALL ON public.price_history TO service_role;
GRANT USAGE ON SEQUENCE public.price_history_id_seq TO service_role;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read history" ON public.price_history FOR SELECT TO authenticated USING (true);

CREATE TABLE public.store_status (
  store text PRIMARY KEY,
  last_success_at timestamptz,
  last_error text,
  last_attempt_at timestamptz
);
GRANT SELECT ON public.store_status TO authenticated;
GRANT ALL ON public.store_status TO service_role;
ALTER TABLE public.store_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read store status" ON public.store_status FOR SELECT TO authenticated USING (true);

CREATE TABLE public.scrape_jobs (
  url text PRIMARY KEY,
  gpu_id uuid NOT NULL REFERENCES public.gpus(id) ON DELETE CASCADE,
  store text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.scrape_jobs TO service_role;
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY,
  email text,
  budget_max numeric(10,2),
  brands text[] NOT NULL DEFAULT ARRAY['NVIDIA','AMD','Intel'],
  stores text[] NOT NULL DEFAULT ARRAY['amazon','topachat','ldlc','cdiscount','materielnet','rueducommerce','backmarket'],
  refresh_hours int NOT NULL DEFAULT 6 CHECK (refresh_hours BETWEEN 1 AND 48),
  drop_threshold int NOT NULL DEFAULT 15 CHECK (drop_threshold BETWEEN 1 AND 90),
  daily_report boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings select" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own settings insert" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own settings update" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gpu_id uuid NOT NULL REFERENCES public.gpus(id) ON DELETE CASCADE,
  max_price numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gpu_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own watch" ON public.watchlist FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.alert_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  kind text NOT NULL,
  price numeric(10,2) NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.alert_log(user_id, offer_id, kind, sent_at);
GRANT SELECT ON public.alert_log TO authenticated;
GRANT ALL ON public.alert_log TO service_role;
GRANT USAGE ON SEQUENCE public.alert_log_id_seq TO service_role;
ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts" ON public.alert_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.gpus (name, brand, search_query, match_token) VALUES
('GeForce RTX 5090','NVIDIA','RTX 5090','5090'),
('GeForce RTX 5080','NVIDIA','RTX 5080','5080'),
('GeForce RTX 5070 Ti','NVIDIA','RTX 5070 Ti','5070 ti'),
('GeForce RTX 5070','NVIDIA','RTX 5070','5070'),
('GeForce RTX 5060 Ti','NVIDIA','RTX 5060 Ti','5060 ti'),
('GeForce RTX 5060','NVIDIA','RTX 5060','5060'),
('GeForce RTX 4060','NVIDIA','RTX 4060','4060'),
('GeForce GTX 1650','NVIDIA','GTX 1650','1650'),
('Radeon RX 9070 XT','AMD','RX 9070 XT','9070 xt'),
('Radeon RX 9070','AMD','RX 9070','9070'),
('Radeon RX 9060 XT','AMD','RX 9060 XT','9060 xt'),
('Radeon RX 7600','AMD','RX 7600','7600'),
('Arc B580','Intel','Arc B580','b580'),
('Arc B570','Intel','Arc B570','b570'),
('Arc A750','Intel','Arc A750','a750');