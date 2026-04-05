-- Enforce admin-controlled promo-based lead downloads and add lead request workflow.

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS total_leads integer,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_by_admin uuid REFERENCES auth.users(id);

UPDATE public.promo_codes
SET total_leads = 1
WHERE total_leads IS NULL OR total_leads < 1;

UPDATE public.promo_codes
SET gender = 'mix'
WHERE gender IS NULL OR gender = '';

UPDATE public.promo_codes
SET language = 'mix'
WHERE language IS NULL OR language = '';

UPDATE public.promo_codes
SET assigned_user_id = COALESCE(assigned_user_id, used_by)
WHERE assigned_user_id IS NULL;

ALTER TABLE public.promo_codes
  ALTER COLUMN total_leads SET DEFAULT 1,
  ALTER COLUMN total_leads SET NOT NULL,
  ALTER COLUMN gender SET DEFAULT 'mix',
  ALTER COLUMN gender SET NOT NULL,
  ALTER COLUMN language SET DEFAULT 'mix',
  ALTER COLUMN language SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'promo_codes_total_leads_check'
  ) THEN
    ALTER TABLE public.promo_codes
      ADD CONSTRAINT promo_codes_total_leads_check
      CHECK (total_leads > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'promo_codes_gender_check'
  ) THEN
    ALTER TABLE public.promo_codes
      ADD CONSTRAINT promo_codes_gender_check
      CHECK (gender IN ('male', 'female', 'mix'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'promo_codes_language_check'
  ) THEN
    ALTER TABLE public.promo_codes
      ADD CONSTRAINT promo_codes_language_check
      CHECK (language IN ('gujarati', 'hindi', 'mix'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lead_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_leads integer NOT NULL CHECK (requested_leads > 0),
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'mix')),
  language text NOT NULL CHECK (language IN ('gujarati', 'hindi', 'mix')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  promo_code_id uuid REFERENCES public.promo_codes(id)
);

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

DROP POLICY IF EXISTS "Users can view unused promo codes for validation" ON public.promo_codes;
DROP POLICY IF EXISTS "Users can use promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Users can view assigned promo codes" ON public.promo_codes;

CREATE POLICY "Users can view assigned promo codes"
  ON public.promo_codes
  FOR SELECT
  TO authenticated
  USING (assigned_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_promo_codes_assigned_user_id ON public.promo_codes(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_used_assigned ON public.promo_codes(is_used, assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_lead_requests_user_id ON public.lead_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_requests_status ON public.lead_requests(status);

CREATE OR REPLACE FUNCTION public.consume_promo_code_for_download(p_promo_code text)
RETURNS TABLE (
  full_name text,
  phone_number text,
  city text,
  state text,
  gender text,
  language text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo public.promo_codes%ROWTYPE;
  v_now timestamptz := now();
  v_lead_ids uuid[];
  v_selected_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_promo
  FROM public.promo_codes
  WHERE upper(code) = upper(trim(p_promo_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promo code not found';
  END IF;

  IF v_promo.assigned_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Promo code is not assigned to this user';
  END IF;

  IF v_promo.is_used THEN
    RAISE EXCEPTION 'Promo code has already been used';
  END IF;

  WITH candidate_leads AS (
    SELECT l.id
    FROM public.leads l
    WHERE l.status = 'new'
      AND (v_promo.gender = 'mix' OR l.gender = v_promo.gender)
      AND (v_promo.language = 'mix' OR l.language = v_promo.language)
    ORDER BY l.uploaded_at DESC
    LIMIT v_promo.total_leads
    FOR UPDATE SKIP LOCKED
  )
  SELECT ARRAY_AGG(id), COUNT(*)
  INTO v_lead_ids, v_selected_count
  FROM candidate_leads;

  IF v_selected_count < v_promo.total_leads THEN
    RAISE EXCEPTION 'Not enough leads available for this promo code';
  END IF;

  UPDATE public.leads
  SET
    status = 'sold',
    sold_to = auth.uid(),
    sold_at = v_now
  WHERE id = ANY(v_lead_ids);

  UPDATE public.promo_codes
  SET
    is_used = true,
    used_by = auth.uid(),
    used_at = v_now
  WHERE id = v_promo.id;

  INSERT INTO public.download_history (user_id, lead_count, promo_code, filters)
  VALUES (
    auth.uid(),
    v_promo.total_leads,
    v_promo.code,
    jsonb_build_object('gender', v_promo.gender, 'language', v_promo.language)
  );

  RETURN QUERY
  SELECT
    l.full_name,
    l.phone_number,
    l.city,
    l.state,
    l.gender,
    l.language
  FROM public.leads l
  WHERE l.id = ANY(v_lead_ids)
  ORDER BY l.uploaded_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_promo_code_for_download(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_lead_request(p_request_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.lead_requests%ROWTYPE;
  v_new_code text;
  v_promo_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve lead requests';
  END IF;

  SELECT *
  INTO v_request
  FROM public.lead_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Lead request has already been processed';
  END IF;

  LOOP
    v_new_code := 'PROMO' || to_char(floor(random() * 1000000)::int, 'FM000000');
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.promo_codes
      WHERE code = v_new_code
    );
  END LOOP;

  INSERT INTO public.promo_codes (
    code,
    total_leads,
    gender,
    language,
    assigned_user_id,
    created_by_admin,
    is_used
  )
  VALUES (
    v_new_code,
    v_request.requested_leads,
    v_request.gender,
    v_request.language,
    v_request.user_id,
    auth.uid(),
    false
  )
  RETURNING id INTO v_promo_id;

  UPDATE public.lead_requests
  SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    promo_code_id = v_promo_id
  WHERE id = p_request_id;

  RETURN v_new_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_lead_request(uuid) TO authenticated;

SELECT public.refresh_postgrest_schema_cache();
