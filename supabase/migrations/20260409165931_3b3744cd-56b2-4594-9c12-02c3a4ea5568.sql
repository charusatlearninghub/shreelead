
-- Create lead_requests table
CREATE TABLE public.lead_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_leads integer NOT NULL DEFAULT 10,
  gender text NOT NULL DEFAULT 'mix',
  language text NOT NULL DEFAULT 'mix',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  reviewed_by_admin uuid,
  promo_code_id uuid
);

ALTER TABLE public.lead_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.lead_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own requests" ON public.lead_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests" ON public.lead_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests" ON public.lead_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Function: consume_promo_code_for_download
CREATE OR REPLACE FUNCTION public.consume_promo_code_for_download(p_promo_code text)
RETURNS SETOF public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo record;
  v_user_id uuid;
  v_lead_count integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get and lock the promo code
  SELECT * INTO v_promo FROM public.promo_codes
    WHERE code = p_promo_code
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid promo code.';
  END IF;

  IF v_promo.is_used THEN
    RAISE EXCEPTION 'This promo code has already been used.';
  END IF;

  -- Check assignment
  IF v_promo.assigned_user_id IS NOT NULL AND v_promo.assigned_user_id != v_user_id THEN
    RAISE EXCEPTION 'This promo code is not assigned to you.';
  END IF;

  v_lead_count := v_promo.total_leads;

  -- Mark matching leads as sold
  WITH selected_leads AS (
    SELECT id FROM public.leads
    WHERE status = 'new'
      AND (v_promo.gender = 'mix' OR gender = v_promo.gender)
      AND (v_promo.language = 'mix' OR language = v_promo.language)
    ORDER BY uploaded_at ASC
    LIMIT v_lead_count
    FOR UPDATE
  )
  UPDATE public.leads SET
    status = 'sold',
    sold_to = v_user_id,
    sold_at = now()
  WHERE id IN (SELECT id FROM selected_leads);

  -- Mark promo code as used
  UPDATE public.promo_codes SET
    is_used = true,
    used_by = v_user_id,
    used_at = now()
  WHERE id = v_promo.id;

  -- Record download history
  INSERT INTO public.download_history (user_id, lead_count, promo_code, filters)
  VALUES (
    v_user_id,
    (SELECT count(*) FROM public.leads WHERE sold_to = v_user_id AND sold_at >= now() - interval '5 seconds'),
    p_promo_code,
    jsonb_build_object('gender', v_promo.gender, 'language', v_promo.language)
  );

  -- Return the sold leads
  RETURN QUERY
    SELECT * FROM public.leads
    WHERE sold_to = v_user_id AND sold_at >= now() - interval '5 seconds'
    ORDER BY uploaded_at ASC;
END;
$$;

-- Function: approve_lead_request
CREATE OR REPLACE FUNCTION public.approve_lead_request(p_request_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
  v_admin_id uuid;
  v_code text;
  v_promo_id uuid;
BEGIN
  v_admin_id := auth.uid();
  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve requests';
  END IF;

  SELECT * INTO v_request FROM public.lead_requests
    WHERE id = p_request_id AND status = 'pending'
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed.';
  END IF;

  -- Generate a unique promo code
  v_code := 'PROMO-' || upper(substr(md5(random()::text), 1, 8));

  -- Create promo code
  INSERT INTO public.promo_codes (code, total_leads, gender, language, assigned_user_id, created_by_admin)
  VALUES (v_code, v_request.requested_leads, v_request.gender, v_request.language, v_request.user_id, v_admin_id)
  RETURNING id INTO v_promo_id;

  -- Update request
  UPDATE public.lead_requests SET
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = v_admin_id,
    reviewed_by_admin = v_admin_id,
    promo_code_id = v_promo_id
  WHERE id = p_request_id;

  RETURN v_code;
END;
$$;
