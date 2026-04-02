-- Helper function to refresh PostgREST schema cache when new columns are added.
CREATE OR REPLACE FUNCTION public.refresh_postgrest_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_postgrest_schema_cache() TO authenticated;
