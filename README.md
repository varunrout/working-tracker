# Flow Ops – Work + Life Tracker

A local-first MVP for an AI-assisted planner that captures natural language, auto-structures work and life commitments, schedules intelligently, and surfaces insights.

## Features

- **Capture anything**: Paste or dictate natural language commands; the built-in parser infers type, scope, timing, tags, contexts, people, and priority.
- **Inline interpretations**: Primary + alternative parses with editable metadata before committing.
- **Unified timeline**: Work and personal lanes with drag-to-reschedule interactions and instant quick actions.
- **Scheduling copilot**: Suggests start/end windows based on energy preferences, external busy blocks, and returns alternatives for conflicts.
- **Today view**: Curated Now/Next list, agenda, and AI nudges for overdue or neglected work.
- **Search & chat**: Query by natural language to filter items by scope, type, tags, and due dates.
- **Weekly review**: One-tap summary of wins, blockers, and suggestions for neglected goals/tasks.
- **Insights**: Lightweight correlations for completion vs. time of day and habit streak health.
- **Voice capture**: Uses Web Speech API (when available) for quick dictation.
- **Audit trail**: Every AI or scheduling action is recorded with metadata in the local JSON store.

## Tech stack

- **Runtime**: Node.js (ES modules only).
- **Storage**: JSON file under `data/store.json` to simulate a local-first database.
- **Server**: Custom HTTP server with REST endpoints and static asset hosting.
- **Client**: Vanilla HTML/CSS/JS with accessible layout, keyboard-friendly interactions, and high-contrast visuals.
- **Tests**: Node test runner for parser, scheduler, and an end-to-end flow (capture → schedule → search → review).

## Getting started

```bash
npm install # no external deps required
npm run dev
```

Visit http://localhost:3000 to use the tracker. Use the capture box to record new tasks, then drag them on the timeline or run scheduling from the API (`POST /api/schedule`).

## Testing

```bash
npm test
```

The suite covers parser accuracy, scheduling heuristics, and the primary capture-to-review happy path.

## Project structure

```
public/          # Front-end assets
src/shared/      # Parser, scheduler, and utilities shared between server & tests
src/server/      # HTTP server + store abstraction
tests/           # Node-based unit and E2E tests
```

## Roadmap highlights

- Integrate external calendars (Google/Outlook) via feature-flagged connectors.
- Replace heuristic parser with pluggable LLM or local model interface.
- Expand offline-first storage and add optional encrypted sync.
- Add Slack/Teams DM capture, email forwarding, and mobile-friendly PWA shell.
