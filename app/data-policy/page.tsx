import Link from 'next/link';
export const metadata = { title: 'Politique des données — Passportly' };
export default function DataPolicyPage() { return <main className="legal-page"><Link href="/">← Passportly</Link><h1>Politique des données</h1><p>Les données de visa sont conservées avec leur source, leur date de vérification et leur niveau de confiance. Nous ne vendons pas les données personnelles des comptes.</p><p>Les journaux techniques servent à la sécurité et au fonctionnement de l’API, avec une conservation limitée à ce qui est nécessaire.</p></main>; }
