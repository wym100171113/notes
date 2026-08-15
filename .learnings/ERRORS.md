# Errors

Command failures and integration errors.

---

## [ERR-20260812-003] layout-audit-no-server

**Logged**: 2026-08-12T00:00:00Z
**Priority**: low
**Status**: pending
**Area**: tests

### Summary
The standalone layout audit could not connect because the preview server background process ended with the shell invocation.

### Error
```text
Error: net::ERR_CONNECTION_REFUSED at http://localhost:4175/notes/
```

### Context
- Started `vitepress preview --port 4175` in a background shell command, then invoked the audit in a separate shell call.
- The preview process was not still listening when Puppeteer ran.

### Suggested Fix
Run the preview server and audit in one controlled process lifecycle, or use the existing `npm run test:e2e` server wrapper.

### Metadata
- Reproducible: yes
- Related Files: site/scripts/layout-audit.mjs
- Tags: e2e, process-lifecycle
- Pattern-Key: test.server-not-running

---

## [ERR-20260812-002] node-search-snippet-syntax

**Logged**: 2026-08-12T00:00:00Z
**Priority**: low
**Status**: pending
**Area**: shell

### Summary
A one-off Node.js search snippet had an unmatched parenthesis and did not run.

### Error
```text
SyntaxError: Unexpected token ')'
```

### Context
- The snippet was intended to extract bounded call-site context from the minified plugin bundle.

### Suggested Fix
Keep search snippets shorter and validate the JavaScript expression before running it.

### Metadata
- Reproducible: yes
- Related Files: .obsidian/plugins/weave-epub-reader/main.js
- Tags: tooling, node
- Pattern-Key: runtime.syntax-error

---

## [ERR-20260812-001] rg-unavailable

**Logged**: 2026-08-12T00:00:00Z
**Priority**: low
**Status**: pending
**Area**: shell

### Summary
The expected `rg` executable was not available in the shell, despite repository search tooling using ripgrep internally.

### Error
```text
zsh:1: command not found: rg
```

### Context
- Attempted targeted literal/context searches in the Obsidian plugin bundle.
- Dedicated search tool output was too large because the bundle is minified into very long lines.

### Suggested Fix
Use the dedicated search tool for normal searches and a locally available command or parser for bounded extraction when minified lines exceed the tool response limit.

### Metadata
- Reproducible: yes
- Related Files: .obsidian/plugins/weave-epub-reader/main.js
- Tags: tooling, minified-bundle
- Pattern-Key: shell.command-not-found

---
