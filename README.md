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
- Seuls les administrateurs peuvent ajouter des cartes graphiques et lancer un relevé de prix forcé (bouton « Actualiser les prix »). Le relevé automatique n'est pas concerné. Pour nommer un administrateur, exécute dans l'éditeur SQL :

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'adresse@exemple.fr';
```

Après avoir appliqué la migration, ajoute `/reset-password` aux URL de redirection autorisées de Supabase (Authentication → URL Configuration) et règle la longueur minimale des mots de passe sur 8 dans les paramètres d'authentification.

## Scripts

```sh
npm run dev       # serveur de développement
npm run build     # build de production
npm run lint      # ESLint
npm test          # tests Vitest
```

## Contribution

Le projet est connecté à Lovable. Évite de réécrire l'historique Git publié (force push, rebase ou amend de commits déjà poussés). Utilise une branche dédiée pour les changements importants et une Pull Request pour les faire relire avant fusion.
