-- Keep lead_requests approval metadata aligned with required columns.

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
    reviewed_by_admin = auth.uid(),
    reviewed_at = now(),
    promo_code_id = v_promo_id,
    promo_code = v_new_code
  WHERE id = p_request_id;

  RETURN v_new_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_lead_request(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
