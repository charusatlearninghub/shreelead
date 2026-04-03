DROP POLICY IF EXISTS "Users can use promo codes" ON public.promo_codes;

CREATE POLICY "Users can use promo codes"
ON public.promo_codes
FOR UPDATE
TO authenticated
USING (used_by IS NULL)
WITH CHECK (used_by = auth.uid());