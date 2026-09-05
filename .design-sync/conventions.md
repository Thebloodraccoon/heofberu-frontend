## Heofberu UI — conventions

**This is a dark-fantasy theme with no white/light surface.** There is no root provider component to wrap your tree in — instead, always give the page (or the top-level container) a dark background from the DS's own tokens before placing components on it, e.g. `style={{ background: 'var(--color-stone-950)' }}` or `className="bg-stone-950"` on the outermost element (or simply let `body`'s own rule apply — it already paints a dark radial-gradient background). **Never render these components on a plain white background** — most text uses light warm tones (`stone-100`–`stone-400`) calibrated for a dark ground, so on white they are unreadable or invisible. A `[data-theme="light"]` attribute on `<html>` switches to a *lighter* variant of the same warm dark palette (still not white) — apply it only if you deliberately want that second theme.

### Styling idiom

Tailwind utility classes (`bg-stone-900`, `text-stone-100`, `border-ember`, `rounded-lg`, …) plus a small set of hand-written semantic classes (`@apply`-based, shipped in `_ds_bundle.css`/`styles.css`) that carry the actual design language — prefer these over ad hoc utility stacks when composing your own layout glue:

| Class | Use |
|---|---|
| `.fantasy-panel` | The primary card/panel surface — bordered, gilded corner accents, dark gradient fill. Wrap detail cards, list items, and grouped content in it. |
| `.heading-hero` / `.heading-page` / `.heading-section` / `.heading-card` / `.heading-sub` | Heading scale, largest to smallest. |
| `.subtitle`, `.text-muted`, `.text-hint`, `.text-label`, `.text-label-sm` | Secondary/meta text tones. |
| `.text-body`, `.text-body-lg` | Body copy. |
| `.link-ember`, `.link-back` | Inline links (ember-colored, underline on hover). |
| `.avatar`, `.avatar-sm/md/lg/hero/sheet` | Circular avatar/emblem frames at fixed sizes. |
| `.input-base`, `.input-search`, `.input-compact`, `.input-narrow`, `.input-sm` | Text-input chrome variants (the `Input`/`TextArea`/`Select` components already apply `.input-base` internally). |
| `.btn-add`, `.btn-edit-inline`, `.btn-delete-inline`, `.btn-delete` | Small inline text-buttons (lighter-weight than the `Button` component, for compact list rows). |
| `.card-item`, `.card-item-p`, `.card-active`, `.card-highlight`, `.highlight-active` | Flat list-row/card surfaces and their active/highlighted states. |
| `.list-row`, `.list-row-padded` | Flex row layout for list items (space-between). |
| `.item-name`, `.item-desc-preview` | List-item title/description text. |
| `.badge-row`, `.chip-row` | Flex-wrap containers for rows of badges/chips (layout only — no visual styling of their own). |
| `.description-blockquote`, `.description-secondary` | Long-form flavor/description text blocks. |
| `.overlay-center`, `.overlay-blur` | Fixed full-screen overlay backdrops (used by `Modal`/`ConfirmDialog` internally). |
| `.ornate-rule` | Decorative gold horizontal divider. |
| `.skeleton` | Base shimmer-block styling (used by the `Skeleton*` components). |

Color tokens (Tailwind v4 `@theme`, usable as `bg-*`/`text-*`/`border-*` utilities or `var(--color-*)`): `stone-50…950` (the warm neutral scale — this DS's "gray"), `ember` / `ember-dark` (primary accent, orange-red), `gold` / `gold-light` (secondary accent, used for borders/dividers/decoration), `parchment`, `ink`. Font tokens: `--font-sans` (UI text) and `--font-display` (headings — a serif stack; falls back to the viewer's OS-installed serif fonts since no webfont ships).

### Where the truth lives

Read `styles.css` (imports `_ds_bundle.css`, which holds every class above plus the `@theme` token definitions) before styling anything by hand. Each component's `.prompt.md` documents its own props and real usage; its `.d.ts` is the prop contract — note that since this DS ships plain JS (no TypeScript), prop types were reconstructed by hand from the component source and describe the real accepted shape, but are not compiler-verified.

### Example composition

```jsx
<div style={{ background: 'var(--color-stone-950)', padding: 24 }}>
  <Card>
    <h3 className="heading-card">Меч +1</h3>
    <p className="text-body mt-1">Волшебный длинный меч, светится в присутствии нежити.</p>
    <div className="mt-3">
      <Badge tone="accent">Редкий</Badge>
    </div>
  </Card>
</div>
```
