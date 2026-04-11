# zillit-catering-app

Web client for Zillit Catering + Craft Service. Glassmorphism dark-mode UI
(with light-mode toggle) built symmetric to the backend: one `ModulePage`
shell drives both top-level tabs.

## Stack

- Vite 5 + React 18 + TypeScript (strict)
- Tailwind CSS 3 with custom glassmorphism tokens
- Zustand for state (keyed by moduleId)
- Axios with AES + moduledata + bodyhash interceptor
- React Router v6
- framer-motion, lucide-react, socket.io-client

## Quickstart

```sh
npm install
npm run dev   # → http://localhost:5174
```

The Vite dev server proxies `/api`, `/ws`, and `/uploads` to
`http://localhost:4000` where `zillit-catering-api` is expected to run.

Once the backend is seeded, quick-login as `vivek@zillit.dev` (caterer) or
`iphone.red@zillit.dev` (member) with password `password` from the login
screen's dev cards.

## Module architecture

The two top-level tabs — Catering and Craft Service — share almost all UI
code. Each tab is a thin wrapper:

```tsx
// features/catering/CateringPage.tsx
export default function CateringPage() {
  return <ModulePage moduleId="catering" />;
}
```

`ModulePage` takes `moduleId: 'catering' | 'craftservice'` and passes it to
every child (`UnitTabs`, `MenuListView`, `ChatWindow`). The Zustand store is
keyed by moduleId, so each tab caches its own units / menu / messages
independently and switching between them is instant.

To add a third module later: add an entry to `MODULE_IDS`, mount a new
`<ModulePage moduleId="..." />` route, and add a nav tab to `Layout.tsx`.

## Design

Glassmorphism built from four Tailwind primitives in `src/index.css`:

- `.glass` — frosted glass cards (primary surface)
- `.glass-subtle` — lighter variant for nested chat bubbles
- `.btn-primary` / `.btn-secondary` / `.btn-ghost`
- `.input` / `.chip` / `.chip-active`

Dark mode is the default (`<html class="dark">` is set in `index.html`
before React mounts so there's no flash). The `ThemeToggle` component
persists the user's preference in `localStorage['zillit.theme']`.

## Layout

```
src/
├── main.tsx                   # entry + theme bootstrap
├── App.tsx                    # routes + auth bootstrap
├── index.css                  # Tailwind + glassmorphism tokens
├── shared/
│   ├── api/{client,auth}.ts
│   ├── crypto/                # Web Crypto AES + moduledata + bodyhash
│   ├── wire/                  # snake/camel + sortedStringify
│   ├── types/                 # domain types
│   ├── stores/authStore.ts
│   ├── utils/date.ts
│   └── components/            # Glass, Modal, Layout, ThemeToggle, Avatar, DietaryTagChip
├── features/
│   ├── module/                # shared shell used by both modules
│   │   ├── api/{units,menu,chat}.ts
│   │   ├── stores/moduleStore.ts
│   │   ├── utils/structuredMessageParser.ts
│   │   └── components/
│   │       ├── ModulePage.tsx
│   │       ├── UnitTabs.tsx
│   │       ├── MenuListView.tsx
│   │       ├── MenuItemForm.tsx
│   │       ├── MenuItemDetailSheet.tsx
│   │       ├── chat/{ChatWindow,MessageComposer,TextMessageCell,CommentsList}.tsx
│   │       └── poll/{MenuPollCard,PollVoteCard,PollVoteBreakdownSheet}.tsx
│   ├── catering/CateringPage.tsx
│   └── craftservice/CraftServicePage.tsx
└── pages/{LoginPage,NotFoundPage}.tsx
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc && vite build` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |

## iOS compatibility

The wire format is byte-identical to the iOS catering app — snake_case
payloads, alphabetically-sorted keys, AES-256-CBC encrypted chat bodies,
`moduledata` + `bodyhash` headers. Pointing the iOS app at the same
`zillit-catering-api` instance gives you a shared experience.
