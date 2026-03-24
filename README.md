# Domain Horizon

Check comprehensive information about domains, including availability status, price, current owner, purchased date, expiration date, and use/country restrictions. This project now features a shiny, modern web UI alongside its Node.js API and CLI tool.

## Features

- **Domain Availability**: Check if a domain is available for registration via the GoDaddy API.
- **Detailed Domain Information**: Fetch extended WHOIS information, including:
  - Current Owner (or Privacy status)
  - Purchased Date
  - Expiration Date
- **Price Estimation**: Get an estimated price for domain registration or transfer.
- **Usage & Country Restrictions**: Automatically identifies use restrictions or special country requirements based on the Top-Level Domain (TLD) (e.g., `.us`, `.uk`, `.edu`, `.bank`).
- **Modern Web UI**: A beautiful glassmorphism-themed React application.

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd domain-horizon
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd ui
   npm install
   cd ..
   ```

## Configuration

Create a `.env` file in the project root containing your API credentials:

```env
# GoDaddy API keys
GODADDY_API_KEY=your_api_key
GODADDY_API_SECRET=your_api_secret

# Note: Without valid GoDaddy credentials, the tool will run in MOCK mode.
```

## Usage

### Modern Web UI (Recommended)

Start both the backend API server and the frontend UI concurrently from the project root:

```bash
npm run dev
```

Then, open your browser to `http://localhost:5173` to interact with the new web UI!

If you prefer to run them separately:
- **Backend only**: `npm run server`
- **Frontend only**: `npm run ui`

### Command Line Interface

You can still use the legacy Node.js CLI to check availability in bulk:

```bash
node index.js check --domains <comma_separated_domains> [options]
```

**Options:**
- `-f, --file <path>`: Path to a text file containing domain names (one per line)
- `-d, --domains <comma_separated_domains>`: Comma-separated list of domains to check
- `-t, --tlds <comma_separated_tlds>`: Comma-separated list of TLDs to append (e.g. com,io,net)

**Examples:**

```bash
# Check multiple domains
node index.js check -d example.com,google.com

# Combine a base name with multiple TLDs
node index.js check -d mycoolstartup -t com,net,io
```

## Structure

- `server.js`: Express API backend serving domain information via `/api/check`.
- `whoisUtil.js`: Utility integration with the WHOIS network and logic for evaluating domain restrictions.
- `index.js` & `godaddy.js`: Core logic for GoDaddy availability checks and the CLI interface.
- `ui/`: The modern React Vite frontend application.
