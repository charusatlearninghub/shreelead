DROP TRIGGER IF EXISTS set_promo_is_used ON public.promo_codes;
DROP FUNCTION IF EXISTS public.auto_set_promo_is_used();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';