# Results View — TLD Pills Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the stretched full-width tree cards with compact base-name rows + TLD pills so name and status are always adjacent.

**Architecture:** Remove `DomainGroup`/`DomainLeaf` components and all `.tree-group*`/`.tree-leaf*`/`.tree-leaves` CSS. Replace with `DomainRow` (one row per suggestion) and `TldPill` (one button per domain variant). The pill fuses selection state and verification status into a single compact element.

**Tech Stack:** React (JSX), plain CSS in `ui/src/index.css`, no test runner in the project (visual verification via `npm run dev`).

---

### Task 1: Remove tree component code from GeneratorTab.jsx

**Files:**
- Modify: `ui/src/GeneratorTab.jsx`

**Step 1: Delete the `DomainLeaf` component (lines 29–64)**

Remove the entire `DomainLeaf` function. It is replaced by `TldPill` in Task 2.

**Step 2: Delete the `DomainGroup` component (lines 66–99)**

Remove the entire `DomainGroup` function. It is replaced by `DomainRow` in Task 2.

**Step 3: In the JSX return (around line 452), remove the tree markup**

Replace this block:
```jsx
<div className="tree-container">
  <div className="tree-root">
    <span className="tree-root-name">Your latest run</span>
  </div>

  <div className="tree-branches">
    {generationResult.suggestions.map((suggestion, idx) => (
      <div key={`${suggestion.base}-${idx}`} className="tree-branch">
        <div className="tree-line" />
        <DomainGroup
          label={`${suggestion.base}`}
          domains={suggestion.domains}
          selectedDomains={selectedDomains}
          onToggle={toggleDomainSelection}
          bulkVerifying={bulkVerifying}
          bulkResults={bulkResults}
          onToggleGroup={handleToggleGroup}
        />
      </div>
    ))}
  </div>
</div>
```

With this placeholder (to be filled in Task 2):
```jsx
<div className="domain-rows">
  {/* TODO: DomainRow per suggestion */}
</div>
```

**Step 4: Verify the app still starts without JS errors**

```bash
cd ui && npm run dev
```

Open browser. The results section will be empty after generation — that's expected at this stage.

**Step 5: Commit**

```bash
git add ui/src/GeneratorTab.jsx
git commit -m "refactor: remove tree components from GeneratorTab"
```

---

### Task 2: Add TldPill and DomainRow components

**Files:**
- Modify: `ui/src/GeneratorTab.jsx`

**Step 1: Add `TldPill` component above `GeneratorTab` (after the `SeedRootIcon` function)**

```jsx
function TldPill({ domain, selected, onToggle, disabled, bulkResults }) {
  const result = bulkResults[domain];

  let statusLabel = null;
  let modifier = '';

  if (result) {
    if (result.loading) {
      statusLabel = 'Checking…';
      modifier = 'checking';
    } else if (result.error) {
      statusLabel = 'Error';
      modifier = 'error';
    } else if (result.data?.available) {
      statusLabel = '✓ Free';
      modifier = 'available';
    } else {
      statusLabel = 'Taken';
      modifier = 'taken';
    }
  }

  const classNames = [
    'tld-pill',
    modifier && `tld-pill--${modifier}`,
    selected && 'tld-pill--selected',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classNames}
      onClick={() => onToggle(domain)}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${selected ? 'Deselect' : 'Select'} ${domain}${statusLabel ? ` — ${statusLabel}` : ''}`}
    >
      <span className="tld-pill-domain">{domain}</span>
      {statusLabel && <span className="tld-pill-status">{statusLabel}</span>}
    </button>
  );
}
```

**Step 2: Add `DomainRow` component directly below `TldPill`**

```jsx
function DomainRow({ base, domains, selectedDomains, onToggle, bulkVerifying, bulkResults, onToggleGroup }) {
  const allSelected = domains.every((d) => selectedDomains.has(d));

  return (
    <div className="domain-row">
      <button
        type="button"
        className={`domain-row-label ${allSelected ? 'domain-row-label--all' : ''}`}
        onClick={() => onToggleGroup(domains, !allSelected)}
        disabled={bulkVerifying}
        aria-label={`${allSelected ? 'Deselect' : 'Select'} all variants for ${base}`}
        title={`Click to ${allSelected ? 'deselect' : 'select'} all ${base} variants`}
      >
        {base}
      </button>
      <div className="tld-pills">
        {domains.map((d) => (
          <TldPill
            key={d}
            domain={d}
            selected={selectedDomains.has(d)}
            onToggle={onToggle}
            disabled={bulkVerifying}
            bulkResults={bulkResults}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Replace the placeholder in the JSX with real `DomainRow` usage**

Replace:
```jsx
<div className="domain-rows">
  {/* TODO: DomainRow per suggestion */}
</div>
```

With:
```jsx
<div className="domain-rows">
  {generationResult.suggestions.map((suggestion, idx) => (
    <DomainRow
      key={`${suggestion.base}-${idx}`}
      base={suggestion.base}
      domains={suggestion.domains}
      selectedDomains={selectedDomains}
      onToggle={toggleDomainSelection}
      bulkVerifying={bulkVerifying}
      bulkResults={bulkResults}
      onToggleGroup={handleToggleGroup}
    />
  ))}
</div>
```

Also replace the "Your latest run" section header text. Find this in the JSX:

```jsx
<h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>
  Name ideas worth a closer look
  ...
</h3>
```

Add a small muted label below the `<h3>` (before the `domain-rows` div):

```jsx
<p className="results-run-label">Latest generation</p>
```

**Step 4: Verify in browser**

Run `npm run dev`, generate names, confirm:
- Each suggestion appears as a row: base name on the left, pills on the right
- Clicking a pill toggles selection (pill border changes)
- Clicking the base name toggles all pills for that row

**Step 5: Commit**

```bash
git add ui/src/GeneratorTab.jsx
git commit -m "feat: add TldPill and DomainRow components"
```

---

### Task 3: Replace tree CSS with domain-row + pill styles

**Files:**
- Modify: `ui/src/index.css`

**Step 1: Remove the old tree section**

Find and delete the entire block between these two comments (inclusive):
```
/* ── Hierarchical Tree Groups ─── */
```
down to and including `.leaf-badge-wrap { ... }` (around lines 1384–1495).

Also remove these classes from earlier in the file (they are no longer used):
- `.tree-container` (around line 951)
- `.tree-root` (around line 958)
- `.tree-branches` / `.tree-branches::before` (around line 971)
- `.tree-branch` (around line 988)
- `.tree-line` (around line 995)
- `.tree-card` / `.tree-card:hover` / `.tree-card:hover::after` / `.tree-card.selected` (around line 1003)
- `.tree-checkbox-label` / `.tree-checkbox-label input` (around line 1036)
- `.tree-domain-text` (around line 1049)

Keep `--tree-bg`, `--tree-hover`, `--tree-border` CSS variables — they are reused as pill surface tokens.

**Step 2: Add new domain-row and pill CSS**

Add this block in place of the removed section:

```css
/* ── Domain Rows + TLD Pills ───────────────────────────────────────────────── */

.domain-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.domain-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.35rem 0;
}

.domain-row-label {
  flex-shrink: 0;
  width: 160px;
  font-weight: 600;
  font-size: 0.9rem;
  font-family: var(--font-mono, monospace);
  color: var(--text-main);
  text-align: left;
  background: none;
  border: none;
  padding: 0.3rem 0;
  cursor: pointer;
  opacity: 0.75;
  transition: opacity 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.domain-row-label:hover {
  opacity: 1;
}

.domain-row-label--all {
  opacity: 1;
  color: var(--primary);
}

.tld-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}

/* Base pill */
.tld-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--tree-border);
  background: var(--tree-bg);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-main);
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  white-space: nowrap;
}

.tld-pill:hover {
  background: var(--tree-hover);
  transform: translateY(-1px);
}

.tld-pill:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Selected */
.tld-pill--selected {
  border-color: var(--primary);
  background: color-mix(in oklab, var(--primary) 14%, var(--tree-bg));
}

/* Status: Available */
.tld-pill--available {
  border-color: var(--color-available, #22c55e);
  background: color-mix(in oklab, #22c55e 10%, var(--tree-bg));
}

.tld-pill--selected.tld-pill--available {
  background: color-mix(in oklab, #22c55e 22%, var(--tree-bg));
}

/* Status: Taken */
.tld-pill--taken {
  border-color: color-mix(in oklab, var(--color-taken, #f87171) 60%, transparent);
  background: color-mix(in oklab, #f87171 7%, var(--tree-bg));
}

/* Status: Checking */
.tld-pill--checking {
  animation: pill-pulse 1.2s ease-in-out infinite;
}

@keyframes pill-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Status: Error */
.tld-pill--error {
  border-color: var(--color-warning);
}

.tld-pill-domain {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
}

.tld-pill-status {
  font-size: 0.7rem;
  font-weight: 600;
  opacity: 0.85;
  padding-left: 0.1rem;
}

/* "Latest generation" muted label */
.results-run-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0 0 0.5rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
```

**Step 3: Verify in browser**

- Rows are left-aligned with base name label and pills side-by-side
- Pills are compact — name and status adjacent
- Available domains show green tint, taken show red tint
- Selected pills show primary-color border

**Step 4: Commit**

```bash
git add ui/src/index.css
git commit -m "style: replace tree CSS with domain-row and tld-pill styles"
```

---

### Task 4: Visual QA and cleanup

**Files:**
- Modify: `ui/src/index.css` (minor tweaks only if needed)

**Step 1: Generate names with multiple TLDs selected in the profile bar**

Verify that when each suggestion has multiple domains (e.g., `.com`, `.io`, `.co`), all pills appear on the same line and wrap gracefully on narrow windows.

**Step 2: Check both light and dark themes**

Toggle the theme. Confirm pill surfaces (`--tree-bg`, `--tree-border`) adapt correctly in both modes.

**Step 3: Run bulk verification**

Select several pills and click "Verify Selected". Confirm:
- Checking pills pulse
- Available pills turn green
- Taken pills turn muted red
- Selection + available combine to stronger green

**Step 4: Check accessibility**

Tab through the pills with keyboard. Each pill should be focusable and show a visible focus ring. The `aria-pressed` attribute should toggle with selection.

**Step 5: Commit any adjustments**

```bash
git add ui/src/index.css ui/src/GeneratorTab.jsx
git commit -m "style: visual QA tweaks for tld pills"
```
