# Design system implementation

The source of truth is `../Branding/# TRAVEL XM · Sistema de diseño.md`. This file records how it maps to code and every place where the branding file says "not defined" and we had to decide.

## Palette

The Academy uses the **Principal** palette only (branding rule 1: one palette per piece). The premium block is present in `styles/tokens.css` for parity but is never applied.

Tailwind's default colors, radii and shadows are removed in `app/globals.css`. Only brand values exist, so an off-brand color cannot be typed by accident.

| Utility | Token |
| --- | --- |
| `bg-page` | Cloudy White `#FDF6E3`, the page background. White is for cards and media only. |
| `bg-card` | White |
| `bg-sunken` | Guideline Gray |
| `bg-inverse` | Volcanic Stone |
| `text-ink` / `text-body` / `text-muted` | Black / Volcanic Stone / derived muted |
| `bg-primary` + `hover:bg-primary-hover` + `active:bg-primary-press` | Lime Green |
| `text-link` → `hover:text-link-hover` | Olive → Lime |
| `bg-toucan`, `bg-turquoise`, `bg-sunset`, `bg-rose`, `bg-olive` | Named brand accents |

## Typography

Fonts are self-hosted through `next/font` (Anton, Playfair Display, Montserrat, Arimo, Be Vietnam Pro). Role classes follow branding §2.3: `.xm-hero`, `.xm-display`, `.xm-title`, `.xm-title-sm`, `.xm-title-serif`, `.xm-subtitle`, `.xm-subtitle-sm`, `.xm-meta` (Yellow Toucan meta line over photos), `.xm-lead`, `.xm-body`, `.xm-body-sm`, `.xm-body-alt`, `.xm-caption`, `.xm-micro`.

Be Vietnam Pro is used only for dense admin tables (`font-alt`) and never in the same block as Arimo.

## Decisions where the branding file is silent

| Topic | Decision |
| --- | --- |
| **Token name collision** | Branding §6 declares `--text-display` and `--text-body` twice, as a color and as a font size, so the size silently wins. Sizes are renamed `--fs-*`. |
| **Breakpoints** | Tailwind defaults: 640 / 768 / 1024 / 1280. |
| **Mobile type scale (< 768px)** | Hero 48, display 40, title 32, title-sm 28, subtitle 24, subtitle-sm 20, lead 19, body 17. Desktop uses the branding values. |
| **Gutter and section padding** | 16px and 48px on mobile, 24px and 96px from 768px up. |
| **Tall hero veil** | `.xm-veil-tall` is the same bottom-up stone veil, deepened for hero panels where the text stack is taller than the base veil's 80px. It is still the branding veil, not a flat scrim. |
| **Bullets** | Readings use a plain disc in the muted color with body type, not icons, per branding §4.3. |
| **Charts** | One hue per chart (Olive Green, at least 3:1 on white), bars capped at 24px with 4px rounded data ends, value labels at the tip. Checked with the dataviz palette validator. |
| **Tabular figures** | `tabular-nums` only in tables and the player clock. |
| **Dark mode** | Not provided (`color-scheme: light`), as the branding file defines none. |
| **No labels above headings** | The branding eyebrow role (small lime caps above a title) is retired at TravelXM's request, and `.xm-eyebrow` no longer exists. Headings stand alone. Context such as a category, "Module 2 of 4" or a date goes below the title as muted text, as a badge, or in the meta line. The Yellow Toucan `.xm-meta` line over photos also sits below the title. |
| **Landing page** | The public landing uses the app's own components, not a marketing look: glass header, Cloudy White ground, `CertificateArt` (shared with /certificates), syllabus module rows, course-card anatomy and FAQ cards. Its one authored motion is `.xm-settle`: the sample certificate rises 24px and settles at -2° from 1024px up, in 340ms. |
| **No sideways overflow** | `html, body { overflow-x: clip }` and `:where(.grid) > * { min-width: 0 }` in `globals.css`. One overflowing element made phones zoom out the whole layout and displace the header and bottom tabs. Use `clip`, never `hidden`, so sticky positioning keeps working. |
| **Touch and input sizes** | Tap targets are at least 44px (menu items h-11, filter chips h-10). Every text input is at least 16px, so iOS never zooms on focus. |
| **Scrollbars** | `scrollbar-color: #cfc6b1 transparent` (the muted switch-track tone). |

## Rules enforced in components

- Corners are 0 by default, 4px on controls, 8px on cards, and pill-shaped only on tags, status dots, the switch and progress tracks.
- Shadows are only `shadow-card`, `shadow-raised` and `shadow-sticker`, all tinted with Volcanic Stone.
- The one gradient is turquoise to lime, top to bottom, on the landing hero only (`--gradient-hero`).
- Translucency appears only on the sticky header (`.xm-glass-header`) and the dialog scrim (`.xm-scrim`).
- Motion uses one curve (`ease-standard`) and three durations: 120ms for color, 200ms for lift and tabs, 340ms for photo zoom and reveals. There is no bounce, and `prefers-reduced-motion` is respected.
- Focus is a 2px turquoise outline with 2px offset, never removed. Cards use an inset ring because they clip overflow.
- Icons are Lucide at 20px with stroke 1.75, always beside a label or inside a button with `aria-label`.
- Cut-outs appear at most three per composition, at edges and corners, with the sticker shadow.
- Photos without an image render the striped `PhotoSlot` placeholder.

## Assets

- `public/brand/travelxm-logo.png` is the rhombus badge, shown at 56px minimum. Where it does not fit, `Wordmark` sets "TRAVEL XM" in Anton, per branding §4.7.
- `public/brand/cutouts/` holds the toucan, macaw, sloth and frog from the TravelXM Front project. The branding file references a 42-piece cut-out library that was not in the Branding folder.
- `assets/fonts/` holds TTF copies of the brand fonts (SIL OFL) for the certificate PDF.
