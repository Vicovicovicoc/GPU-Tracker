CREATE TABLE public.scrape_batches (
  id text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  url_count int NOT NULL DEFAULT 0,
  ingested_at timestamptz,
  error text
);
GRANT SELECT ON public.scrape_batches TO authenticated;
GRANT ALL ON public.scrape_batches TO service_role;
ALTER TABLE public.scrape_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read batches" ON public.scrape_batches FOR SELECT TO authenticated USING (true);