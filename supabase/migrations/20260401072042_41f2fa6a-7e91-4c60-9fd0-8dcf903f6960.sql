
-- Add gender column to leads
ALTER TABLE public.leads ADD COLUMN gender text NOT NULL DEFAULT '-';

-- Create download_history table
CREATE TABLE public.download_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_count integer NOT NULL,
  promo_code text NOT NULL,
  downloaded_at timestamp with time zone NOT NULL DEFAULT now(),
  filters jsonb DEFAULT '{}'
);

ALTER TABLE public.download_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own download history
CREATE POLICY "Users can view own download history"
  ON public.download_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own download history
CREATE POLICY "Users can insert own download history"
  ON public.download_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all download history
CREATE POLICY "Admins can view all download history"
  ON public.download_history FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
