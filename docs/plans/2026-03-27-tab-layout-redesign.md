# Tab Layout Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign Generator and Direct Search tab layouts to use full width consistently (matching Favorites), eliminate wasted space, fix the overlapping mic button, and be responsive on mobile.

**Architecture:** Two changes — (1) Generator tab gets a two-column grid (form left, advanced options right) with the mic button moved below the textarea; (2) Direct Search tab gets a full-width search-bar-row (input + button side-by-side). Both always use `mode-section--wide`. CSS breakpoints collapse both to single column at ≤768px.

**Tech Stack:** React (JSX), vanilla CSS custom properties, no new dependencies.

---

## Context

### Current state (after previous session's changes)
- `GeneratorTab.jsx:244` — section class is now **conditionally** wide (`hasResult ? ' mode-section--wide' : ''`). This plan reverts that back to always-wide because the two-column layout fills the space properly.
- `DirectSearchTab.jsx` — always wide but content is capped at 700px via inline style on an inner div.
- Both tabs have the mic button `position: absolute` inside `.prompt-textarea-wrapper`, overlapping typed text.
- `.custom-tld-input` has `max-width: 300px`, artificially constraining the focus-words input.

### Files to modify
- `ui/src/GeneratorTab.jsx`
- `ui/src/DirectSearchTab.jsx`
- `ui/src/index.css`

---

## Task 1 — Generator Tab: revert conditional class, restructure JSX to two-column layout

**Files:**
- Modify: `ui/src/GeneratorTab.jsx`

This is the main structural change. The outer section reverts to always-wide. The inner `div` with the inline `maxWidth: 700px` style is removed. Content splits into `.gen-form-grid` with two children: `.gen-form-left` and `.gen-form-right`.

**Step 1: Locate the section opening tag and the inner wrapper div (lines ~244–246)**

Current code:
```jsx
<section className={`mode-section mode-section--static${hasResult ? ' mode-section--wide' : ''} glass`}>
  <div style={{ maxWidth: '700px', margin: '0 auto' }}>
```

Replace with:
```jsx
<section className="mode-section mode-section--static mode-section--wide glass">
  <p className="lead-muted-center">
    <SeedRootIcon />
    Describe what you are building in plain language—we suggest memorable name roots you can pair with the
    extensions you select in the bar above.
  </p>
  <form className="generator-form gen-form-grid" onSubmit={onGenerate}>
    <div className="gen-form-left">
```

> Note: The `<p className="lead-muted-center">` block moves OUT of the inner div and becomes a full-width intro above the grid. The `<form>` itself becomes the grid container.

**Step 2: Identify what goes in `.gen-form-left`**

The left column contains (in order):
1. The "What are you building?" field group (textarea + mic)
2. The focus words field group

These are currently inside `<form className="generator-form" onSubmit={onGenerate}>`. Remove that `<form>` tag — the `<form>` is now on the grid wrapper itself.

Left column contents (close the div before the right column):
```jsx
      {/* === LEFT COLUMN === */}
      <div className="gen-form-left">

        <div className="form-group">
          <FieldInfo
            label={
              <label htmlFor="gen-prompt">
                What are you building? <span className="required">*</span>
              </label>
            }
            ariaLabel="More about the product description"
          >
            <p>
              A short pitch works best: who it is for, the problem you solve, and the vibe you want. We send this
              text to the model as the main story behind your names.
            </p>
            <p>
              Suggestions are <strong>base names only</strong> (no ".com" in the list). Pick your TLDs in the
              profile bar—they apply when you verify availability.
            </p>
          </FieldInfo>
          <div className="prompt-textarea-wrapper">
            <textarea
              ref={ref}
              id="gen-prompt"
              placeholder="e.g. A calm budgeting app for couples who want shared goals without the spreadsheet…"
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              disabled={generating}
              rows="4"
              required
              maxLength={MAX_PROMPT_CHARS}
              aria-describedby="gen-prompt-char-count"
            />
          </div>
          <div className="prompt-footer">
            <p
              id="gen-prompt-char-count"
              className={`prompt-char-count${genPrompt.length >= MAX_PROMPT_CHARS ? ' prompt-char-count--max' : ''}`}
            >
              {genPrompt.length}/{MAX_PROMPT_CHARS} characters
            </p>
            <div className={`mic-split-btn ${isListening ? 'listening' : ''}`}>
              <select
                className="mic-split-lang"
                value={dictationLang}
                onChange={(e) => setDictationLang(e.target.value)}
                disabled={generating || isListening}
                title="Select dictation language"
                aria-label="Select dictation language"
              >
                <option value="en-US">EN</option>
                <option value="es-ES">ES</option>
                <option value="fr-FR">FR</option>
                <option value="pt-BR">PT</option>
              </select>
              <div className="mic-split-divider"></div>
              <button
                type="button"
                className="mic-split-action"
                onClick={handleDictate}
                disabled={generating}
                aria-label="Dictate prompt"
                title="Dictate prompt"
              >
                <MicIcon isListening={isListening} />
              </button>
            </div>
          </div>
        </div>

        <div className="form-group tld-section">
          <FieldInfo
            label={
              <span id="gen-keywords-label" className="field-section-label">
                Focus words (optional)
              </span>
            }
            ariaLabel="More about focus words"
          >
            <p>
              Add up to five single words (no spaces) that should weigh more heavily than the rest of your
              description—think "trust," "speed," or a niche you want in the name.
            </p>
            <p>They are optional; the model still reads your full description when you do not add any.</p>
          </FieldInfo>
          <div className="tld-chips">
            {genKeywords.map((keyword) => (
              <button
                key={keyword}
                type="button"
                className="tld-chip selected custom"
                onClick={() => handleRemoveGenKeyword(keyword)}
                disabled={generating}
                title="Remove this focus word"
              >
                {keyword} &times;
              </button>
            ))}
          </div>
          <div className="custom-tld-input">
            <input
              type="text"
              placeholder="Type a word, then Add"
              value={genKeywordInput}
              onChange={(e) => {
                setGenKeywordInput(e.target.value);
                if (genKeywordError) setGenKeywordError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddGenKeyword(e);
                }
              }}
              disabled={generating}
              aria-labelledby="gen-keywords-label"
            />
            <button
              type="button"
              className="add-tld-btn"
              onClick={handleAddGenKeyword}
              disabled={generating || !genKeywordInput.trim() || genKeywords.length >= MAX_WEIGHTED_WORDS}
            >
              Add
            </button>
          </div>
          <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            {genKeywords.length}/{MAX_WEIGHTED_WORDS} focus words—each one nudges the AI more than the surrounding
            text.
          </p>
          {genKeywordError && (
            <p className="tld-error-msg" role="alert">
              {genKeywordError}
            </p>
          )}
        </div>

      </div>
      {/* === END LEFT COLUMN === */}
```

**Step 3: Build `.gen-form-right` — advanced options + generate button**

The right column replaces the entire `<div className="advanced-accordion">` block and the old submit button. The accordion wrapper is removed; prefixes/suffixes are always visible with a small intro text.

```jsx
      {/* === RIGHT COLUMN === */}
      <div className="gen-form-right">

        <div className="gen-form-right-intro">
          <p className="advanced-panel-intro-text">
            Optional hints for how names might sound—the model treats them as inspiration, not a checklist.
          </p>
          <FieldInfoIcon ariaLabel="More about fine-tuning name style">
            <p>
              Prefixes and suffixes are comma-separated tokens (for example <code>get, try</code> or{' '}
              <code>app, ly</code>). We pass them to the model as ideas it may blend in when they still feel
              natural.
            </p>
            <p>You will not get every combination, and you can leave both fields empty.</p>
          </FieldInfoIcon>
        </div>

        <div className="form-row">
          <div className="form-group">
            <FieldInfo
              label={<label htmlFor="gen-prefixes">Prefixes (optional)</label>}
              ariaLabel="More about prefixes"
            >
              <p>
                Words or fragments that could appear <strong>before</strong> the core name (for example "get"
                in "getflow"). Separate entries with commas.
              </p>
            </FieldInfo>
            <input
              id="gen-prefixes"
              type="text"
              placeholder="e.g. get, try, my"
              value={genPrefixes}
              onChange={(e) => setGenPrefixes(e.target.value)}
              disabled={generating}
            />
          </div>
          <div className="form-group">
            <FieldInfo
              label={<label htmlFor="gen-suffixes">Suffixes (optional)</label>}
              ariaLabel="More about suffixes"
            >
              <p>
                Words or fragments that could appear <strong>after</strong> the core name (for example "ly" or
                "hq"). Separate entries with commas.
              </p>
            </FieldInfo>
            <input
              id="gen-suffixes"
              type="text"
              placeholder="e.g. app, hq, tech"
              value={genSuffixes}
              onChange={(e) => setGenSuffixes(e.target.value)}
              disabled={generating}
            />
          </div>
        </div>

        <button
          type="submit"
          className="search-btn generate-btn gen-submit-btn"
          disabled={generating || !genPrompt.trim() || genPrompt.length > MAX_PROMPT_CHARS}
        >
          {generating ? 'Cooking up names…' : 'Generate ideas'}
        </button>

      </div>
      {/* === END RIGHT COLUMN === */}

  </form>
```

**Step 4: Close the section and keep the results area unchanged**

After `</form>`, close the section and keep `genError`, `generating` loader, and `{hasResult && ...}` blocks exactly as they are now (they are siblings to the form, inside the section). They do NOT need an inner wrapper div.

```jsx
      {genError && (
        <div className="error-msg" role="alert" style={{ marginTop: '1rem' }}>
          {genError}
        </div>
      )}

      {generating && (
        <div className="loader-container">
          <div className="spinner" />
          <p className="text-muted">
            Asking Gemini for fresh angles—usually just a few seconds.
          </p>
        </div>
      )}

      {hasResult && (
        <div className="generated-results">
          ...unchanged...
        </div>
      )}
    </section>
```

**Step 5: Commit**
```bash
git add ui/src/GeneratorTab.jsx
git commit -m "refactor: restructure GeneratorTab into two-column form layout"
```

---

## Task 2 — Direct Search Tab: search-bar-row layout

**Files:**
- Modify: `ui/src/DirectSearchTab.jsx`

**Step 1: Remove the inner centering div**

Current:
```jsx
<section className="mode-section mode-section--static mode-section--wide glass">
  <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
    <h2 className="sr-only">Direct Search</h2>
    <p className="lead-muted-center">...</p>
    <form className="generator-form" onSubmit={onSearch} style={{ textAlign: 'left' }}>
      <div className="form-group">
        <label htmlFor="search-input">Domain Name</label>
        <input ... style={{ paddingRight: '2rem' }} />
      </div>
      <button ...>Search All Variants</button>
    </form>
    ...
  </div>
```

Replace with:
```jsx
<section className="mode-section mode-section--static mode-section--wide glass">
  <h2 className="sr-only">Direct Search</h2>
  <p className="lead-muted-center">
    Check availability across multiple TLDs at once.
  </p>
  <form className="search-bar-form" onSubmit={onSearch}>
    <label htmlFor="search-input" className="sr-only">Domain name</label>
    <div className="search-bar-row">
      <input
        ref={ref}
        id="search-input"
        type="text"
        className="search-input search-bar-input"
        placeholder="e.g. spacex"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={loading}
        aria-label="Domain name to search"
        required
      />
      <button type="submit" className="search-btn search-bar-btn" disabled={loading || !query.trim()}>
        {loading ? 'Searching…' : 'Search all variants'}
      </button>
    </div>
  </form>
```

Keep `error`, `showFullPageLoader`, `inline-loading-hint`, and `VerificationResultsSection` blocks unchanged — they are now direct children of the section.

**Step 2: Commit**
```bash
git add ui/src/DirectSearchTab.jsx
git commit -m "refactor: DirectSearch tab to full-width search-bar-row layout"
```

---

## Task 3 — CSS: Generator two-column grid + mic button below textarea

**Files:**
- Modify: `ui/src/index.css`

### 3a — Gen form grid layout

Add after `.generator-form` rule:

```css
/* Generator two-column grid */
.gen-form-grid {
  display: grid;
  grid-template-columns: 60fr 40fr;
  gap: 2rem;
  align-items: start;
  margin-top: 1rem;
}

.gen-form-left {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.gen-form-right {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.gen-form-right-intro {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

/* Push generate button to the bottom of the right column */
.gen-submit-btn {
  margin-top: auto;
}

@media (max-width: 768px) {
  .gen-form-grid {
    grid-template-columns: 1fr;
  }
}
```

### 3b — Mic button: remove absolute positioning

The mic button now lives in `.prompt-footer` as an inline flex child.

**Remove** the `position: absolute; top: 0.8rem; right: 0.8rem;` from `.mic-split-btn`.

Updated `.mic-split-btn`:
```css
.mic-split-btn {
  display: flex;
  align-items: stretch;
  background: var(--glass-surface);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}
```

**Update** `textarea#gen-prompt` — remove the right padding accommodation:
```css
textarea#gen-prompt {
  padding: 1.15rem 1.35rem;
  min-height: 7rem;
}
```

**Add** `.prompt-footer`:
```css
.prompt-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.35rem;
  gap: 0.5rem;
}

.prompt-footer .prompt-char-count {
  margin-top: 0;
}
```

### 3c — Focus words input: remove 300px cap

Find and update `.custom-tld-input`:
```css
.custom-tld-input {
  display: flex;
  gap: 0.5rem;
}

.custom-tld-input input {
  flex: 1;
  padding: 0.5rem 1rem;
}
```
(Remove `max-width: 300px`)

**Step: Commit**
```bash
git add ui/src/index.css
git commit -m "style: generator two-column grid, mic below textarea, focus words full width"
```

---

## Task 4 — CSS: Direct Search search-bar-row

**Files:**
- Modify: `ui/src/index.css`

Add after `.generator-form` rule (or near the search-related styles):

```css
/* Direct Search — search bar row */
.search-bar-form {
  margin-top: 1rem;
}

.search-bar-row {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}

.search-bar-input {
  flex: 1;
  font-size: 1.05rem;
  min-width: 0;
}

.search-bar-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .search-bar-row {
    flex-direction: column;
  }
  .search-bar-btn {
    width: 100%;
  }
}
```

**Step: Commit**
```bash
git add ui/src/index.css
git commit -m "style: Direct Search full-width search-bar-row with mobile stack"
```

---

## Verification

1. **Generator tab — empty state**: glass card should now be full-width (no narrow centering), form split into two columns.
2. **Generator tab — mic button**: should appear below the textarea aligned right, no text overlap.
3. **Generator tab — advanced options**: prefixes/suffixes visible directly in right column, no accordion to open.
4. **Generator tab — focus words**: input stretches to full column width.
5. **Generator tab — mobile (≤768px)**: two columns collapse to single stack (left then right).
6. **Generator tab — with results**: tree and verification grid appear below the two-column form, same as before.
7. **Direct Search — desktop**: input and button side by side, full width.
8. **Direct Search — mobile (≤640px)**: input above button, full width each.
9. **Favorites tab**: unchanged, still looks good.
