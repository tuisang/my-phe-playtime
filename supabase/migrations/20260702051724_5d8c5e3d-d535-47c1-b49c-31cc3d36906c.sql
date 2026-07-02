
-- Allow authenticated users to insert their OWN non-admin role (for signup role selection)
CREATE POLICY "Users can insert their own non-admin role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role <> 'admin'::app_role);

-- Progress tracking
CREATE TABLE public.topic_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_progress TO authenticated;
GRANT ALL ON public.topic_progress TO service_role;

ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress"
ON public.topic_progress
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all progress"
ON public.topic_progress
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_topic_progress_user ON public.topic_progress(user_id);
CREATE INDEX idx_topic_progress_topic ON public.topic_progress(topic_id);
