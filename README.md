# 🌅 Domain Horizon

**Domain Horizon** is a premium, all-in-one domain intelligence platform. Whether you're brainstorming the next big startup name with AI or deeply auditing an existing domain's ownership and restrictions, Domain Horizon provides a sleek, glassmorphism-inspired interface to get the job done.

Built with **Node.js**, **React**, and **Google Gemini AI**, it bridges the gap between raw WHOIS data and creative brand development.

---

## ✨ Key Features

### 🔍 Direct Domain Search
Get instant, comprehensive data on any domain:
- **Real-time Availability**: Checks status via GoDaddy's API.
- **Accurate Pricing**: Live registration and transfer price estimates.
- **Deep WHOIS Insights**: Fetches owner details, registration dates, and expiration timelines.
- **TLD Guardrails**: Automatically identifies registration restrictions for specialized TLDs (e.g., `.us`, `.edu`, `.bank`).

### 🤖 AI-Powered Name Generation
Stuck on a name? Let Gemini do the heavy lifting:
- **Contextual Brainstorming**: Provide a required product prompt, and Gemini generates 10 relevant, creative base names.
- **Weighted Concept Words**: Optionally add up to 5 high-priority keywords that steer name generation toward your core product concept.
- **Smart Modifiers**: Add custom prefixes and suffixes (e.g., "get", "app", "hq") to your ideas.
- **Multi-TLD Expansion**: Automatically apply your favorite TLDs to every AI suggestion.
- **Interactive Tree View**: Explore suggestions in a hierarchical structure and bulk-verify availability with one click.

### 📊 Advanced Results Dashboard
Manage your findings with powerful UI tools:
- **Status Filtering**: Quickly toggle between *Free*, *Taken*, and *Expiring Soon* domains.
- **Multi-Select Filtering**: Focus on specific name variants by filtering the results list.
- **Flexible Sorting**: Order results by Name, Price, or TLD extension.
- **Persistent Cache**: Remembers verified domains to save API credits and time.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Framer Motion (Animations), Glassmorphism CSS.
- **Backend**: Node.js, Express.
- **AI Engine**: Google Gemini (via `@google/genai`).
- **Data Providers**: GoDaddy API, WHOIS Protocol.
- **Security**: Helmet, Express Rate Limit, CORS.
- **Performance**: Server-side caching with `node-cache`.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- API Keys for GoDaddy and Google Gemini.

### 1. Installation
Clone the repository and install dependencies for both the server and the UI:

```bash
git clone https://github.com/rcmendes/domain-checker.git
cd domain-horizon

# Install Backend Dependencies
npm install

# Install Frontend Dependencies
cd ui && npm install && cd ..
```

### 2. Configuration
Create a `.env.dev` (for local work) or `.env.prod` file in the root directory. Use `.env.example` as a template:

```env
# GoDaddy API
GODADDY_API_KEY=your_key_here
GODADDY_API_SECRET=your_secret_here

# Gemini AI
GEMINI_API_KEY=your_gemini_key_here
```

### 3. Running the App

**Development Mode** (Runs backend & frontend concurrently with hot-reload):
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

**Production Mode** (Builds frontend and starts the Express server):
```bash
npm run prod
```

---

## 📡 API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/check` | `GET` | Verifies availability, price, and WHOIS info for a single domain. |
| `/api/generate` | `POST` | Uses Gemini to suggest names from required product prompt, optional weighted keywords, and selected TLDs. |

---

## 📂 Project Structure

```text
domain-horizon/
├── ui/                 # React/Vite Frontend
│   └── src/            # Components (App, Generator, Results)
├── server.js           # Main Express server & API routes
├── gemini.js           # AI Generation logic
├── godaddy.js          # GoDaddy API integration
├── whoisUtil.js        # WHOIS scraping and TLD restriction logic
├── config.js           # Environment & Port management
└── .env.example        # Template for API keys
```

---

## ☁️ Deployment

This project is optimized for **Vercel**:
1. Connect your GitHub repository to Vercel.
2. The `vercel.json` and `package.json` scripts are pre-configured to handle the build process.
3. Ensure you add your `GODADDY_API_KEY`, `GODADDY_API_SECRET`, and `GEMINI_API_KEY` to Vercel's Environment Variables.

---

## 📄 License
This project is licensed under the ISC License.
