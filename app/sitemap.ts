import type { MetadataRoute } from 'next';
import { guides } from './guides/data';
export default function sitemap(): MetadataRoute.Sitemap { return [{ url: 'https://scoobidou.onrender.com', lastModified: new Date(), changeFrequency: 'daily', priority: 1 }, { url: 'https://scoobidou.onrender.com/guides', lastModified: new Date(), changeFrequency: 'weekly', priority: .9 }, ...guides.map((guide) => ({ url: `https://scoobidou.onrender.com/guides/${guide.slug}`, lastModified: new Date(guide.updated), changeFrequency: 'monthly' as const, priority: .8 }))]; }
