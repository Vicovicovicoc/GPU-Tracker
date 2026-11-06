# GPU Price Tracker

Application web de suivi et de comparaison des prix de cartes graphiques chez plusieurs marchands français.

**Application en ligne :** https://gpu-tracker.lovable.app

## Fonctionnalités

- Tableau de bord avec indicateurs et historique des meilleurs prix.
- Catalogue et comparateur de GPU avec filtres par marque, recherche et tri.
- Liste de suivi personnelle et seuils de prix.
- Historique des alertes et notifications par e-mail.
- État des boutiques et suivi des relevés.
- Collecte des résultats de recherche via Firecrawl, stockage dans Supabase et e-mails via Brevo.

## Stack technique

- React 19, TypeScript, Vite et TanStack Start/Router.
- Tailwind CSS et composants Radix UI.
- TanStack Query.
- Supabase (authentification et base de données).
- Firecrawl et Brevo côté serveur.

## Développement local

Prérequis : Node.js et npm.

```sh
git clone https://github.com/Vicovicovicoc/GPU-Tracker.git
cd GPU-Tracker
npm install
cp .env.example .env.local
npm run dev
```

Renseigne les variables de `.env.local` avec les valeurs de ton projet. Les clés serveur (`SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, `LOVABLE_API_KEY`, `BREVO_API_KEY`) ne doivent jamais être préfixées par `VITE_` ni exposées au navigateur.

## Comptes utilisateurs

- Inscription et connexion par e-mail et mot de passe (8 caractères minimum, avec une lettre et un chiffre), Google ou Lovable.
- Mot de passe oublié : lien envoyé par e-mail, page `/reset-password`.
- Page `/compte` : changement d'e-mail et de mot de passe, suppression du compte et de ses données.
- Les réglages de l'utilisateur sont créés automatiquement à l'inscription (migration `0002_comptes_utilisateurs.sql`).
- Seuls les administrateurs peuvent ajouter des cartes graphiques et lancer un relevé de prix forcé (bouton « Actualiser les prix »).
- Le relevé automatique démarre une fois par jour à 06:00, heure de Paris. La tâche planifiée peut être appelée plus souvent pour synchroniser les lots en cours, mais elle ne démarre pas de nouveau scraping en dehors de cette heure.

## Planification du relevé quotidien

La planification des appels HTTP Lovable Cloud est configurée hors du dépôt Git. Pour le relevé à 06:00 en heure de Paris, règle l'appel POST vers `/api/public/jobs/refresh` sur **04:00 et 05:00 UTC chaque jour** (`0 4,5 * * *`). Le code vérifie le fuseau `Europe/Paris` : une seule des deux exécutions démarre le relevé, selon l'heure d'été ou d'hiver. Les autres appels éventuels ne font que synchroniser les lots déjà lancés.

## Déploiement de la base Lovable Cloud

Les migrations SQL de ce dépôt ne sont pas exécutées automatiquement par la synchronisation GitHub/Lovable. Pour déployer les fonctions de comptes et de sécurité sur une base existante, utilise l'éditeur SQL de Lovable Cloud et applique les fichiers **dans cet ordre précis** :

1. Ouvre `drizzle/migrations/0002_comptes_utilisateurs.sql`, copie son contenu complet dans l'éditeur SQL et exécute-le **une seule fois**.
2. Vérifie que la table `public.user_roles`, le type `public.app_role`, la fonction `public.has_role` et le déclencheur `on_auth_user_created` existent.
3. Ouvre `drizzle/migrations/0003_audit_securite.sql`, copie son contenu complet dans l'éditeur SQL et exécute-le **une seule fois, après la 0002**.
4. Vérifie que `public.rate_limits` et `public.consume_rate_limit(uuid, text, integer, integer)` existent. La migration 0003 remplace également `has_role` par sa version durcie.
5. Attribue le rôle administrateur au compte voulu en suivant la procédure ci-dessous.
6. Une fois les migrations et le rôle administrateur vérifiés, la PR qui contient le code associé peut être fusionnée.

**Important :** ne lance pas la migration 0003 avant la 0002. Ces fichiers créent des objets et ne sont pas destinés à être rejoués. Ne réapplique pas les migrations initiales 0000/0001 sur une base qui contient déjà le schéma de l'application. Si tu ne sais pas si une migration a déjà été exécutée, vérifie d'abord l'existence de ses objets dans l'éditeur SQL ; ne la relance pas à l'aveugle. La synchronisation GitHub ne remplace pas cette étape.

### Attribuer le premier rôle administrateur

Connecte-toi d'abord à l'application avec le compte qui doit devenir administrateur. Dans l'éditeur SQL, vérifie que l'adresse correspond à un compte existant :

```sql
SELECT id, email
FROM auth.users
WHERE lower(email) = lower('adresse@exemple.fr');
```

Si une seule ligne correspond au bon compte, exécute cette requête. Elle est réexécutable sans créer de doublon :

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE lower(email) = lower('adresse@exemple.fr')
ON CONFLICT (user_id, role) DO NOTHING;
```

Vérifie ensuite l'attribution :

```sql
SELECT u.email, r.role
FROM public.user_roles AS r
JOIN auth.users AS u ON u.id = r.user_id
WHERE lower(u.email) = lower('adresse@exemple.fr');
```

Remplace l'adresse d'exemple par l'adresse exacte du compte. Si la première requête ne renvoie aucune ligne, crée d'abord le compte dans l'application ; n'insère pas un identifiant inventé.

### Effets des protections de sécurité

- `has_role` ne révèle plus le rôle d'un autre utilisateur à un compte ordinaire.
- `syncRefresh` et `triggerRefresh` sont réservés aux administrateurs. Les tâches planifiées (`/api/public/jobs/*`) s'authentifient avec leur propre secret et ne sont pas concernées.
- `sendTestReport` est limité côté serveur à 1 envoi par minute et 5 par 24 h et par utilisateur. La table `rate_limits` et la fonction `consume_rate_limit` sont réservées à la clé de service.
- Si la migration 0003 ou la base est indisponible, l'envoi d'un rapport test est refusé par prudence. Le rapport quotidien automatique n'est pas limité par ce quota.

Après le déploiement, ajoute `/reset-password` aux URL de redirection autorisées de Supabase (Authentication → URL Configuration) et règle la longueur minimale des mots de passe sur 8 dans les paramètres d'authentification.

## Scripts

```sh
npm run dev       # serveur de développement
npm run build     # build de production
npm run lint      # ESLint
npm test          # tests Vitest
```

## Contribution

Le projet est connecté à Lovable. Évite de réécrire l'historique Git publié (force push, rebase ou amend de commits déjà poussés). Utilise une branche dédiée pour les changements importants et une Pull Request pour les faire relire avant fusion.
