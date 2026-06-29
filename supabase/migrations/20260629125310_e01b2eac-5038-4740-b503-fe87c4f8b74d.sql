-- Resource type enum
CREATE TYPE public.resource_type AS ENUM (
  'pdf_notes',
  'whiteboard_animation',
  'video',
  'readable_notes'
);

-- Topic resources table
CREATE TABLE public.topic_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  type public.resource_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.topic_resources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_resources TO authenticated;
GRANT ALL ON public.topic_resources TO service_role;

ALTER TABLE public.topic_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view resources of published topics"
  ON public.topic_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      WHERE t.id = topic_resources.topic_id
        AND (t.published = true OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can insert topic resources"
  ON public.topic_resources FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update topic resources"
  ON public.topic_resources FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete topic resources"
  ON public.topic_resources FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_topic_resources_topic_id ON public.topic_resources(topic_id);
CREATE INDEX idx_topic_resources_type ON public.topic_resources(type);

CREATE TRIGGER update_topic_resources_updated_at
  BEFORE UPDATE ON public.topic_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();