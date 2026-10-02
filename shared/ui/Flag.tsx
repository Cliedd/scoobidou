'use client';

import { useEffect, useState } from 'react';

export function Flag({ code, fallback, size = 28 }: { code: string; fallback: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const normalized = code.toLowerCase();
  useEffect(() => setFailed(false), [normalized]);
  if (failed) return <span className="flag-fallback" aria-label={fallback}>{fallback}</span>;
  return <img className="flag-image" src={`https://flagcdn.com/w40/${normalized}.png`} alt={fallback} width={size} height={Math.round(size * 0.7)} loading="lazy" onError={() => setFailed(true)} />;
}
