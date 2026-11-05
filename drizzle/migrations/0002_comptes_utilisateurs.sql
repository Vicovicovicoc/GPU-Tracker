-- Comptes utilisateurs : réglages créés à l'inscription et rôle administrateur.

-- 1. Création automatique de la ligne user_settings à chaque nouvelle inscription.
--    Le client crée déjà cette ligne au premier affichage (settingsQuery) ; le
--    déclencheur la rend indépendante de la navigation de l'utilisateur.
--    ON CONFLICT DO NOTHING : l'inscription ne peut jamais échouer à cause de ce déclencheur.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Rôles. Seul 'admin' existe pour l'instant.
--    Aucune politique d'écriture pour les utilisateurs connectés : les rôles ne
--    s'attribuent que depuis l'éditeur SQL ou avec la clé de service.
--    Pour nommer un administrateur :
--      INSERT INTO public.user_roles (user_id, role)
--      SELECT id, 'admin' FROM auth.users WHERE email = 'adresse@exemple.fr';
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  PRIMARY KEY (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- SECURITY DEFINER : la fonction lit user_roles sans dépendre des politiques de l'appelant.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3. Seuls les administrateurs ajoutent des cartes graphiques : chaque carte ajoutée
--    déclenche des relevés chez les boutiques, ce qui ne doit pas être ouvert à tous les comptes.
--    Le relevé des prix passe par la clé de service et n'est pas concerné.
DROP POLICY IF EXISTS "add gpus" ON public.gpus;
CREATE POLICY "admins add gpus" ON public.gpus FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
