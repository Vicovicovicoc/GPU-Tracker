-- Retirer le rôle administrateur à UN compte, sans jamais laisser l'application sans administrateur.
--
-- Mode d'emploi : remplacez l'adresse ci-dessous, puis exécutez le script entier dans l'éditeur SQL.
-- Le script s'arrête avec un message d'erreur, sans rien écrire, si l'adresse n'a pas été remplacée, si le compte
-- n'est pas administrateur, ou si ce serait le dernier administrateur (retirez-le seulement après en avoir nommé
-- un autre avec grant-admin.sql). Il ne supprime ni compte ni donnée utilisateur.

DO $$
DECLARE
  target_email text := lower(trim('REMPLACEZ-PAR-L-ADRESSE@exemple.fr'));
  target_id uuid;
  admin_count int;
BEGIN
  IF target_email LIKE 'remplacez-par-%' THEN
    RAISE EXCEPTION 'Remplacez d''abord l''adresse d''exemple par l''adresse du compte concerné.';
  END IF;

  SELECT u.id INTO target_id
  FROM auth.users u
  JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'admin'
  WHERE lower(u.email) = target_email;

  IF target_id IS NULL THEN
    RAISE EXCEPTION '« % » n''est pas administrateur : rien à retirer.', target_email;
  END IF;

  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count <= 1 THEN
    RAISE EXCEPTION 'Refusé : « % » est le dernier administrateur. Nommez-en un autre avant de lui retirer le rôle.', target_email;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = target_id AND role = 'admin';
END $$;

SELECT u.id, u.email, r.role
FROM public.user_roles r
JOIN auth.users u ON u.id = r.user_id
ORDER BY u.email;
