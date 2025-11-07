# FocusFlow – AI Work + Life Tracker

Next.js 14 (App Router) starter for an AI-assisted planner that captures natural language, auto-structures work and life commitments, schedules intelligently, and surfaces insights.

## Features

- **Capture anything**: Send free text to `/api/ingest`; OpenAI normalises it into Prisma models.
- **Tabbed shell**: Today, Timeline, Inbox, Goals, Habits, and Search tabs with a responsive pill-navigation layout.
- **Quick add**: Client-side capture box wired to the ingest pipeline.
- **Inbox actions**: Activate/complete items directly from the Inbox tab.
- **Weekly review**: API route to generate summaries using the OpenAI API.

## Tech stack

- **Runtime**: Next.js 14 + React 18 + TypeScript.
- **Styling**: Tailwind CSS with a soft glassmorphic layout.
- **State**: Local client state using hooks (Zustand ready to wire in).
- **Database**: Prisma ORM with PostgreSQL (or SQLite for local dev).
- **AI**: OpenAI SDK for parsing capture input and generating reviews.

## Getting started

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Set environment variables in `.env`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
DB_PROVIDER=sqlite # or postgresql
DATABASE_URL="file:./dev.db" # adjust for your provider
```

Visit http://localhost:3000 to use the tracker. Use the Quick Add input to capture entries and review them in the Inbox tab.

## Testing

```bash
npm run lint
```

Add additional unit/integration tests as features expand.

## Project structure

```
app/              # Next.js app router pages and API routes
prisma/           # Prisma schema
public/           # Static assets (manifest, icons)
src/lib/          # OpenAI client and helpers
src/server/       # Prisma client helpers
src/ui/           # UI components (tabs, quick add)
```

## Roadmap highlights

- Integrate drag-and-drop timeline scheduling via react-big-calendar or FullCalendar.
- Extend shadcn/ui components for dialogs, date pickers, and command palette.
- Add voice capture using the Web Speech API and route through the ingest API.
- Implement PWA service worker for offline-first experience.
