# RestoPOS - Restaurant POS SaaS Platform

## Overview
A multi-tenant restaurant Point of Sale (POS) system with subscription management. Platform admin manages restaurant accounts and billing, while restaurants use the POS for menu management, order taking, and checkout.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Passport.js with local strategy (username/password)
- **State**: TanStack Query for data fetching

## User Roles
- **Admin**: Platform owner who manages restaurants and subscriptions
- **Restaurant**: Restaurant staff who use the POS system

## Key Features
- Admin dashboard with revenue stats
- Restaurant account management with subscription plans (Basic $29.99, Standard $59.99, Premium $99.99)
- Full POS terminal with cart, order placement, and receipts
- Menu management (categories + items)
- Order tracking and history

## Project Structure
- `client/src/pages/` - All page components (admin-*, pos-*)
- `client/src/components/` - Reusable components (sidebar, theme)
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database operations (DatabaseStorage)
- `server/auth.ts` - Authentication setup
- `server/seed.ts` - Initial seed data
- `shared/schema.ts` - Drizzle models + Zod schemas

## Seed Credentials
- Admin: `admin` / `admin123`
- Restaurant (Bella Italia): `bellaitalia` / `bella123`

## Routing Architecture
- Auth state + URL coordinated in `AppContent` component (client/src/App.tsx)
- When not logged in: renders AuthPage at `/auth`, redirects all other URLs to `/auth`
- When logged in: renders MainLayout, redirects `/auth` to `/`
- MainLayout renders role-based routers (AdminRouter / RestaurantRouter) inside sidebar layout
- No nested `<Route>` wrapping — avoids wouter path stripping issues

## API Prefix
All API routes use `/api/` prefix.

## Recent Changes
- Fixed blank page / 404 after login by rewriting App.tsx routing to properly coordinate auth state with URL
- Fixed React state update warning by using `<Redirect>` component instead of `setLocation` during render in AuthPage
- Security: Registration forces admin role, all CRUD endpoints verify tenant ownership
