export default function DeveloperPage() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px', fontFamily: 'system-ui' }}>
      <p style={{ color: '#64748b' }}>PASSPORTLY DEVELOPERS · API v1</p>
      <h1>Une API visa claire et exploitable.</h1>
      <p>Accédez aux règles de visa, à la carte de mobilité, aux comparaisons, pays et guides avec une clé API.</p>
      <h2>Authentification</h2>
      <pre>{'curl -H "x-api-key: pk_live_…" \\\n+  https://passportly.example/api/v1/visa?passport=CM'}</pre>
      <h2>Plans et quotas horaires</h2>
      <p>Free: 100 · Pro: 10 000 · Business: 100 000 requêtes/heure. Les réponses incluent un <code>requestId</code> et le quota est glissant sur une heure.</p>
      <p>Pour souscrire : <code>POST /api/stripe/checkout</code> avec <code>{'{"plan":"pro"}'}</code> ou <code>business</code>. Configurez les prix Stripe via <code>STRIPE_PRICE_PRO</code> et <code>STRIPE_PRICE_BUSINESS</code>, puis pointez Stripe vers <code>/api/stripe/webhook</code>.</p>
      <p>Gestion interne : <code>POST /api/v1/keys</code> crée, <code>PUT /api/v1/keys?id=…</code> fait tourner et <code>DELETE /api/v1/keys?id=…</code> révoque une clé via <code>x-admin-token</code>. La clé brute n’est affichée qu’à la création/rotation.</p>
      <h2>Endpoints</h2>
      <ul>
        <li><code>GET /api/v1/visa</code></li><li><code>GET /api/v1/map</code></li><li><code>GET /api/v1/compare</code></li><li><code>GET /api/v1/countries</code></li><li><code>GET /api/v1/guides</code></li>
      </ul>
      <p>Spécification : <a href="/api/v1/openapi.json">OpenAPI 3.0</a>. Widget serveur : <code>/api/widget?passport=CM&amp;destination=FR</code>; configurez <code>WIDGET_API_KEY</code> et ne l’exposez jamais dans le navigateur.</p>
      <h2>Erreurs</h2>
      <p>Format stable : <code>{'{"error":{"code":"…","message":"…"}}'}</code>. Codes : <code>invalid_api_key</code>, <code>invalid_parameter</code>, <code>rate_limit_exceeded</code>.</p>
    </main>
  );
}
