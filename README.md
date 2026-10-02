# Passportly

Plateforme de compréhension et de préparation des visas : carte de mobilité, sources transparentes, checklists, guides, alertes et API.

## Démarrer

```bash
npm install
npm run dev
```

## API

`GET /api/visa?passport=CM` retourne les règles disponibles pour un passeport.

`GET /api/visa?passport=CM&destination=FR` filtre une destination.

`GET /api/compare?left=CM&right=FR` compare deux passeports.

`POST /api/schengen` calcule les jours utilisés sur une fenêtre glissante de 180 jours. Corps attendu : `{ "referenceDate": "2026-10-02", "entries": [{ "start": "2026-08-01", "end": "2026-08-20" }] }`.

`GET /api/health` vérifie la disponibilité de PostgreSQL. `GET /api/openapi` expose la documentation OpenAPI minimale.

L’import de production peut être lancé après déploiement avec `POST /api/admin/import` et l’en-tête secret `x-import-token`. Le token est fourni uniquement par la variable Render `IMPORT_TOKEN`.

Les données d’interface et l’API utilisent déjà les mêmes champs : statut, durée, coût, source, date de vérification et niveau de confiance. Le dataset réel peut être branché ensuite sans refaire l’interface.

## Import du dataset

Le fichier `data/visa-requirements.csv` provient de [maxix7/visa-requirements-dataset](https://github.com/maxix7/visa-requirements-dataset), sous licence CC BY 4.0. Après avoir configuré `DATABASE_URL` :

```bash
npm run data:import
```

L’import crée les tables PostgreSQL et conserve la source, la date de vérification et l’historique structurel de chaque règle.

## Checklist de production Render

Dans le service web, renseigner dans le Dashboard les variables marquées `sync: false` dans `render.yaml` :

- `DATABASE_URL` : URL PostgreSQL interne Render, dans la même région que le service ;
- `AUTH_SECRET`, `ADMIN_BOOTSTRAP_TOKEN`, `IMPORT_TOKEN` et `API_KEY_ADMIN_TOKEN` : secrets aléatoires distincts ;
- `NEXT_PUBLIC_APP_URL` : URL HTTPS publique finale ;
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS` et `STRIPE_WEBHOOK_SECRET` si Stripe est activé.

Le cron `passportly-monitor` nécessite en plus `MONITOR_SOURCES_JSON`, `EMAIL_FROM` et `RESEND_API_KEY`. Son horaire `15 */6 * * *` est interprété en UTC. Les erreurs `email_provider_not_configured` sont attendues tant que Resend n’est pas configuré.

Après le premier déploiement, vérifier `GET /api/health`, exécuter l’import protégé avec `IMPORT_TOKEN`, puis créer le premier administrateur via `/api/admin/setup` avec `ADMIN_BOOTSTRAP_TOKEN`. Révoquer ou remplacer ces tokens bootstrap après usage.

Les migrations SQL sont idempotentes, mais Render n’exécute pas automatiquement `db/migrations/*.sql` : l’import initial crée le schéma et `lib/db.ts` complète les tables nécessaires à l’exécution. Configurer et vérifier les sauvegardes PostgreSQL dans le Dashboard Render ; aucune sauvegarde applicative n’est définie dans le dépôt.
