-- Add is_used column to promo_codes table for explicit marking
ALTER TABLE public.promo_codes ADD COLUMN is_used BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing records where used_by is not null to mark as used
UPDATE public.promo_codes SET is_used = TRUE WHERE used_by IS NOT NULL;

-- Update RLS policies to be stricter
-- Drop old policies
DROP POLICY IF EXISTS "Users can view unused promo codes for validation" ON public.promo_codes;
DROP POLICY IF EXISTS "Users can use promo codes" ON public.promo_codes;

-- Create new policies
-- Users can only view unused promo codes
CREATE POLICY "Users can view unused promo codes for validation" ON public.promo_codes
  FOR SELECT TO authenticated
  USING (is_used = FALSE);

-- Users can only update unused promo codes to mark as used
CREATE POLICY "Users can use promo codes" ON public.promo_codes
  FOR UPDATE TO authenticated
  USING (is_used = FALSE AND used_by IS NULL)
  WITH CHECK (is_used = TRUE AND used_by = auth.uid());

-- Create an index on is_used to speed up queries
CREATE INDEX idx_promo_codes_is_used ON public.promo_codes(is_used);

-- Create an index on code for faster lookups
CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);
