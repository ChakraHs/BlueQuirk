// src/lib/i18n.ts
export function withLang(lang: string, path: string) {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  return `/${lang}${path}`;
}

export function getDefaultLang() {
  return "fr";
}