# Hakisiro

A comprehensive task management and daily planning application built with React, TypeScript, and Vite. Track tasks, manage daily activities, visualize progress through analytics, and maintain a structured task hierarchy with prerequisites and dependencies. Hakisiro means "I don't want to do it"(하기 싫어) in Korean, reflecting the app's mission to help users overcome procrastination and manage their tasks effectively.

## Features

- **Daily Task Management**: Plan and track tasks for each day with a dedicated daily HUD and task list
- **Task Pool**: Manage a centralized pool of tasks with a tree-based hierarchy
- **Prerequisites & Dependencies**: Define task dependencies and track prerequisite completion
- **Analytics**: Visualize patterns and progress through analytics views
- **Calendar View**: Navigate tasks across dates with an intuitive calendar interface
- **Daily Memo**: Record notes and reflections for each day
- **Persistent Storage**: All data stored locally using Dexie (IndexedDB wrapper)
- **Import/Export**: Backup and restore your data
- **Responsive Design**: Works seamlessly on desktop and tablet devices

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **Database**: Dexie (IndexedDB)
- **Routing**: React Router v7
- **Date Handling**: date-fns
- **Styling**: CSS with custom UI components
- **Code Quality**: ESLint + TypeScript strict mode

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd hakisiro

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev

# The app will be available at http://localhost:5173
```

### Build

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

### Linting

```bash
# Run ESLint checks
npm run lint
```

## Project Structure

```
src/
├── components/          # React components
│   ├── analytics/       # Analytics and pattern detection views
│   ├── common/          # Shared components (progress, settings)
│   ├── layout/          # Layout wrapper
│   ├── pool/            # Task pool and tree viewer
│   ├── today/           # Daily management components
│   └── ui/              # Reusable UI components (button, input, panel)
├── pages/              # Page components for routes
├── services/           # Business logic services
│   ├── TaskService
│   ├── LedgerService
│   ├── NodeService
│   └── ImportExportService
├── db/                 # Database schema and initialization
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── styles/             # Global and component styles
└── main.tsx           # Application entry point
```

## Pages & Routes

- `/today` - Today's task view with daily HUD and memo
- `/day/:date` - View tasks for a specific date
- `/pool` - Task pool with tree hierarchy
- `/calendar` - Calendar navigation view
- `/analytics` - Analytics and pattern detection

## Database Schema

The app uses Dexie with IndexedDB, storing:

- **Nodes**: Tree-based task hierarchy with parent/child relationships
- **Tasks**: Individual task items with completion status
- **TaskPrereqs**: Task prerequisites and dependencies
- **TodayItems**: Daily task selections
- **LogEntries**: Task completion history
- **DailyStats**: Daily statistics and metrics
- **DailyMemos**: Daily notes and reflections
- **Meta**: Application metadata

## Configuration

Key configuration files:

- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint rules
- `package.json` - Dependencies and scripts

## Contributing

1. Follow TypeScript strict mode guidelines
2. Use ESLint for code quality
3. Keep components focused and modular
4. Add types for all function parameters and returns
