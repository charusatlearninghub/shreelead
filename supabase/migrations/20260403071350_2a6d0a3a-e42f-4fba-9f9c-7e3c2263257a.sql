ALTER TABLE public.promo_codes ADD COLUMN is_used boolean NOT NULL DEFAULT false;

UPDATE public.promo_codes SET is_used = true WHERE used_by IS NOT NULL;

CREATE POLICY "Admins can delete promo codes"
ON public.promo_codes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));