-- Pré-contrôle avant d'appliquer les migrations 0002, 0003 et 0004.
--
-- LECTURE SEULE : une seule requête SELECT, aucune écriture.
-- À exécuter dans l'éditeur SQL de chaque environnement AVANT d'appliquer quoi que ce soit.
-- Il décrit l'état réel de la base (que le dépôt ne peut pas connaître) et signale ce qui pourrait
-- faire échouer une migration ou la rendre inutile.

WITH info(ordre, rubrique, valeur, remarque) AS (
  SELECT 1, 'Version PostgreSQL', version(), ''
  UNION ALL SELECT 2, 'Utilisateur de la session', current_user,
         CASE WHEN (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN 'superutilisateur' ELSE 'non superutilisateur' END
  UNION ALL SELECT 3, 'Rôles Supabase (anon, authenticated, service_role)',
         (SELECT count(*)::text || ' sur 3 présents' FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')),
         CASE WHEN (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')) = 3 THEN 'OK' ELSE 'ANOMALIE : les migrations supposent ces trois rôles' END
  UNION ALL SELECT 4, 'Colonnes de auth.users utilisées (email_confirmed_at, deleted_at, banned_until)',
         (SELECT count(*)::text || ' sur 3 présentes' FROM information_schema.columns
          WHERE table_schema = 'auth' AND table_name = 'users' AND column_name IN ('email_confirmed_at', 'deleted_at', 'banned_until')),
         CASE WHEN (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users'
                    AND column_name IN ('email_confirmed_at', 'deleted_at', 'banned_until')) = 3 THEN 'OK' ELSE 'ANOMALIE' END
  UNION ALL SELECT 5, 'Droits de la session sur auth.users (TRIGGER, REFERENCES)',
         'TRIGGER=' || coalesce(has_table_privilege(current_user, 'auth.users', 'TRIGGER')::text, '?')
           || ' REFERENCES=' || coalesce(has_table_privilege(current_user, 'auth.users', 'REFERENCES')::text, '?'),
         CASE WHEN has_table_privilege(current_user, 'auth.users', 'TRIGGER') AND has_table_privilege(current_user, 'auth.users', 'REFERENCES')
              THEN 'OK : le déclencheur d''inscription et la clé étrangère de user_roles peuvent être créés'
              ELSE 'RISQUE : la migration 0002 peut échouer (déclencheur sur auth.users ou clé étrangère vers auth.users)' END
  UNION ALL SELECT 6, 'Table user_settings : clé primaire sur user_id',
         EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = to_regclass('public.user_settings') AND i.indisprimary
                 AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = i.indrelid AND a.attnum = i.indkey[0]) = 'user_id')::text,
         'nécessaire au ON CONFLICT (user_id) du déclencheur'

  -- Objets créés par les migrations : présents ou absents
  UNION ALL SELECT 10, 'Migration 0002 — type app_role', CASE WHEN to_regtype('public.app_role') IS NULL THEN 'absent' ELSE 'PRÉSENT' END, ''
  UNION ALL SELECT 11, 'Migration 0002 — table user_roles', CASE WHEN to_regclass('public.user_roles') IS NULL THEN 'absente' ELSE 'PRÉSENTE' END, ''
  UNION ALL SELECT 12, 'Migration 0002 — fonction has_role', CASE WHEN to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN 'absente' ELSE 'PRÉSENTE' END, ''
  UNION ALL SELECT 13, 'Migration 0002 — fonction handle_new_user', CASE WHEN to_regprocedure('public.handle_new_user()') IS NULL THEN 'absente' ELSE 'PRÉSENTE' END, ''
  UNION ALL SELECT 14, 'Migration 0002 — déclencheur on_auth_user_created',
         CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND tgrelid = 'auth.users'::regclass) THEN 'PRÉSENT' ELSE 'absent' END, ''
  UNION ALL SELECT 15, 'Migration 0003 — table rate_limits', CASE WHEN to_regclass('public.rate_limits') IS NULL THEN 'absente' ELSE 'PRÉSENTE' END, ''
  UNION ALL SELECT 16, 'Migration 0003 — fonction consume_rate_limit',
         CASE WHEN to_regprocedure('public.consume_rate_limit(uuid,text,integer,integer)') IS NULL THEN 'absente' ELSE 'PRÉSENTE' END, ''
  UNION ALL SELECT 17, 'Conclusion sur l''état des migrations',
         CASE
           WHEN to_regclass('public.user_roles') IS NULL AND to_regclass('public.rate_limits') IS NULL AND to_regtype('public.app_role') IS NULL
                AND to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL
             THEN 'Aucune des migrations 0002 / 0003 n''est appliquée : appliquez 0002, puis 0003, puis 0004.'
           WHEN to_regclass('public.user_roles') IS NOT NULL AND to_regclass('public.rate_limits') IS NOT NULL
             THEN '0002 et 0003 semblent appliquées : appliquez seulement 0004, puis lancez verify.sql.'
           WHEN to_regclass('public.user_roles') IS NOT NULL AND to_regclass('public.rate_limits') IS NULL
             THEN '0002 semble appliquée, pas 0003 : appliquez 0003 puis 0004.'
           ELSE 'ÉTAT PARTIEL INATTENDU : ne rien appliquer, examinez les lignes ci-dessus.'
         END, ''

  -- Politiques de gpus (le nom de la politique d'origine est supposé « add gpus » par la migration 0002)
  UNION ALL SELECT 20, 'Politiques RLS sur gpus',
         coalesce((SELECT string_agg(policyname || ' [' || cmd || ']', ', ' ORDER BY policyname) FROM pg_policies
                   WHERE schemaname = 'public' AND tablename = 'gpus'), 'aucune'),
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gpus' AND cmd = 'ALL')
              THEN 'ATTENTION : une politique ALL existe, 0004 s''arrêtera pour que vous l''examiniez'
              WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gpus' AND cmd = 'INSERT' AND policyname NOT IN ('add gpus', 'admins add gpus'))
              THEN 'Une politique d''insertion porte un nom inattendu : la migration 0004 la supprimera (la 0002 seule la laisserait active)'
              ELSE 'OK' END

  -- Suivi des migrations par Drizzle, s'il existe (indique si un outil applique les fichiers du dépôt)
  UNION ALL SELECT 30, 'Table de suivi Drizzle (drizzle.__drizzle_migrations)',
         CASE WHEN to_regclass('drizzle.__drizzle_migrations') IS NULL THEN 'absente'
              ELSE (xpath('/row/n/text()', query_to_xml('select count(*) as n from drizzle.__drizzle_migrations', false, true, '')))[1]::text || ' migration(s) enregistrée(s)' END,
         CASE WHEN to_regclass('drizzle.__drizzle_migrations') IS NULL
              THEN 'aucun suivi Drizzle dans cette base : les migrations s''appliquent à la main'
              ELSE 'un outil applique peut-être les migrations du dépôt : voir le README avant d''appliquer à la main' END
  UNION ALL SELECT 31, 'Dernière migration enregistrée par Drizzle (created_at, en ms)',
         CASE WHEN to_regclass('drizzle.__drizzle_migrations') IS NULL THEN 'sans objet'
              ELSE coalesce((xpath('/row/m/text()', query_to_xml('select max(created_at) as m from drizzle.__drizzle_migrations', false, true, '')))[1]::text, 'aucune') END,
         'journal du dépôt : 0000=1793824230050, 0001=1793824297900'

  -- Comptes
  UNION ALL SELECT 40, 'Comptes (total / confirmés / non confirmés)',
         (SELECT count(*)::text || ' / ' || count(*) FILTER (WHERE email_confirmed_at IS NOT NULL)::text || ' / ' || count(*) FILTER (WHERE email_confirmed_at IS NULL)::text FROM auth.users), ''
  UNION ALL SELECT 41, 'Réglages avec rapport quotidien actif pour un compte non confirmé',
         (SELECT count(*)::text FROM public.user_settings s JOIN auth.users u ON u.id = s.user_id WHERE u.email_confirmed_at IS NULL AND s.daily_report),
         '0004 les passe à « rapport quotidien désactivé » (rien n''est supprimé)'
)
SELECT rubrique, valeur, remarque FROM info ORDER BY ordre;
