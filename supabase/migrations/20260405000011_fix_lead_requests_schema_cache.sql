-- Ensure lead_requests table exists for user/admin lead request workflow.
-- This migration is idempotent and safe for partially migrated environments.

CREATE TABLE IF NOT EXISTS public.lead_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_leads integer NOT NULL CHECK (requested_leads > 0),
  gender text NOT NULL,
  language text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  promo_code text,
  reviewed_by_admin uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  promo_code_id uuid REFERENCES public.promo_codes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure required columns exist in environments where the table was created earlier.
ALTER TABLE public.lead_requests
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS reviewed_by_admin uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id);

-- Ensure defaults required by the app.
ALTER TABLE public.lead_requests
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN created_at SET DEFAULT now();

-- Ensure table is protected and works with Supabase auth.
ALTER TABLE public.lead_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create lead requests" ON public.lead_requests;
CREATE POLICY "Users can create lead requests"
  ON public.lead_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own lead requests" ON public.lead_requests;
CREATE POLICY "Users can view own lead requests"
  ON public.lead_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all lead requests" ON public.lead_requests;
CREATE POLICY "Admins can view all lead requests"
  ON public.lead_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update lead requests" ON public.lead_requests;
CREATE POLICY "Admins can update lead requests"
  ON public.lead_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_lead_requests_user_id ON public.lead_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_requests_status ON public.lead_requests(status);

-- Refresh PostgREST schema cache so Supabase API sees lead_requests immediately.
NOTIFY pgrst, 'reload schema';
