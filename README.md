# AbleSpace Assessment

Task management workspace built for the AbleSpace full-stack assessment.

## Overview

This workspace contains:

- this folder - Next.js frontend (App Router, Tailwind CSS)
- the sibling `api/` project - NestJS backend with Prisma and validation

The implementation focuses on Figma-aligned UI, guest login, theme persistence, responsive layouts, reusable components, and clean API structure.

## Features

- Guest login with persisted session cookie
- Theme switching with persisted color mode
- Responsive task board, list, projects, and profile views
- Reusable UI primitives and shared modal/form components
- NestJS API with DTO validation and guarded task routes
- Prisma-backed persistence with seed data for guest sessions

## Tech Stack

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS
- Backend: NestJS, Prisma, TypeScript
- Data layer: Prisma with a relational database

## Project Structure

```text
./
  src/
    app/           # Next.js App Router entry points
    components/    # Feature and reusable UI components
    lib/           # API client, types, and utilities
```

## Getting Started

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd ../api
npm install
npm run start:dev
```

## Environment Variables

Frontend:

Local:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Production:

```bash
NEXT_PUBLIC_API_URL=https://able-space-api.onrender.com/api
```

Backend:

```bash
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
DATABASE_URL=your-database-connection-string
```

## Validation and API Notes

- Global `ValidationPipe` is enabled in NestJS.
- DTOs use `class-validator` decorators for request validation.
- Auth is cookie-based for guest sessions.
- Task routes are protected by a token guard.

## Theme and Responsiveness

- Theme state is managed through `next-themes` and persists across refreshes.
- Layouts adapt for desktop, tablet, and mobile.
- Desktop and mobile interactions are handled separately where needed.

## Intentional Deviations

Document any Figma deviations here before final submission.

## Part 2 Submission

Add the required Part 2 document or video walkthrough to the repository or submission bundle before final delivery.

## Notes

- This project was built to be explainable in an interview.
- Keep the deployed URL public and accessible for at least 45 days after submission.
