-- Attribuer le rôle administrateur à UN compte, de façon contrôlée.
--
-- Mode d'emploi : remplacez l'adresse ci-dessous (ligne « target_email ») par l'adresse de VOTRE compte,
-- celle que vous utilisez pour vous connecter à l'application, puis exécutez le script entier dans l'éditeur SQL.
-- Le script s'arrête avec un message d'erreur, sans rien écrire, si :
--   - l'adresse n'a pas été remplacée ;
--   - aucun compte confirmé ne correspond (adresse mal saisie, compte jamais créé, e-mail non confirmé,
--     compte supprimé ou suspendu) ;
--   - plusieurs comptes correspondent.
-- Il ne crée aucun compte, ne modifie aucun compte existant et peut être relancé sans danger.
-- À la fin, il affiche la liste des administrateurs : vérifiez que c'est bien le vôtre, et seulement le vôtre.
--
-- Sécurité : ce rôle ne peut être attribué que depuis l'éditeur SQL (ou avec la clé de service). Aucune fonction
-- accessible aux utilisateurs ne l'attribue. Ne mettez pas votre adresse dans un fichier du dépôt.

DO $$
DECLARE
  target_email text := lower(trim('REMPLACEZ-PAR-VOTRE-ADRESSE@exemple.fr'));
  ids uuid[];
BEGIN
  IF target_email LIKE 'remplacez-par-%' THEN
    RAISE EXCEPTION 'Remplacez d''abord l''adresse d''exemple par votre adresse de connexion.';
  END IF;

  SELECT array_agg(id) INTO ids
  FROM auth.users
  WHERE lower(email) = target_email
    AND email_confirmed_at IS NOT NULL
    AND deleted_at IS NULL
    AND (banned_until IS NULL OR banned_until < now());

  IF ids IS NULL THEN
    RAISE EXCEPTION 'Aucun compte confirmé pour « % » : vérifiez l''adresse, et que vous avez déjà créé le compte et confirmé votre e-mail.', target_email;
  END IF;
  IF array_length(ids, 1) > 1 THEN
    RAISE EXCEPTION 'Plusieurs comptes correspondent à « % » : situation inattendue, ne rien attribuer.', target_email;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (ids[1], 'admin') ON CONFLICT DO NOTHING;
END $$;

-- Liste des administrateurs après l'opération.
SELECT u.id, u.email, r.role
FROM public.user_roles r
JOIN auth.users u ON u.id = r.user_id
ORDER BY u.email;
