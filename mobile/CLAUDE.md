# AutoHistory mobile (Expo)

Expo **57** app scaffold for AutoHistory. **Not connected to the API yet** — tabs/modal template only.

Read versioned Expo docs before changing native config: https://docs.expo.dev/versions/v57.0.0/

Also see repo root `../CLAUDE.md` for product context, API, auth, and French copy rules.

## Stack

- Expo SDK ~57, **expo-router** ~57 (`app/` file-based routes)
- React 19, React Native 0.86
- TypeScript, path alias `@/` → project root

## Commands

```bash
cd mobile
npm install
npm start          # Expo dev server
npm run android
npm run ios
npm run web
```

## Structure

```
app/
  _layout.tsx      # root stack + fonts
  (tabs)/          # tab navigator
  modal.tsx        # modal screen
components/        # shared UI (Themed, useColorScheme, …)
constants/Colors.ts
```

## When building features

1. **API:** same backend as web (`../backend/`) — base URL from env (dev: `http://localhost:3001`). Mirror `frontend/src/api.ts` contracts and `frontend/src/types.ts`.
2. **i18n:** match web French/English strings in `../frontend/src/i18n/locales/` (historique, €, *Ajouté par un pro*, no trust-score % in UI).
3. **Visual language:** dark theme, accent `#C7D94A`, verified green `#4C8B6C`, declared orange `#C98A3B` (see `../frontend/src/styles/tokens.ts`).
4. **Auth:** Supabase or JWT token storage — follow web `AuthContext` behavior when implemented.
5. **Expo:** check `app.json`; don’t upgrade SDK without reading v57 migration notes.

## Conventions

- Use expo-router `Link` / `router.push` for navigation; stack back for drill-down screens.
- Prefer functional components and existing `components/Themed.tsx` patterns.
- Minimize scope; don’t refactor unrelated web or backend code from this folder unless asked.

## AGENTS.md

`AGENTS.md` in this folder is a short pointer — this file is the full mobile guide for Claude Code.
