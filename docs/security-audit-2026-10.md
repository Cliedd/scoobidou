# Audit sécurité et données — 2 octobre 2026

## Parcours vérifiés

Les routes de comptes utilisent la session HTTP-only, des requêtes SQL paramétrées et des contrôles d’appartenance par `user_id` pour les favoris, alertes, checklists et itinéraires. Les témoignages sont privés à la création et ne deviennent publics qu’avec `status='approved'`. Le calcul Schengen, les itinéraires, l’export de données et les suppressions ont été revus.

## Corrections appliquées

- bornage à 100 séjours et validation des dates/pays dans le calcul Schengen ;
- bornage des itinéraires sauvegardés et des index de checklist ;
- export RGPD complété avec checklists, itinéraires, préférences de notification et témoignages ;
- `Cache-Control: private, no-store` sur les réponses liées à une session et l’export de compte ;
- protections déjà présentes conservées : cookies `HttpOnly`/`SameSite=Strict`, mots de passe `scrypt`, limitation des connexions/inscriptions, CSP, HSTS, anti-framing et modération des témoignages.

## Points à traiter avant production

- ajouter un vrai rate limiting distribué par IP sur les routes publiques de calcul et de témoignages (la table actuelle est adaptée aux comptes mais peut grossir sans purge) ;
- ajouter un mécanisme CSRF explicite si `SameSite=Strict` doit être assoupli pour un domaine tiers ;
- fournir une adresse de contact RGPD réelle dans la page de confidentialité ;
- planifier la purge des sessions et des `rate_limits`, et limiter la rétention des journaux ;
- produire un PDF côté serveur si un fichier PDF signé/téléchargeable est requis : l’interface actuelle utilise l’impression navigateur ;
- vérifier en déploiement que `DATABASE_URL`, `ADMIN_BOOTSTRAP_TOKEN`, `API_KEY_ADMIN_TOKEN`, `IMPORT_TOKEN` et les secrets email ne sont jamais exposés côté client.

## Résultat

Les tests locaux doivent être complétés par une vérification avec PostgreSQL configuré et des tests d’intégration authentifiés. Aucun push n’a été effectué.
