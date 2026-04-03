-- Ensure the leads table has the columns required by the upload system.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS language TEXT;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS gender TEXT;

-- Backfill existing rows so the columns are safe to use immediately.
UPDATE public.leads
SET language = COALESCE(NULLIF(language, ''), 'mix')
WHERE language IS NULL OR language = '';

UPDATE public.leads
SET gender = COALESCE(NULLIF(gender, ''), 'mix')
WHERE gender IS NULL OR gender = '';

-- Apply defaults and constraints expected by the app.
ALTER TABLE public.leads
  ALTER COLUMN language SET DEFAULT 'mix',
  ALTER COLUMN language SET NOT NULL;

ALTER TABLE public.leads
  ALTER COLUMN gender SET DEFAULT 'mix',
  ALTER COLUMN gender SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leads_language_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_language_check
      CHECK (language IN ('gujarati', 'hindi', 'mix'));
  END IF;
END $$;

-- Refresh PostgREST schema cache so the API recognizes the new column immediately.
SELECT public.refresh_postgrest_schema_cache();
