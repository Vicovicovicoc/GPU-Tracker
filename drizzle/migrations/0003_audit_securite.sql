-- Audit de sécurité : has_role limité à l'appelant, limitation de débit côté base.
-- Prérequis : migration 0002 (table user_roles, fonction has_role).

-- 1. has_role ne répond plus que pour l'utilisateur connecté.
--    Avant : la fonction (SECURITY DEFINER, exécutable par tout utilisateur connecté) acceptait n'importe
--    quel _user_id. Un utilisateur pouvait donc appeler rpc('has_role', { _user_id: <autre uuid>, _role: 'admin' })
--    et savoir qui est administrateur, alors que la politique "own roles" de user_roles interdit
--    de lire les rôles des autres.
--    Maintenant : pour un autre _user_id, la fonction retourne false, comme pour un utilisateur sans rôle,
--    donc rien ne permet de les distinguer. Seuls les appels dont le jeton porte explicitement
--    role = 'service_role' (clé de service) ne sont pas restreints, et seulement si le rôle PostgreSQL actif
--    est aussi service_role (PostgreSQL fait SET ROLE depuis le jeton vérifié ; current_setting('role')
--    reste lisible dans une fonction SECURITY DEFINER). Des claims absents, vides, sans clé « role »,
--    ou qui affirment service_role depuis un autre rôle, ne donnent JAMAIS ce droit : la fonction répond
--    alors false pour tout autre utilisateur.
--    Conséquence : l'éditeur SQL (aucun jeton) n'obtient pas non plus de réponse « true » pour un autre
--    utilisateur ; il lit user_roles directement (SELECT * FROM public.user_roles).
--    La politique "admins add gpus" appelle has_role(auth.uid(), 'admin') : elle n'est pas affectée.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        _user_id = auth.uid()
        OR (
          current_setting('role', true) = 'service_role'
          AND coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
        )
      )
  )
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. user_roles : lecture de ses propres rôles uniquement, aucune écriture depuis le navigateur.
--    Les droits par défaut de Supabase peuvent donner plus que les GRANT de la migration 0002 ;
--    la RLS bloque déjà ces écritures, on retire aussi les droits (défense en profondeur).
REVOKE ALL ON public.user_roles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- 3. Limitation de débit.
--    La table n'est accessible qu'avec la clé de service : RLS activée, aucune politique, aucun droit
--    pour anon et authenticated. Un utilisateur ne peut donc ni lire ni remettre à zéro son compteur.
CREATE TABLE public.rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, action)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.rate_limits TO service_role;

-- Compte une tentative et indique si elle est autorisée (fenêtre fixe, atomique).
--   - première tentative, ou fenêtre expirée : une nouvelle fenêtre commence, tentative autorisée ;
--   - sinon : autorisée tant que le compteur n'a pas atteint _max_count, refusée ensuite
--     (et le compteur ne bouge plus, donc un refus ne prolonge pas la fenêtre).
-- INSERT ... ON CONFLICT DO UPDATE verrouille la ligne : deux requêtes simultanées ne peuvent pas
-- dépasser la limite. Exécutable par service_role uniquement.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _user_id uuid,
  _action text,
  _max_count int,
  _window_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed boolean;
BEGIN
  IF _max_count < 1 OR _window_seconds < 1 THEN
    RAISE EXCEPTION 'paramètres de limitation invalides';
  END IF;

  INSERT INTO public.rate_limits AS r (user_id, action, window_started_at, count)
  VALUES (_user_id, _action, now(), 1)
  ON CONFLICT (user_id, action) DO UPDATE
    SET window_started_at = CASE
          WHEN r.window_started_at <= now() - make_interval(secs => _window_seconds) THEN now()
          ELSE r.window_started_at
        END,
        count = CASE
          WHEN r.window_started_at <= now() - make_interval(secs => _window_seconds) THEN 1
          ELSE r.count + 1
        END
    WHERE r.window_started_at <= now() - make_interval(secs => _window_seconds)
       OR r.count < _max_count
  RETURNING true INTO allowed;

  RETURN coalesce(allowed, false);
END;
$$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(uuid, text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(uuid, text, int, int) TO service_role;
