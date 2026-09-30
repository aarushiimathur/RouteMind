CREATE TABLE public.conversation_state (
  conversation_id UUID NOT NULL PRIMARY KEY,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.conversation_state TO service_role;
ALTER TABLE public.conversation_state ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER conversation_state_touch BEFORE UPDATE ON public.conversation_state FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();