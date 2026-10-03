export function publicAppUrl(requestUrl: string) {
  const configured = process.env.GOOGLE_REDIRECT_URI || process.env.APP_URL;
  if (configured) {
    const url = new URL(configured);
    if (url.protocol === 'https:' || url.hostname === 'localhost') return url.origin;
  }
  return new URL(requestUrl).origin;
}
