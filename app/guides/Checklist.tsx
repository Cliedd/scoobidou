'use client';
import { useEffect, useState } from 'react';
import type { Guide } from './data';

export function Checklist({ guide }: { guide: Guide }) {
  const key = `passportly-checklist-${guide.slug}`;
  const [checked, setChecked] = useState<number[]>([]);
  const [saved, setSaved] = useState<'idle' | 'done' | 'login'>('idle');
  useEffect(() => { try { setChecked(JSON.parse(localStorage.getItem(key) || '[]')); } catch {} }, [key]);
  const toggle = (index: number) => setChecked((current) => { const next = current.includes(index) ? current.filter((i) => i !== index) : [...current, index]; localStorage.setItem(key, JSON.stringify(next)); return next; });
  const save = async () => { const response = await fetch('/api/account/saved', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passport: 'CM', destination: guide.code }) }); setSaved(response.ok ? 'done' : 'login'); };
  const alert = async () => { const response = await fetch('/api/account/alerts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passport: 'CM', destination: guide.code }) }); setSaved(response.ok ? 'done' : 'login'); };
  return <section className="guide-checklist" aria-labelledby="checklist-title"><div className="checklist-head"><div><span className="eyebrow">VOTRE CHECKLIST</span><h2 id="checklist-title">Documents à préparer</h2></div><strong>{checked.length}/{guide.documents.length}</strong></div><div className="progress"><span style={{ width: `${(checked.length / guide.documents.length) * 100}%` }} /></div><div className="check-items">{guide.documents.map((document, index) => <label className={checked.includes(index) ? 'checked' : ''} key={document}><input type="checkbox" checked={checked.includes(index)} onChange={() => toggle(index)} /><span className="custom-check">✓</span>{document}</label>)}</div><div className="check-actions"><button className="primary compact" onClick={save}>Sauvegarder ce voyage <span>→</span></button><button className="outline" onClick={alert}>Recevoir les mises à jour</button></div>{saved === 'done' && <p className="save-note success">C’est enregistré dans votre compte.</p>}{saved === 'login' && <p className="save-note">Connectez-vous pour sauvegarder ce guide et recevoir les alertes.</p>}</section>;
}
