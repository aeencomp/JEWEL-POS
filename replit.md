# JewelPOS - Jewelry Store POS SaaS Platform

## Overview
A multi-tenant jewelry Point of Sale (POS) system with subscription management. Platform admin manages store accounts and billing, while jewelry stores use the POS for inventory management, sales, repair orders, layaway plans, and checkout. Bilingual (English/Arabic) with full RTL support.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Passport.js with local strategy (username/password) + 2FA via email for store users
- **Email**: Resend (via Replit integration) for 2FA verification codes
- **State**: TanStack Query for data fetching
- **i18n**: Custom context-based translation system (use-language.tsx)

## User Roles
- **Admin**: Platform owner who manages stores and subscriptions
- **Store**: Jewelry store staff who use the POS system

## Key Features
- Admin dashboard with revenue stats
- Store account management with subscription plans (Basic 35,000 IQD, Standard 75,000 IQD, Premium 125,000 IQD)
- Full POS terminal with cart, customer selection, order placement, and receipts
- Inventory management (categories + items with metal type, purity, weight, gemstone, carat weight)
- Customer database with purchase history
- Repair order tracking (received, in progress, ready, delivered)
- Layaway plans with installment payments
- Order history and tracking
- Store branding customization (brand color, logo, receipt header/footer)
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
- `client/src/pages/` - All page components (admin-*, pos-*, store-*)
- `client/src/components/` - Reusable components (sidebar, theme, language-toggle)
- `client/src/hooks/` - Custom hooks (use-auth, use-language, use-toast)
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database operations (DatabaseStorage)
- `server/auth.ts` - Authentication setup
- `server/seed.ts` - Initial seed data
- `shared/schema.ts` - Drizzle models + Zod schemas

## Two-Factor Authentication (2FA)
- Store users must verify identity via email code before login completes
- 6-digit verification code sent via Resend email service
- Codes expire after 10 minutes
- Users can resend codes if needed
- Store email is set when admin creates the store (synced to user's email field)
- Admin logins are NOT subject to 2FA
- Backend: `server/resend.ts` handles email sending via Replit Resend integration
- Endpoints: `POST /api/verify-2fa`, `POST /api/resend-2fa`
- Frontend: `store-portal.tsx` shows OTP input after successful password check

## Database Tables
- `users` - Admin and store staff accounts (email field for 2FA)
- `verification_codes` - Temporary 2FA codes with expiry
- `stores` - Jewelry store entities
- `subscriptions` - Store subscription plans
- `categories` - Inventory categories (Rings, Necklaces, etc.)
- `inventory_items` - Jewelry items with metal/gemstone details, includes barcode field
- `customers` - Store customer database
- `orders` / `order_items` - Sales transactions
- `repair_orders` - Repair service tracking
- `layaway_plans` / `layaway_payments` - Layaway installment system
- `purchases` - Jewelry purchases from customers (buy jewel feature)

## Seed Credentials
- Admin: `admin` / `admin123`
- Store (Al-Noor Jewelers): `alnoor` / `alnoor123`

## Routing Architecture
- Two separate login portals:
  - `/store-portal` — Store staff login (default for unauthenticated users), amber/gold branding
  - `/auth` — Admin/platform owner login, primary branding with registration
- Auth state + URL coordinated in `AppContent` component (client/src/App.tsx)
- When not logged in: renders respective auth page, defaults to `/store-portal`
- When logged in: renders MainLayout, redirects auth pages to `/`
- MainLayout renders role-based routers (AdminRouter / StoreRouter) inside sidebar layout

## Store-side Pages
- `/` - POS Terminal (sales checkout)
- `/inventory` - Inventory management with categories and barcodes
- `/customers` - Customer database
- `/orders` - Order history
- `/repairs` - Repair order management
- `/purchases` - Buy Jewel (purchase jewelry from customers)
- `/layaway` - Layaway plan management
- `/branding` - Store branding settings (username, password, email, branding)
- `/backup` - Backup & Restore (download/upload store data)
- `/stock-audit` - Stock Audit (جرد) — inventory overview with sales/purchases summaries, date filtering, category breakdown, and per-item profit analysis

## Admin-side Pages
- `/` - Dashboard with stats
- `/restaurants` - Store management (route path kept for compatibility)
- `/subscriptions` - Subscription management

## API Prefix
All API routes use `/api/` prefix.

## Impersonation Feature
- Admin can click Eye icon on store cards to "impersonate" a store
- Session-based: stores `impersonatingStoreId` in express session
- Backend: `POST /api/admin/impersonate/:storeId` and `POST /api/admin/stop-impersonate`
- All store-side routes use `getEffectiveStoreId(req)` to check impersonation
- Frontend: amber banner shows "Viewing as: [Store Name]" with "Back to Admin" button
- Sidebar and router switch to store view during impersonation

## RTL Support (CSS Logical Properties)
- All directional CSS classes use logical properties for automatic RTL flipping:
  - `ms-` / `me-` instead of `ml-` / `mr-` (margin)
  - `ps-` / `pe-` instead of `pl-` / `pr-` (padding)
  - `start-` / `end-` instead of `left-` / `right-` (positioning)
  - `text-start` / `text-end` instead of `text-left` / `text-right`
  - `border-s` / `border-e` instead of `border-l` / `border-r`
- Applied across all pages, sidebar, sheet, dialog, dropdown-menu, select, table, and other UI components
- New code must use logical properties (never `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-` for layout)

## Recent Changes
- Added Void and Edit for orders: completed orders can be voided (cancelled with inventory restoration) or edited (change items, quantities, prices, discount). Endpoints: `PATCH /api/orders/:id` (void/status change restores inventory), `PATCH /api/orders/:id/items` (edit items with inventory recalculation)
- Added Image Upload for inventory items: "Browse" button uploads image files (JPG/PNG/GIF/WebP, max 5MB) via `POST /api/upload`, stored in `/uploads/` directory. URL input still available as fallback. Preview thumbnail shown after upload with remove button.
- Added Bulk Price Adjustment: "Adjust Prices" button on inventory page opens a dialog to increase/decrease cost/selling/both prices by percentage, with optional category filter and confirmation step. Endpoint: `PATCH /api/inventory/bulk-price`
- Added Stock Audit (جرد) page: full inventory audit with summary cards (stock/sold/purchased/profit), date range filter, category breakdown table, and detailed per-item table with profit margin. Endpoint: `GET /api/store/stock-audit?from=&to=`
- Added Backup & Restore feature: stores can download complete JSON backup of all data and restore from backup files with transactional safety and proper ID remapping
- Added store account settings: username change, password change, email change on branding page
- Fixed RTL layout: replaced all hardcoded directional CSS with logical properties across all components
- Added barcode generation for inventory items (auto-generated on creation, viewable/printable via JsBarcode CODE128)
- Added "Buy Jewel" page for purchasing jewelry from customers (metal type, purity, weight, price tracking)
- Added admin store impersonation feature (view any store's POS as admin)
- Completely rebuilt from RestoPOS to JewelPOS (jewelry store POS)
- New database schema with jewelry-specific fields (metal type, purity, weight, gemstone, carat weight)
- Added customer database, repair orders, and layaway system
- Separate store login portal at /store-portal with amber/gold branding
- Bilingual support (English/Arabic) with full jewelry-specific translations
- Currency: Iraqi Dinar (IQD) across all displays and database
