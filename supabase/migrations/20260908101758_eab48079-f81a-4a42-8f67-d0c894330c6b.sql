CREATE TABLE public.user_memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_memories TO authenticated;
GRANT ALL ON public.user_memories TO service_role;

ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own memories" ON public.user_memories FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX user_memories_user_id_created_at_idx ON public.user_memories (user_id, created_at DESC);