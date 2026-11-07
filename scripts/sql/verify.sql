-- Vérification de l'état de sécurité de la base (migrations 0002, 0003 et 0004).
--
-- LECTURE SEULE : une seule requête SELECT, aucune écriture, aucun effet de bord.
-- À exécuter dans l'éditeur SQL, sur CHAQUE environnement (test et publié, s'ils sont distincts),
-- après avoir appliqué les migrations. Les lignes en échec s'affichent en premier.
--
--   statut = OK       le contrôle est satisfait
--   statut = ECHEC    problème de sécurité ou de cohérence : ne pas fusionner / déployer avant de l'avoir traité
--   statut = A_FAIRE  configuration à effectuer (par exemple nommer le premier administrateur)
--
-- Ce script dit seulement ce qu'il observe dans la base où il est exécuté.

WITH
t AS (
  SELECT
    to_regclass('public.user_roles')   AS user_roles,
    to_regclass('public.rate_limits')  AS rate_limits,
    to_regclass('public.gpus')         AS gpus,
    to_regprocedure('public.has_role(uuid,public.app_role)')                  AS has_role,
    to_regprocedure('public.consume_rate_limit(uuid,text,integer,integer)')   AS consume,
    to_regprocedure('public.handle_new_user()')                               AS new_user
),
checks(ordre, niveau, controle, ok, detail) AS (
  -- Tables et RLS
  SELECT 10, 'securite', 'user_roles : table présente, RLS activée',
         coalesce((SELECT relrowsecurity FROM pg_class WHERE oid = t.user_roles), false),
         CASE WHEN t.user_roles IS NULL THEN 'table absente (migration 0002 non appliquée)' ELSE 'présente' END FROM t
  UNION ALL SELECT 11, 'securite', 'rate_limits : table présente, RLS activée',
         coalesce((SELECT relrowsecurity FROM pg_class WHERE oid = t.rate_limits), false),
         CASE WHEN t.rate_limits IS NULL THEN 'table absente (migration 0003 non appliquée)' ELSE 'présente' END FROM t
  UNION ALL SELECT 12, 'securite', 'gpus : RLS activée',
         coalesce((SELECT relrowsecurity FROM pg_class WHERE oid = t.gpus), false), '' FROM t
  UNION ALL SELECT 13, 'securite', 'Toutes les tables du schéma public ont la RLS activée',
         NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity),
         coalesce((SELECT 'sans RLS : ' || string_agg(c.relname, ', ') FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity), 'aucune')
  UNION ALL SELECT 14, 'securite', 'Type app_role présent avec la valeur admin',
         EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type ty ON ty.oid = e.enumtypid
                 WHERE ty.typname = 'app_role' AND ty.typnamespace = 'public'::regnamespace AND e.enumlabel = 'admin'), ''

  -- has_role
  UNION ALL SELECT 20, 'securite', 'has_role : version finale (défaut sans claims supprimé, double condition service_role)',
         coalesce((SELECT p.prosecdef AND p.proconfig::text LIKE '%search_path=public%'
                          AND p.prosrc LIKE '%current_setting(''role'', true) = ''service_role''%'
                          AND p.prosrc LIKE '%->> ''role'', '''') = ''service_role''%'
                          AND p.prosrc NOT LIKE '%''role'', ''service_role'')%'
                   FROM pg_proc p WHERE p.oid = t.has_role), false),
         CASE WHEN t.has_role IS NULL THEN 'fonction absente' ELSE 'définition examinée' END FROM t
  UNION ALL SELECT 21, 'securite', 'has_role : exécutable par authenticated et service_role, pas par anon',
         coalesce(NOT has_function_privilege('anon', t.has_role, 'EXECUTE')
                  AND has_function_privilege('authenticated', t.has_role, 'EXECUTE')
                  AND has_function_privilege('service_role', t.has_role, 'EXECUTE'), false),
         'anon=' || coalesce(has_function_privilege('anon', t.has_role, 'EXECUTE')::text, '?')
           || ' authenticated=' || coalesce(has_function_privilege('authenticated', t.has_role, 'EXECUTE')::text, '?')
           || ' service_role=' || coalesce(has_function_privilege('service_role', t.has_role, 'EXECUTE')::text, '?') FROM t

  -- consume_rate_limit
  UNION ALL SELECT 30, 'securite', 'consume_rate_limit : garde interne présente (SECURITY DEFINER, clé de service seulement)',
         coalesce((SELECT p.prosecdef AND p.proconfig::text LIKE '%search_path=public%'
                          AND p.prosrc LIKE '%insufficient_privilege%'
                          AND p.prosrc LIKE '%current_setting(''role'', true) = ''service_role''%'
                   FROM pg_proc p WHERE p.oid = t.consume), false),
         CASE WHEN t.consume IS NULL THEN 'fonction absente' ELSE 'définition examinée' END FROM t
  UNION ALL SELECT 31, 'securite', 'consume_rate_limit : exécutable uniquement par service_role',
         coalesce(NOT has_function_privilege('anon', t.consume, 'EXECUTE')
                  AND NOT has_function_privilege('authenticated', t.consume, 'EXECUTE')
                  AND has_function_privilege('service_role', t.consume, 'EXECUTE'), false),
         'anon=' || coalesce(has_function_privilege('anon', t.consume, 'EXECUTE')::text, '?')
           || ' authenticated=' || coalesce(has_function_privilege('authenticated', t.consume, 'EXECUTE')::text, '?')
           || ' service_role=' || coalesce(has_function_privilege('service_role', t.consume, 'EXECUTE')::text, '?') FROM t

  -- Privilèges sur les tables
  UNION ALL SELECT 40, 'securite', 'user_roles : anon sans accès, authenticated en lecture seule, service_role complet',
         coalesce(NOT has_table_privilege('anon', t.user_roles, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
                  AND has_table_privilege('authenticated', t.user_roles, 'SELECT')
                  AND NOT has_table_privilege('authenticated', t.user_roles, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
                  AND has_table_privilege('service_role', t.user_roles, 'SELECT,INSERT,UPDATE,DELETE'), false), '' FROM t
  UNION ALL SELECT 41, 'securite', 'rate_limits : fermée à anon et authenticated, accessible à service_role',
         coalesce(NOT has_table_privilege('anon', t.rate_limits, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
                  AND NOT has_table_privilege('authenticated', t.rate_limits, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
                  AND has_table_privilege('service_role', t.rate_limits, 'SELECT,INSERT,UPDATE,DELETE'), false), '' FROM t

  -- Politiques RLS
  UNION ALL SELECT 50, 'securite', 'user_roles : une seule politique, en lecture (SELECT)',
         (SELECT count(*) = 1 AND bool_and(cmd = 'SELECT') FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles'),
         coalesce((SELECT string_agg(policyname || ' [' || cmd || ']', ', ') FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles'), 'aucune')
  UNION ALL SELECT 51, 'securite', 'rate_limits : aucune politique (aucun accès hors clé de service)',
         NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rate_limits'), ''
  UNION ALL SELECT 52, 'securite', 'gpus : la seule politique d''insertion est « admins add gpus », fondée sur has_role',
         (SELECT count(*) = 1 AND bool_and(policyname = 'admins add gpus' AND with_check LIKE '%has_role%')
          FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gpus' AND cmd IN ('INSERT', 'ALL')),
         coalesce((SELECT string_agg(policyname || ' [' || cmd || ']', ', ') FROM pg_policies
                   WHERE schemaname = 'public' AND tablename = 'gpus' AND cmd IN ('INSERT', 'ALL')), 'aucune')

  -- Déclencheur d'inscription
  UNION ALL SELECT 60, 'securite', 'Déclencheur on_auth_user_created : actif, limité aux e-mails confirmés',
         coalesce((SELECT tg.tgenabled = 'O'
                          AND pg_get_triggerdef(tg.oid) LIKE '%UPDATE OF email_confirmed_at%'
                          AND pg_get_triggerdef(tg.oid) LIKE '%WHEN%email_confirmed_at IS NOT NULL%'
                   FROM pg_trigger tg WHERE tg.tgname = 'on_auth_user_created' AND tg.tgrelid = 'auth.users'::regclass AND NOT tg.tgisinternal), false),
         CASE WHEN EXISTS (SELECT 1 FROM pg_trigger tg WHERE tg.tgname = 'on_auth_user_created' AND tg.tgrelid = 'auth.users'::regclass)
              THEN 'présent' ELSE 'absent' END
  UNION ALL SELECT 61, 'securite', 'handle_new_user : crée les réglages seulement si l''e-mail est confirmé, non exécutable par les utilisateurs',
         coalesce((SELECT p.prosecdef AND p.prosrc LIKE '%email_confirmed_at IS NULL%'
                          AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
                          AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
                   FROM pg_proc p WHERE p.oid = t.new_user), false),
         CASE WHEN t.new_user IS NULL THEN 'fonction absente' ELSE 'définition examinée' END FROM t
  UNION ALL SELECT 62, 'securite', 'Aucun compte non confirmé ne reçoit le rapport quotidien',
         NOT EXISTS (SELECT 1 FROM public.user_settings s JOIN auth.users u ON u.id = s.user_id
                     WHERE u.email_confirmed_at IS NULL AND s.daily_report),
         (SELECT count(*)::text || ' compte(s) concerné(s)' FROM public.user_settings s JOIN auth.users u ON u.id = s.user_id
          WHERE u.email_confirmed_at IS NULL AND s.daily_report)

  -- Surface des fonctions appelables par les utilisateurs
  UNION ALL SELECT 70, 'securite', 'Aucune fonction du schéma public n''est exécutable par anon',
         NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f'
                     AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
                     AND has_function_privilege('anon', p.oid, 'EXECUTE')),
         coalesce((SELECT string_agg(p.proname, ', ') FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f'
                   AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
                   AND has_function_privilege('anon', p.oid, 'EXECUTE')), 'aucune')
  UNION ALL SELECT 71, 'securite', 'Seule has_role est exécutable par authenticated parmi les fonctions du schéma public',
         NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f' AND p.proname <> 'has_role'
                     AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
                     AND has_function_privilege('authenticated', p.oid, 'EXECUTE')),
         coalesce((SELECT string_agg(p.proname, ', ') FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f' AND p.proname <> 'has_role'
                   AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
                   AND has_function_privilege('authenticated', p.oid, 'EXECUTE')), 'aucune autre')

  -- Configuration
  UNION ALL SELECT 90, 'configuration', 'Au moins un administrateur est nommé',
         coalesce((SELECT count(*) > 0 FROM public.user_roles WHERE role = 'admin'), false),
         CASE WHEN t.user_roles IS NULL THEN 'user_roles absente'
              ELSE (SELECT count(*)::text || ' administrateur(s) — voir scripts/sql/grant-admin.sql' FROM public.user_roles WHERE role = 'admin') END FROM t
)
SELECT
  CASE WHEN ok THEN 'OK' WHEN niveau = 'configuration' THEN 'A_FAIRE' ELSE 'ECHEC' END AS statut,
  controle,
  detail
FROM (
  SELECT ordre, niveau, controle, ok, detail FROM checks
  UNION ALL
  SELECT 0, 'securite', 'RÉSUMÉ : tous les contrôles de sécurité sont satisfaits',
         count(*) FILTER (WHERE niveau = 'securite' AND NOT coalesce(ok, false)) = 0,
         count(*) FILTER (WHERE niveau = 'securite' AND NOT coalesce(ok, false))::text || ' contrôle(s) de sécurité en échec sur '
           || count(*) FILTER (WHERE niveau = 'securite')::text
  FROM checks
) r
ORDER BY (CASE WHEN ok THEN 1 ELSE 0 END), ordre;
