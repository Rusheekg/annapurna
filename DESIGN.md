# Annapurna — Design Guide (for the coding agent)

Apply this look to every screen. Calm, editorial, lots of whitespace. Think "premium lifestyle store", applied to a food-rescue tool.

## 1. Fonts (load with `next/font/google`, no CDN links)
- **Headings:** Playfair Display (weights 400, 500, italic 400). Large, tight line-height (1.05–1.1), slight negative letter-spacing.
- **Body / UI:** DM Sans (weights 400, 500, 600). 15–16px body, line-height 1.6.
- **Accent word:** in each main heading, set ONE word in Playfair Display *italic* in the sage colour. Example: "Surplus food, *rescued* before it spoils."
- **Eyebrow labels:** DM Sans, 11–12px, UPPERCASE, letter-spacing 0.18em, muted green, preceded by a small filled dot. Example: "● LIVE NEAR YOU".

## 2. Colours (define as CSS variables in globals.css)
| Token | Hex | Use |
|---|---|---|
| `--forest` | `#22392B` | Top bar, primary buttons, heading text |
| `--forest-ink` | `#1C2A21` | Main text |
| `--sage` | `#7A9A6A` | Italic accent words, eyebrow dots, active states |
| `--cream` | `#ECEBE3` | Hero / section backgrounds |
| `--paper` | `#F7F6F1` | Page background |
| `--card` | `#FFFFFF` | Cards |
| `--line` | `#E2E0D7` | Borders, dividers |
| `--muted` | `#6E7468` | Secondary text |
| `--gold` | `#C9973B` | Thin decorative rules, small icons, logo accents (from the logo) |
| `--amber` | `#B7791F` | Warnings: "pickup soon", expiring countdown |
| `--rust` | `#A94434` | Expired / errors only |

No gradients, no drop shadows heavier than `0 1px 2px rgba(0,0,0,0.04)`.

## 3. Layout
- Max content width 1100px, centred, side padding 24px (16px on mobile).
- Section spacing 64–96px desktop, 40px mobile.
- **Announcement bar** at the very top: forest background, cream text, 12px uppercase, letter-spaced. Text: "SYNTHETIC DEMO DATA · ANNAPURNA DOES NOT CERTIFY FOOD SAFETY".
- The **header** uses paper behind the 40px logo mark and the 22px Playfair Display wordmark. The session control shows Sign in or Sign out. Signed-in accounts also see the Post · Receive · Volunteer tabs and the notification bell, which shows events from all three.
- **Logo files:** `public/brand/logo-mark.png` (circular emblem, transparent corners), `public/brand/logo-full.jpg` (full brand artwork, use only on the About/pitch section, never in the header). Favicon and app icons live in `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`.
- **Tagline:** "Where surplus finds purpose." Use it under the wordmark on the home page and in the page `<title>` ("Annapurna · Where surplus finds purpose").

## 4. Components
- **Primary button:** forest background, white DM Sans 14px/500, square corners (radius 2px), padding 14px 22px, trailing "→" arrow. Hover: slightly lighter forest.
- **Secondary button:** transparent, 1px forest border, same shape.
- **Chips (food items, allergens, filters):** pill shape (radius 999px), 1px `--line` border, 13px text; selected = forest fill, white text.
- **Cards:** white, 1px `--line` border, radius 4px, padding 24px. No heavy shadows.
- **Status badge (top-left of a card):** tiny uppercase label, 10–11px, letter-spaced, square corners:
  - POSTED: white bg, forest border · CLAIMED: sage bg, white · COLLECTED: forest bg, white · DELIVERED: cream bg, forest text · EXPIRED: rust bg, white.
- **Stat pair:** big number in DM Sans 600 26–28px (e.g. "1,240"), small muted label under it ("Meals served"). Use in hero and impact dashboard.
- **Trust strip:** a thin full-width band (paper bg, top and bottom `--line`) with 3 items, each a thin line icon + bold title + muted sub-line:
  - "Time-limited pickups" / "Every listing has a pickup-by countdown"
  - "Allergen labels" / "Shown on every listing"
  - "Synthetic data" / "No real addresses or people"
- **Inputs:** no boxes; bottom border only (1px `--line`), forest on focus. Labels as eyebrow style above.
- **Match reason text:** muted DM Sans 13px with "·" separators, e.g. "2.1 km · fits your need of 60 · arrives 70 min early".
- Icons: `lucide-react`, stroke width 1.5, 18px.

## 5. Home page (`/`)
Two-column hero on cream background (stacks on mobile):
- Left: eyebrow "● FOOD RESCUE, HOSTEL TO SHELTER"; heading "Where surplus finds *purpose*." (italic word in sage); one muted sentence: "Annapurna connects surplus food from hostel messes to nearby shelters and community kitchens before it spoils."; primary button "Post surplus →" (goes to donor view) and secondary "See impact"; two stat pairs below (meals served, kg saved — read real numbers from the database).
- The right column centres the fully visible logo mark `/brand/logo-mark.png` inside a thin gold circle. The mark is about 320px on desktop.
- A thin centred gold rule separates the hero from the trust strip. Below the strip, "How it *works*." introduces three stacked rows on the left (Post, Match, Deliver). The right column is at most 460px wide and shows the "● RIGHT NOW, LIVE NEAR YOU" eyebrow above the animated demo feed. Below 900px, the demo feed follows the steps in a single column.

## 6. Don'ts
- Don't stretch, recolour or crop the logo mark further. Don't place it on dark backgrounds (it has a cream fill).
- No stock photos of people or real places. No emojis in the UI. No bright reds/blues.
- Don't change any data logic, API routes or the database while restyling.

## 7. Live notification feed (`components/ui/live-notification-feed.tsx`)
A ready-made animated feed component (TypeScript, Tailwind, shadcn-style colour tokens). It is already in the repo; do not rewrite it.

**Setup (the project is JavaScript, so add TypeScript support alongside it):**
1. `npm install -D typescript @types/react @types/node`. Next.js creates `tsconfig.json` on the next `npm run dev`. Existing `.js` files stay as they are.
2. Make the `@/` import alias work: in `tsconfig.json` set `"baseUrl": "."` and `"paths": { "@/*": ["./*"] }`. If a `jsconfig.json` exists, move its settings into `tsconfig.json` and delete it.
3. Do NOT run `npx shadcn init` or any shadcn CLI command: it would overwrite globals.css and the design.
4. Map the shadcn colour tokens the component uses onto our palette in `app/globals.css`. For Tailwind v4 use `@theme inline` (for Tailwind v3, add the same names under `theme.extend.colors`):
   - background → `--paper`, foreground → `--forest-ink`
   - card → `#FFFFFF`, card-foreground → `--forest-ink`
   - muted → `--cream`, muted-foreground → `--muted`
   - border → `--line`, primary → `--forest`, ring → `--sage`
5. The `components/ui/` folder is the standard place for reusable UI building blocks (shadcn convention). Keep it; future UI components go there too.

**Where to use it:**
- **How it works** shows the autoplaying synthetic demo from `components/home-live-feed.tsx`.
- The **site header** places a lucide Bell beside Sign out for signed-in accounts with a profile. It uses a 44px target and shows the account's unread count when it is above zero. Newly arrived items trigger one wiggle unless reduced motion is enabled.
- The **bell panel** is about 400px wide and capped at 70vh, with a full-width sheet below 640px. Show offers and Claim for receivers, listing status updates for donors, and pickup jobs with Accept, Mark collected, and Mark delivered for volunteers. Use the existing five-second polling and listing actions. Escape, outside click, and the close button dismiss the panel and restore focus to the bell.
- Opening a notification or using its action marks it read. **Read all** marks the active account's current notifications read. Store read IDs in localStorage per role and account so they survive polling and refreshes.
- Set the **feed title** in DM Sans at 14px and weight 600, scoped to the feed. Keep Read all and Clear on single lines wherever those controls are shown.
- **Receiver workspace:** show real offers as the feed with `autoplay={false}`. Each offer = `kind: "delivery"`, `steps: ["Posted","Claimed","Collected","Delivered"]`, `step` = current status index, `body` = match reason text, `actions: [{label:"Claim", done:"Claimed"}]`. In `onAction(id, "Claim")` call the existing claim API. Keep polling every 5 s and pass the updated list; new items animate in automatically.
- **Donor workspace:** "My listings" as the same delivery feed (no actions), so donors watch status move.
- **Volunteer workspace:** pickup jobs as delivery items with `actions: [{label:"Accept", done:"Accepted"}]`, then "Mark collected" / "Mark delivered".
- Use only palette colours for `accent` (forest, sage, gold, amber). No bright blues, pinks or purples, and no blurred colour glows behind it.
- The feed's rounded corners are allowed as the one exception to the square-corner rule.
