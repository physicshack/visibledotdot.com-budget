# visible..

**ADHD-aware financial planning and executive function scaffolding.**

visible.. helps people with ADHD manage bills and cash flow by separating two cognitively distinct tasks:

- **Triage** — review everything and make decisions (pay / defer / skip) when calm
- **Payday** — on payday, execute one action at a time with no distraction

The app never conflates decision and execution. It treats financial avoidance as a symptom of executive function difficulty, not a character flaw.

Current UI version: **BETA v1.8**.

Live site: [visibledotdot.com](https://visibledotdot.com)  
Sandbox (GitHub Pages): [physicshack.github.io/visibledotdot.com-budget](https://physicshack.github.io/visibledotdot.com-budget/)

---

## Running locally

No build step required. The app is a single HTML file.

```bash
# Option 1 — open directly
open index.html

# Option 2 — serve locally (avoids camera/SW restrictions)
npx serve .
# or
python -m http.server 8080
```

Camera and service worker features require HTTPS or localhost.

---

## File structure

```text
visibledotdot.com-budget/
├── index.html          # Entire app — HTML, CSS, JS in one file (~4,200 lines)
├── sw.js               # Service worker — caching and payday push notifications
├── manifest.json       # PWA manifest
├── icon-192.png        # PWA icon
├── icon-512.png        # PWA icon
├── icon.png            # Fallback icon
├── .gitignore
├── README.md
└── docs/
    ├── visible-spec-v1.8.md       # Current product and architecture spec
    ├── visible-brief-v1.8.md      # Current one-page brief and emotional design contract
    ├── firebase-security.md       # Recommended Realtime Database rules
    ├── visible-positioning-v1.md  # Market positioning paper
    ├── ai-handoff.md              # Current assistant handoff
    ├── task-queue.md              # Unattended workflow task queue
    └── unattended-ai-workflow.md  # Claude/Codex coordination workflow
```

---

## Data model

All state lives in a single object `S`, persisted to `localStorage` under the key `paymind5`.

Key fields:

| Field | Type | Purpose |
|---|---|---|
| `incomeSources` | Array | Recurring income with schedule and next payday date |
| `bills` | Array | Ad-hoc bills — scanned, imported, or manual |
| `commitments` | Array | Regular outgoings (rent, subscriptions, etc.) |
| `decisions` | Object | `{billId: 'pay' \| 'defer' \| 'skip'}` |
| `planDates` | Object | `{billId: 'YYYY-MM-DD'}` — when to act on each bill |
| `instalments` | Object | `{billId: [{date, amount, paid}]}` |
| `currentBalance` | Number | Actual bank balance — anchors projections |
| `currentBalanceDate` | String | Date the balance was recorded |
| `narrative` | String | Last AI plan review output |
| `household` | Object | Firebase household sync metadata |
| `oneOffIncome` | Array | Expected one-time income items |
| `history` | Array | Per-period snapshots after payday completion |

State is synced to Firebase Realtime Database when a household is configured.

---

## AI features

The app calls the Anthropic Claude API directly from the browser for:

- **Plan review** — analyses bills, commitments, and cash flow; returns prioritised next steps
- **Bill scanning** — reads photos of postal mail and extracts structured bill data
- **Budget health check** — identifies structural observations about regular income vs commitments

### API key

Users must supply their own Anthropic API key via **More → Advanced → API Key**.

> **Security note:** API calls currently go directly from the browser using the `anthropic-dangerous-direct-browser-access` header. Keys are stored in localStorage. A lightweight backend proxy is planned to remove key exposure from the browser. See [docs/visible-spec-v1.8.md](docs/visible-spec-v1.8.md) for roadmap.

---

## Firebase sync (optional)

Household sync uses Firebase Realtime Database. To enable:

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Create a Realtime Database
3. Paste the database URL into **More → Household Sync**
4. Create or join a household

Data written to Firebase includes bills, commitments, decisions, and plan dates. It does **not** include API keys.

> **Security note:** See [docs/firebase-security.md](docs/firebase-security.md) for recommended Realtime Database rules. Current no-auth household sync is suitable for private beta only; production needs Firebase Auth or backend-controlled membership.

---

## Deployment

The app is static. Deploy `index.html`, `sw.js`, `manifest.json`, and the icon files to any static web host.

Current deployment: Fasthosts shared hosting via FTP.  
Test/sandbox: GitHub Pages (this repo), auto-deployed from `main`.

### Release steps (manual)

1. Test on GitHub Pages sandbox
2. FTP `index.html`, `sw.js`, `manifest.json`, and icon files to Fasthosts webspace
3. Verify live site on mobile browser

A formal release checklist is planned at `docs/release-checklist.md`.

---

## Known limitations

- **API key in browser** — direct Anthropic calls from frontend; proxy planned
- **No automated tests** — calculation logic is untested; extraction and tests planned
- **Notification reliability** — payday reminders use `setTimeout` inside the service worker; unreliable if browser is closed
- **Single HTML file** — CSS, markup, state, rendering, AI, Firebase, and camera logic are co-located; file splitting planned
- **Placeholder icons** — PWA icons exist but should be replaced with branded artwork before production launch
- **Firebase rules documented, not enforced by repo** — see `docs/firebase-security.md`; current no-auth sync remains private-beta only

---

## Roadmap

See [docs/visible-spec-v1.8.md](docs/visible-spec-v1.8.md) for the full product spec.

Immediate priorities:

- [ ] Fix income source name XSS in inline `onclick` attributes
- [ ] AI backend proxy (remove key from browser)
- [ ] Extract and test calculation logic
- [ ] Replace placeholder PWA icons

---

## Contributing

This repo is used as a shared workspace between the product owner and AI coding assistants (Claude, Codex).

Branch convention:

- `main` — deployed to GitHub Pages; merge only reviewed changes
- `codex/*` — Codex review or feature branches
- `claude/*` — Claude Code feature branches

Open a PR against `main`. The product owner reviews before merging.

---

## Licence

Private. All rights reserved.
