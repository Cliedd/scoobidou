# Qualité des données visa

Le snapshot `data/visa-requirements.csv` contient 38 612 lignes et 38 612 paires uniques (`passport,destination`). Il couvre 197 codes passeport et 197 codes destination, sans doublon de paire ni code qui échoue au format ISO2 contrôlé.

## Écart 198 / 227

Les nombres 198 passeports et 227 destinations étaient des seuils codés en dur dans `scripts/validate-visa-data.mjs`. Ils ne correspondent pas au périmètre de ce snapshot : le fichier ne contient que 197 codes dans chaque axe. Ils ont été remplacés par le manifeste versionné `data/visa-data-manifest.json`, qui documente aussi le fait que `XK` est conservé car fourni par la source. Il ne faut pas présenter ces compteurs comme le nombre de pays ISO 3166-1 disponibles dans le monde.

## Complétude

La structure est valide, mais la couverture documentaire est incomplète : 177 lignes ont une URL source et 38 lignes une date de vérification. Les lignes sans source/date restent importables avec `confidence=dataset`; elles doivent être enrichies avant de passer à `verified`.

## Contrôles et historique

`npm run data:validate` valide l’en-tête, les codes, les statuts, les durées, les dates, les URLs, les doublons et les compteurs du manifeste. La migration `002_visa_data_quality.sql` ajoute la vue `visa_data_quality`, une contrainte de confiance et les métadonnées source/date/confiance dans l’historique. L’importeur enregistre désormais aussi les changements de source ou de date, pas seulement les changements de statut ou de durée.

L’import PostgreSQL est transactionnel et doit être exécuté avec `DATABASE_URL` :

```sh
npm run data:validate
DATABASE_URL='…' npm run data:import
```
