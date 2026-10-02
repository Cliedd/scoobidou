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

Les données d’interface et l’API utilisent déjà les mêmes champs : statut, durée, coût, source, date de vérification et niveau de confiance. Le dataset réel peut être branché ensuite sans refaire l’interface.

## Import du dataset

Le fichier `data/visa-requirements.csv` provient de [maxix7/visa-requirements-dataset](https://github.com/maxix7/visa-requirements-dataset), sous licence CC BY 4.0. Après avoir configuré `DATABASE_URL` :

```bash
npm run data:import
```

L’import crée les tables PostgreSQL et conserve la source, la date de vérification et l’historique structurel de chaque règle.
