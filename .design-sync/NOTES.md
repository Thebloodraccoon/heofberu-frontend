# Heofberu UI design-sync notes

## Repo shape

`src/components/ui` (`primitives.jsx` + `ThemeSwitcher.jsx`, plain JS/JSX — no TypeScript, no Storybook, no standalone package/dist) is a small shared-primitives folder inside the `heofberu-frontend` app, not a published component library. This sync scopes to just that folder — the app's much larger `src/features/**` tree (feature-specific components) is intentionally out of scope.

## Build setup (why `cfg.buildCmd` looks the way it does)

The package-shape converter needs a `node_modules/<pkg>` directory to resolve as the "package" — since this repo has no such package, `buildCmd` creates a scratch one at `node_modules/heofberu-ui/` (gitignored, ephemeral, recreated by the command every time):
- Copies the two source files in as-is (no build step exists for them — the converter runs in synth-entry mode, scanning the `.jsx` files directly for PascalCase exports).
- Copies in a `tsconfig.json` (source lives at `.design-sync/build.tsconfig.json`, committed) so esbuild's path-alias plugin can resolve `@/lib/theme.js`-style imports from `ThemeSwitcher.jsx`.
- Copies in a `package.json` stub (`dts.mjs`'s `projectFor` reads it unconditionally).
- Copies the Tailwind-compiled CSS from `npm run build`'s `dist/assets/index-*.css` output to `styles.css`, since Tailwind v4 only emits real (non-`@apply`) CSS after a full app build — `cfg.cssEntry` must point at compiled CSS, not the `@import "tailwindcss"` source file.

## Decisions made this sync

- **`ThemeSwitcher` excluded** (`componentSrcMap: {"ThemeSwitcher": null}`). It's `export default function ThemeSwitcher()` — synth-entry mode emits `export * from` for each source file, which does NOT re-export a default-only export, so it never lands on `window.HeofberuUI`. It's also a thin, app-specific toggle hardcoded to this app's `light`/`parchment` theme ids and `@/lib/theme.js` — not a generic reusable primitive, so exclusion is the right call, not just a workaround.
- **Font substitute accepted** (user confirmed). `--font-display` is a system-font stack (`"Palatino Linotype", "Book Antiqua", "Palatino", Georgia, "Times New Roman", serif`) with no shipped webfont — intentional, not a missing asset. Designs render it via whatever serif the viewer's OS provides.
- **`dtsPropsFor` hand-written for all 24 components.** Since the source is plain JS (no `.d.ts` anywhere), the converter's default synth-entry path produces empty/weak prop contracts. Prop shapes in `.design-sync/config.json` were transcribed from reading `primitives.jsx` directly — accurate as of this sync, but not compiler-verified, so a future signature change in `primitives.jsx` won't automatically invalidate the config's copy.
- **No provider needed.** Nothing in this component set reads from React context; styling comes entirely from Tailwind classes/tokens and CSS custom properties.

## Re-sync risks (read before the next sync)

- **The dark-background requirement is the single most important fact about this DS** — see `.design-sync/conventions.md`. If it's ever rewritten, keep that warning: components use light text tones calibrated for a dark ground and are unreadable on white.
- **`dtsPropsFor` can drift.** If `primitives.jsx` changes a component's props, `.design-sync/config.json`'s hand-written contract for that component needs a matching edit — nothing will flag the mismatch automatically.
- **`Chip` renders no text color of its own** (`.badge-row` is layout-only). Its authored preview (`.design-sync/previews/Chip.tsx`) sets `text-sm text-stone-300` on the wrapper to compensate, matching how `detailHelpers.jsx` uses it in the real app (inside an ancestor that supplies text color). Any new Chip story needs the same treatment or it'll render invisible.
- **`Modal`/`ConfirmDialog` use `cfg.overrides.<Name>.viewport`** (`640x420` / `480x320`) tuned by eyeballing the rendered dialogs — if their content grows meaningfully, the viewport may need widening/heightening again (watch for a dialog with its title clipped off the top of the card).
- **No Storybook** — every preview is hand-authored under `.design-sync/previews/`. Any component added to `src/components/ui` in the future ships with a floor card until someone writes and grades a preview for it.
- **`styles.css` comes from a full `npm run build` of the whole app**, not a component-scoped build — it will always include Tailwind classes used anywhere in the app, not just in `src/components/ui`. Harmless (just non-minimal), but means the shipped CSS is larger than the strict minimum for these 24 components.
