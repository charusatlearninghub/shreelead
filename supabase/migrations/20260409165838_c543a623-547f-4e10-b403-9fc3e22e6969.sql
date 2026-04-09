
-- Add lead configuration columns to promo_codes
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS total_leads integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'mix',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'mix',
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_admin uuid;
