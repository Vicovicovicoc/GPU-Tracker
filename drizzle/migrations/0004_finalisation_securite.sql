-- Migration corrective : finalisation de la sécurité des comptes utilisateurs.
--
-- Les migrations 0002 et 0003 ne sont volontairement PAS modifiées (elles peuvent avoir été appliquées ailleurs,
-- par exemple dans un autre environnement). Cette migration corrige leurs défauts et réaffirme l'état attendu.
--
-- Prérequis : 0002 puis 0003 appliquées. Une garde ci-dessous l'impose avec un message clair.
-- Idempotente : peut être rejouée sans erreur et sans effet de bord. Ne supprime aucune donnée ni aucune table.

-- 0. Garde : ordre d'exécution.
DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NULL
     OR to_regtype('public.app_role') IS NULL
     OR to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Migration 0002 absente : appliquez 0002 puis 0003 avant 0004.';
  END IF;
  IF to_regclass('public.rate_limits') IS NULL
     OR to_regprocedure('public.consume_rate_limit(uuid,text,integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'Migration 0003 absente : appliquez 0003 avant 0004.';
  END IF;
END $$;

-- 1. has_role : réaffirme la définition finale de 0003 (utilisateur connecté pour lui-même, ou clé de service
--    seulement si le rôle PostgreSQL actif ET le claim JWT valent tous deux 'service_role').
--    Sert de filet de sécurité si une version antérieure (avec un défaut permissif sur les claims absents) a
--    été appliquée quelque part. Le corps doit rester identique à celui de 0003 (vérifié par les tests).
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

-- 2. Déclencheur d'inscription : réglages créés uniquement pour un compte dont l'e-mail est CONFIRMÉ.
--    Défaut corrigé (0002) : la ligne user_settings était créée dès l'inscription, avant toute confirmation,
--    avec daily_report = true et l'adresse saisie. Quelqu'un pouvait donc s'inscrire avec l'adresse d'un tiers
--    et lui faire envoyer le rapport quotidien sans qu'il ait confirmé quoi que ce soit.
--    Maintenant : la ligne est créée à l'inscription si l'e-mail est déjà confirmé (Google, confirmation
--    automatique), sinon au moment de la confirmation (mise à jour de email_confirmed_at).
--    Le déclencheur ne doit jamais bloquer une inscription : toute erreur est signalée en avertissement
--    et la création de la ligne retombe sur le client (settingsQuery).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.user_settings (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user : création des réglages impossible pour % (%)', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- Nettoyage des lignes créées par l'ancien déclencheur pour des comptes encore non confirmés : le rapport
-- quotidien ne leur est plus envoyé. Aucune ligne n'est supprimée ; l'utilisateur pourra le réactiver
-- dans ses Paramètres. Sans effet sur une base où 0002 n'a jamais créé de telles lignes.
UPDATE public.user_settings s
SET daily_report = false, updated_at = now()
FROM auth.users u
WHERE u.id = s.user_id
  AND u.email_confirmed_at IS NULL
  AND s.daily_report;

-- 3. gpus : seule la politique d'insertion « admins add gpus » doit exister.
--    Défaut corrigé (0002) : seule une politique nommée exactement « add gpus » était supprimée. Si la politique
--    d'origine portait un autre nom, elle restait active et, les politiques permissives s'additionnant,
--    n'importe quel utilisateur connecté pouvait toujours ajouter des cartes.
--    Maintenant : toute politique d'insertion autre que « admins add gpus » est supprimée. Une politique de
--    type ALL (qui couvrirait aussi la lecture) est inattendue : la migration s'arrête pour qu'on l'examine.
ALTER TABLE public.gpus ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gpus'
      AND cmd IN ('INSERT', 'ALL')
      AND policyname <> 'admins add gpus'
  LOOP
    IF p.cmd = 'ALL' THEN
      RAISE EXCEPTION 'Politique ALL inattendue "%" sur public.gpus : examinez-la avant de poursuivre (scripts/sql/preflight.sql).', p.policyname;
    END IF;
    EXECUTE format('DROP POLICY %I ON public.gpus', p.policyname);
  END LOOP;
END $$;
DROP POLICY IF EXISTS "admins add gpus" ON public.gpus;
CREATE POLICY "admins add gpus" ON public.gpus FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Droits : réaffirmés pour corriger toute dérive (ces instructions sont sans effet si l'état est déjà correct).
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_roles FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.rate_limits TO service_role;

-- 5. consume_rate_limit : garde interne en plus des droits d'exécution.
--    Défaut corrigé (0003) : la fonction ne reposait que sur les droits EXECUTE. Si ceux-ci étaient élargis
--    un jour (par exemple par un « GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated »), un
--    utilisateur pouvait consommer le quota d'un autre et l'empêcher d'envoyer son rapport.
--    Maintenant : la fonction refuse tout appelant qui n'est pas la clé de service (même double condition que
--    has_role : rôle PostgreSQL actif ET claim JWT valent 'service_role'). Corps inchangé pour le reste.
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
  IF NOT coalesce(
    current_setting('role', true) = 'service_role'
    AND coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role',
    false
  ) THEN
    RAISE EXCEPTION 'consume_rate_limit est réservée à la clé de service' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF _user_id IS NULL OR _action IS NULL OR _action = '' OR _max_count < 1 OR _window_seconds < 1 THEN
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

-- 6. Recharge le cache de schéma de l'API (PostgREST) pour que les nouvelles fonctions soient visibles
--    immédiatement par le serveur (sans effet si le cache est déjà à jour).
NOTIFY pgrst, 'reload schema';
