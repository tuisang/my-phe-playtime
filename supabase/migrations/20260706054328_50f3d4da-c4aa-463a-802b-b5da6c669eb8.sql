CREATE TABLE public.translation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_hash text NOT NULL,
  target_lang text NOT NULL,
  source_text text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_hash, target_lang)
);

GRANT SELECT ON public.translation_cache TO anon, authenticated;
GRANT ALL ON public.translation_cache TO service_role;

ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached translations"
ON public.translation_cache FOR SELECT
USING (true);

CREATE INDEX idx_translation_cache_lookup ON public.translation_cache (source_hash, target_lang);