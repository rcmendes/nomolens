# 🌅 Nomo Lens

> **Nomo** means *"name"* in Esperanto.

**Nomo Lens** is a premium, all-in-one domain intelligence platform. Whether you're brainstorming the next big startup name with AI or deeply auditing an existing domain's ownership and restrictions, Nomo Lens provides a sleek, glassmorphism-inspired interface to get the job done.

Built with **Node.js**, **React 18**, and **Google Gemini AI**, it bridges the gap between raw WHOIS data and creative brand development — all from a single, beautiful interface.

---

## ✨ Features

### 🔍 Direct Domain Search

Enter a base name and Nomo Lens instantly checks it across every TLD in your profile:

- **Multi-TLD Bulk Checking** — Select any combination of the 11 predefined TLDs (`.com`, `.io`, `.co`, `.ai`, `.net`, `.org`, `.app`, `.dev`, `.tech`, `.me`, `.pro`) or add your own custom TLDs (e.g., `.xyz`, `.co.uk`). All variants are verified simultaneously.
- **Real-time Availability** — Domain status is checked via the GoDaddy API.
- **Live Pricing** — Displays the current registration price for available domains in your selected currency.
- **Deep WHOIS Insights** — For registered domains, fetches owner/registrant name, registration date, and expiration date.
- **TLD Restriction Guardrails** — Automatically identifies registration restrictions for specialized or country-code TLDs (e.g., `.us`, `.edu`, `.gov`, `.eu`, `.ca`, `.au` and more). Each card shows the restriction type and eligibility requirements.
- **Expiring Soon Detection** — Domains expiring within 30 days are flagged with an "Expiring Soon" status and a countdown, helping you spot acquisition opportunities.
- **Smart Client-Side Cache** — Results are cached in `localStorage` with a smart TTL (tied to the domain's own expiration date where available) to save API credits on repeated lookups.
- **URL State Sync** — The active tab, query, and selected TLDs are reflected in the URL, making searches shareable and bookmarkable.

### 🤖 AI-Powered Name Generation

Powered by **Google Gemini 2.5 Flash**, the generator creates brandable, memorable domain name candidates tailored to your product:

- **Product Context Prompt** — Describe what you're building in plain language (up to 1,000 characters). Gemini uses your full description to generate contextually relevant names.
- **Voice Dictation** — Can't type? Click the mic button to dictate your prompt. Supports English, Spanish, French, and Portuguese via the Web Speech API.
- **Weighted Focus Words** — Add up to 5 single-token keywords that act as higher-priority semantic anchors for the AI (e.g., "trust", "speed", "finance"). These nudge name generation beyond what the description alone provides.
- **Prefix & Suffix Hints** — Supply comma-separated prefix ideas (e.g., `get, try, my`) and/or suffix ideas (e.g., `app, hq, labs`) that the model may blend in when natural.
- **Automatic TLD Expansion** — The 10 base names Gemini returns are automatically paired with every TLD in your active profile, producing a fully expanded candidate list.
- **Exclusion Blocklist** — Already verified domains (from your `localStorage` cache) are passed to Gemini as an exclusion list, preventing duplicate suggestions.
- **Graceful Fallback** — If the Gemini API key is not set, a deterministic local fallback algorithm generates base names from your prompt tokens, keywords, and prefix/suffix hints — so the app is always functional.

### 🌳 Interactive Generator Tree View

Generated names are displayed in an interactive hierarchical tree:

- Each **base name** is a node with its TLD expansions as branches.
- **Select / Deselect** individual TLD variants or click the base name to toggle all its variants at once.
- A **bulk verify** button runs availability checks on all selected domains simultaneously, with a live progress counter ( `3 / 12 verified`).
- Results from verification flow directly into the **Results Dashboard** below the tree.

### 📊 Advanced Results Dashboard

Shared by both the Direct Search and Generator tabs, the dashboard provides powerful tools to manage large result sets:

- **Results Cockpit** — A summary bar showing the count of free, taken, N/A, and error results at a glance.
- **Best Value Pick** — Automatically identifies and highlights the cheapest available domain.
- **"Copy all free"** — Copies all available domain names to the clipboard with a single click (also accessible via the Command Palette).
- **"Open in registrar"** — Opens the best-value domain directly on Namecheap in a new tab.
- **Status Filter Pills** — Toggle between *Free*, *Expiring Soon*, *Taken*, and *Unavailable* results with one click. Multiple filters can be active simultaneously.
- **Domain Multi-Select Filter** — A searchable dropdown lets you show/hide specific domain names from the results grid, useful for large bulk searches.
- **Flexible Sorting** — Sort results by Name A→Z/Z→A, Price low→high/high→low, or TLD A→Z/Z→A.
- **Per-Card Refresh** — Each result card has a refresh icon to recheck that specific domain independently without re-running the full search.
- **Per-Card Favorite** — Each result card has a star icon to instantly save any domain to your Favorites list.

### ⭐ Favorites

A persistent personal domain watchlist, stored in `localStorage`:

- **Save from anywhere** — Star any result card in Direct Search or the Generator to add it to Favorites.
- **Status Tracking** — Each saved domain shows its last-known status (Free, Taken, Expiring, N/A) and price.
- **Notes & Tags** — Expand any card to add a private free-text note and comma-separated tags (e.g., `watch`, `client-a`, `priority`).
- **One-click Recheck** — Hit the refresh button on any favorite to re-query the API and update its status.
- **Filter, Search & Sort** — The Favorites tab includes the same sidebar filter pills, a text search box, and sort options as the Results Dashboard.
- **Export** — Download your full favorites list as a **JSON** file or a **CSV** file (with columns: domain, status, price, currency, notes, tags, checkedAt).

### ⌨️ Command Palette

A keyboard-centric power-user feature. Press **⌘K** (Mac) or **Ctrl+K** (Windows/Linux) to open a searchable command launcher:

| Command | What it does |
|---|---|
| Go to Direct Search | Switches to the search tab |
| Go to Generate with AI | Switches to the generator tab |
| Go to Favorites | Switches to the favorites tab |
| Focus domain search field | Moves keyboard focus to the search input |
| Focus AI prompt | Moves keyboard focus to the generator textarea |
| Verify selected domains | Triggers bulk verify on current generator selection |
| Show only available domains | Applies the "Free" status filter to results |
| Reset result filters | Clears all active filters back to defaults |
| Copy all available domains | Copies free domain names to clipboard |

---

## 🛠 Tech Stack

### Frontend
| Library | Version | Role |
|---|---|---|
| React | 18 | UI framework |
| Vite | Latest | Build tool & dev server |
| Vanilla CSS | — | Styling (glassmorphism, custom design tokens, dark/light themes) |
| Web Speech API | Native | Voice dictation in the generator |

### Backend
| Library | Version | Role |
|---|---|---|
| Express | ^5 | HTTP server & API router |
| @google/genai | ^1.46 | Google Gemini AI client |
| whois-json | ^2 | WHOIS protocol lookups |
| node-cache | ^5 | In-memory domain result cache (5-min TTL) |
| helmet | ^8 | Security headers |
| express-rate-limit | ^8 | API rate limiting (30 req/min) |
| cors | ^2 | Cross-origin request handling |
| dotenv | ^17 | Environment variable loading |
| chalk | ^4 | Colored console output |

### Infrastructure
- **Deployment**: Vercel (serverless, zero-config via `vercel.json`)
- **Data Providers**: GoDaddy API (availability + pricing), WHOIS Protocol (ownership + dates)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- A [GoDaddy Developer](https://developer.godaddy.com/) account (for the domain API — free tier available)
- A [Google AI Studio](https://aistudio.google.com/) API key (for Gemini — free tier available)

### 1. Clone & Install

```bash
git clone https://github.com/rcmendes/domain-checker.git
cd nomolens

# Install backend dependencies
npm install

# Install frontend dependencies
cd ui && npm install && cd ..
```

### 2. Configure Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env.dev
```

```env
# .env.dev — local development

# GoDaddy API (OTE or Production)
GODADDY_API_KEY=your_godaddy_api_key
GODADDY_API_SECRET=your_godaddy_api_secret

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Optional: change the backend port (default: 3001)
# PORT=3001
```

> **Note:** If `GEMINI_API_KEY` is not set, the generator will still work using a local deterministic fallback algorithm. The app is fully functional without a Gemini key for all direct search features.

### 3. Run in Development Mode

Starts the Express backend and the Vite dev server concurrently with hot-reload:

```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173) (Vite dev server)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

### 4. Run in Production Mode

Builds the frontend bundle and starts the Express server to serve it:

```bash
npm run prod
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 📡 API Reference

### `GET /api/check`

Checks a single domain's availability, price, and WHOIS data. Results are cached server-side for 5 minutes.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `domain` | `string` | Yes | The full domain name (e.g., `example.com`). If no TLD is provided, `.com` is appended. |

**Response (200 OK):**

```json
{
  "domain": "example.com",
  "available": false,
  "price": null,
  "currency": "USD",
  "owner": "ICANN",
  "purchasedDate": "1995-08-14T04:00:00Z",
  "expirationDate": "2026-08-13T04:00:00Z",
  "restrictions": {
    "description": "Generally unrestricted.",
    "countryRestriction": "None"
  },
  "error": false,
  "whoisError": false
}
```

**Error Responses:** `400 Bad Request` (invalid/missing domain), `429 Too Many Requests` (rate limit), `500 Internal Server Error`.

---

### `POST /api/generate`

Uses Google Gemini to generate 10 creative base domain name candidates, then expands them with the requested TLDs.

**Request Body (JSON):**

| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | `string` | Yes | Product context description (max 1,000 chars). |
| `keywords` | `string[]` | No | Up to 5 weighted concept words (single tokens, no spaces). |
| `prefixes` | `string[]` | No | Optional prefix tokens for the AI to consider blending in. |
| `suffixes` | `string[]` | No | Optional suffix tokens for the AI to consider blending in. |
| `tlds` | `string[]` | No | TLD extensions to apply (e.g., `[".com", ".io"]`). Defaults to `[".com", ".io", ".net"]`. |
| `exclude` | `string[]` | No | Domain names the AI should not suggest (blocklist). |

**Response (200 OK):**

```json
{
  "suggestions": [
    {
      "base": "budgetpair",
      "domains": ["budgetpair.com", "budgetpair.io"]
    },
    {
      "base": "goalflow",
      "domains": ["goalflow.com", "goalflow.io"]
    }
  ]
}
```

**Error Responses:** `400 Bad Request` (validation error with message), `429 Too Many Requests`, `500 Internal Server Error`.

---

## 📂 Project Structure

```text
nomolens/
├── ui/                         # React/Vite Frontend
│   ├── src/
│   │   ├── App.jsx             # Root component: tab shell, global state & URL sync
│   │   ├── DirectSearchTab.jsx # Direct search tab wrapper
│   │   ├── GeneratorTab.jsx    # AI generator form + tree view
│   │   ├── FavoritesTab.jsx    # Favorites tab wrapper
│   │   ├── FavoritesPanel.jsx  # Favorites list, filters, export
│   │   ├── VerificationResultsSection.jsx  # Results grid with sidebar controls
│   │   ├── ResultsCockpit.jsx  # Summary stats bar above results
│   │   ├── TldProfileBar.jsx   # Shared TLD selector chip bar
│   │   ├── CommandPalette.jsx  # ⌘K command launcher
│   │   ├── FieldInfo.jsx       # Info tooltip/popover helper
│   │   ├── ToastProvider.jsx   # Toast notification system
│   │   ├── domainResultUtils.js # Shared status/summary utilities
│   │   ├── icons.jsx           # SVG icon components
│   │   └── index.css           # All styles (design tokens, glassmorphism, themes)
│   ├── public/                 # Static assets (logo, favicon)
│   └── index.html              # HTML entry point (loads Outfit + Caveat fonts)
│
├── server.js                   # Express server, API routes, rate limiting
├── gemini.js                   # Gemini AI integration & fallback logic
├── godaddy.js                  # GoDaddy API client for availability + pricing
├── whoisUtil.js                # WHOIS protocol client + TLD restriction map
├── config.js                   # Environment & port configuration
├── vercel.json                 # Vercel deployment configuration
├── .env.example                # Template for required environment variables
└── package.json                # Scripts & dependencies
```

---

## ☁️ Deployment on Vercel

The project is pre-configured for zero-touch Vercel deployment:

1. Push your repository to GitHub (or another Git provider).
2. Create a new Vercel project and import the repository.
3. Add the following **Environment Variables** in the Vercel project settings:
   - `GODADDY_API_KEY`
   - `GODADDY_API_SECRET`
   - `GEMINI_API_KEY`
4. Vercel will automatically build the frontend (`ui/`) and deploy the Express backend as a serverless function, as defined in `vercel.json`.

No additional configuration is required.

---

## 🎨 Design System

Nomo Lens uses a custom glassmorphism design system defined entirely in `index.css`:

- **Two themes**: Dark (default, deep navy/indigo gradient) and Light (soft lavender gradient), switchable at runtime.
- **Design tokens**: All colors, shadows, and surface styles are CSS custom properties, making theme switching instantaneous via a `data-theme` attribute on `<html>`.
- **Typography**: [Outfit](https://fonts.google.com/specimen/Outfit) (primary) and [Caveat](https://fonts.google.com/specimen/Caveat) (tagline).
- **Animations**: Entry animations (fade-in, slide-up, scale-in) via CSS `@keyframes`. No JavaScript animation library is used.
- **Accessibility**: Focus rings, `sr-only` utility class, ARIA roles on tab list, tab panels, listboxes, and dialogs.

---

## 📄 License

This project is licensed under the **ISC License**.
