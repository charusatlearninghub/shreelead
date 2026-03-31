
-- Function to make a user admin by email (to be called via insert tool)
-- This is a helper for initial admin setup
CREATE OR REPLACE FUNCTION public.make_admin_by_email(admin_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT user_id INTO target_user_id FROM public.profiles WHERE email = admin_email LIMIT 1;
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
