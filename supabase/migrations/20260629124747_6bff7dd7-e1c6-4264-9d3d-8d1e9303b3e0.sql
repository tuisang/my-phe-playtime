-- Expand grade range to include PP1 (-1), PP2 (0), and Grades 1-12
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_grade_check;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_grade_check CHECK (grade >= -1 AND grade <= 12);

ALTER TABLE public.topics DROP CONSTRAINT IF EXISTS topics_grade_check;
ALTER TABLE public.topics ADD CONSTRAINT topics_grade_check CHECK (grade >= -1 AND grade <= 12);