# RestoPOS - Restaurant POS SaaS Platform

## Overview
A multi-tenant restaurant Point of Sale (POS) system with subscription management. Platform admin manages restaurant accounts and billing, while restaurants use the POS for menu management, order taking, and checkout. Bilingual (English/Arabic) with full RTL support.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Passport.js with local strategy (username/password)
- **State**: TanStack Query for data fetching
- **i18n**: Custom context-based translation system (use-language.tsx)

## User Roles
- **Admin**: Platform owner who manages restaurants and subscriptions
- **Restaurant**: Restaurant staff who use the POS system

## Key Features
- Admin dashboard with revenue stats
- Restaurant account management with subscription plans (Basic 35,000 IQD, Standard 75,000 IQD, Premium 125,000 IQD)
- Full POS terminal with cart, order placement, and receipts
- Menu management (categories + items)
- Order tracking and history
- Bilingual support (English/Arabic) with RTL layout switching
- Currency: Iraqi Dinar (IQD) - stored as whole numbers

## Internationalization (i18n)
- `client/src/hooks/use-language.tsx` - Language context provider with all translations
- `client/src/components/language-toggle.tsx` - Toggle button component
- Language preference saved in localStorage
- RTL direction set on `<html>` element via `document.documentElement.dir`
- Uses CSS logical properties (start/end instead of left/right) for RTL compatibility
- All page components use `t("key")` function for translated strings

## Project Structure
- `client/src/pages/` - All page components (admin-*, pos-*)
- `client/src/components/` - Reusable components (sidebar, theme, language-toggle)
- `client/src/hooks/` - Custom hooks (use-auth, use-language, use-toast)
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
- Added bilingual support (English/Arabic) with RTL layout, language toggle in header and auth page
- Converted currency from USD to IQD (Iraqi Dinar) across all displays, seed data, and database
- Fixed blank page / 404 after login by rewriting App.tsx routing
- Security: Registration forces admin role, all CRUD endpoints verify tenant ownership
