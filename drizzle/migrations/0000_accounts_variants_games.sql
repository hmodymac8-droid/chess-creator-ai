CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  prompt text NOT NULL,
  rules jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.variants TO authenticated;
GRANT ALL ON public.variants TO service_role;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads variants" ON public.variants FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owner adds variants" ON public.variants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner deletes variants" ON public.variants FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL DEFAULT auth.uid(),
  guest_id uuid,
  host_name text NOT NULL,
  guest_name text,
  rules jsonb NOT NULL,
  board jsonb NOT NULL,
  turn text NOT NULL DEFAULT 'w',
  last jsonb,
  minutes int NOT NULL DEFAULT 10,
  inc int NOT NULL DEFAULT 0,
  clock_w bigint NOT NULL DEFAULT 600000,
  clock_b bigint NOT NULL DEFAULT 600000,
  moved_at timestamptz,
  status text NOT NULL DEFAULT 'waiting',
  winner text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players or open invites read" ON public.games FOR SELECT TO authenticated
  USING (host_id = auth.uid() OR guest_id = auth.uid() OR guest_id IS NULL);
CREATE POLICY "Host creates game" ON public.games FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
CREATE POLICY "Players update game" ON public.games FOR UPDATE TO authenticated
  USING (host_id = auth.uid() OR guest_id = auth.uid())
  WITH CHECK (host_id = auth.uid() OR guest_id = auth.uid());

CREATE OR REPLACE FUNCTION public.join_game(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT username INTO _name FROM public.profiles WHERE id = auth.uid();
  UPDATE public.games SET guest_id = auth.uid(), guest_name = _name, status = 'playing'
  WHERE id = _id AND guest_id IS NULL AND host_id <> auth.uid();
END $$;
REVOKE EXECUTE ON FUNCTION public.join_game(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.join_game(uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.games;