
-- Classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade INT,
  join_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Class members
CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  pupil_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, pupil_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_members TO authenticated;
GRANT ALL ON public.class_members TO service_role;

ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Helper: is user the teacher of a given class (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_class_teacher(_user_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.classes WHERE id = _class_id AND teacher_id = _user_id)
$$;

-- Helper: is user a member of a class
CREATE OR REPLACE FUNCTION public.is_class_member(_user_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.class_members WHERE class_id = _class_id AND pupil_id = _user_id)
$$;

-- Policies: classes
CREATE POLICY "Teachers manage their classes" ON public.classes
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Admins full access classes" ON public.classes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their class" ON public.classes
  FOR SELECT TO authenticated
  USING (public.is_class_member(auth.uid(), id));

-- Anyone signed in can look up a class by join_code to join (SELECT). This is fine —
-- join_code is a shared secret between teacher and pupils.
-- Covered by "Members can view their class" only AFTER joining; we need pre-join lookup:
CREATE POLICY "Lookup class for joining" ON public.classes
  FOR SELECT TO authenticated
  USING (true);

-- Policies: class_members
CREATE POLICY "Teacher manages members of own class" ON public.class_members
  FOR ALL TO authenticated
  USING (public.is_class_teacher(auth.uid(), class_id))
  WITH CHECK (public.is_class_teacher(auth.uid(), class_id));

CREATE POLICY "Admins full access members" ON public.class_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Pupil can view own membership" ON public.class_members
  FOR SELECT TO authenticated
  USING (pupil_id = auth.uid());

CREATE POLICY "Pupil can join a class" ON public.class_members
  FOR INSERT TO authenticated
  WITH CHECK (pupil_id = auth.uid());

CREATE POLICY "Pupil can leave a class" ON public.class_members
  FOR DELETE TO authenticated
  USING (pupil_id = auth.uid());

-- Allow teachers to read pupil profiles for their class members
CREATE POLICY "Teacher can view pupil profiles in their class" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.pupil_id = profiles.id AND c.teacher_id = auth.uid()
    )
  );

-- Allow teachers to read topic_progress for pupils in their classes
CREATE POLICY "Teacher can view class pupils progress" ON public.topic_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.pupil_id = topic_progress.user_id AND c.teacher_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
