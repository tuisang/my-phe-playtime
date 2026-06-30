
-- Storage policies for lesson-media bucket
CREATE POLICY "Admins can upload lesson media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update lesson media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lesson-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete lesson media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lesson-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read lesson media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lesson-media');
