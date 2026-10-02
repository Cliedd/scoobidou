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
