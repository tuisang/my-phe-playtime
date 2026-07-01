
-- RLS policies for new dedicated buckets: pdfs, illustrations, videos
-- Admins: full access. Authenticated users: read (download signing done via edge fn using service role).

DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['pdfs','illustrations','videos'] LOOP
    EXECUTE format($f$
      CREATE POLICY "admin_all_%1$s" ON storage.objects
        FOR ALL TO authenticated
        USING (bucket_id = %1$L AND public.has_role(auth.uid(), 'admin'))
        WITH CHECK (bucket_id = %1$L AND public.has_role(auth.uid(), 'admin'));
    $f$, b);
    EXECUTE format($f$
      CREATE POLICY "auth_read_%1$s" ON storage.objects
        FOR SELECT TO authenticated
        USING (bucket_id = %1$L);
    $f$, b);
  END LOOP;
END $$;
