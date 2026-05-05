# Internationalization (i18n)

This directory contains translation files for RashPOD.

## Current Status

Translation files are prepared but **not yet integrated** with next-intl routing.

## Supported Locales

- `en.json` - English
- `uz.json` - Uzbek (Cyrillic)
- `ru.json` - Russian

## TODO: Full i18n Integration

To enable locale routing:

1. Restructure app directory:
   ```
   app/
     [locale]/
       layout.tsx
       page.tsx
       shop/...
       etc.
   ```

2. Update `next.config.ts` with next-intl plugin:
   ```ts
   import createNextIntlPlugin from "next-intl/plugin";
   const withNextIntl = createNextIntlPlugin();
   export default withNextIntl(nextConfig);
   ```

3. Create middleware.ts for locale detection and routing

4. Replace hardcoded strings with `useTranslations()` hook:
   ```tsx
   import { useTranslations } from 'next-intl';
   const t = useTranslations('home.hero');
   <h1>{t('title')}</h1>
   ```

5. Update PublicHeader to include language switcher

For now, the app uses English strings directly in components.
