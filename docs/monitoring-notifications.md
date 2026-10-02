# Veille et notifications

Le cron Render `passportly-monitor` s’exécute toutes les six heures à la minute 15 UTC. Il récupère les sources publiques de `MONITOR_SOURCES_JSON`, calcule une empreinte SHA-256 et conserve les snapshots.

Tout changement crée une proposition `pending` avec un diff. La validation manuelle se fait via `GET/PATCH /api/monitor/proposals` et nécessite un compte `editor` ou `admin`. `GET/PATCH /api/notifications/preferences` permet à chaque utilisateur connecté d’activer ou désactiver les emails et le digest.

Configurer dans Render `DATABASE_URL`, `MONITOR_SOURCES_JSON`, `EMAIL_FROM` et `RESEND_API_KEY`. Aucun secret ne doit être commité. Sans fournisseur email, les propositions restent stockées pour validation.

La migration dédiée est `db/migrations/001_monitor_notifications.sql`; elle doit être exécutée avant le premier cron. `GET /api/monitor/sources` expose les sources et leurs empreintes.
