CREATE OR REPLACE FUNCTION public.auto_set_promo_is_used()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.used_by IS NOT NULL THEN
    NEW.is_used := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_promo_is_used
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_promo_is_used();