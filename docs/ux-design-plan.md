# UX Design Plan -- SaaS Multi-Tenant E-Commerce Platform

## 1. Architecture Decision: Two-App Strategy

### Rationale

The platform has three distinct user audiences with near-zero UI overlap:

| Audience | Needs | Auth Scope | SEO Priority |
|---|---|---|---|
| **Customers** (Shoppers) | Browse, search, cart, checkout, account | Customer JWT | Critical -- products/categories must index |
| **Merchants** (Store Owners + Staff) | Manage products, orders, analytics, store settings | Merchant JWT with role permissions | None -- private dashboard |
| **Super Admins** (Platform Operators) | Manage merchants, plans, platform-wide ops | SuperAdmin JWT | None -- private dashboard |

Merchant Dashboard and Super Admin share some layout patterns (sidebar nav, data tables, forms) but operate on entirely different data domains. Customers need a fundamentally different layout (top nav, product grids, checkout flow) that must be SEO-friendly and themeable per-store.

**Decision: Three apps in the monorepo.**

```
apps/
  backend/        # Existing Fastify API
  storefront/     # Next.js 15 -- Customer-facing (SEO, SSR, multi-tenant theming)
  dashboard/      # Next.js 15 -- Merchant + Super Admin (SPA-like, role-based routing)
packages/
  shared-types/   # Existing
  shared-utils/   # Existing
  ui/             # NEW -- Shared component library (design system)
```

The `dashboard` app serves both Merchant and Super Admin under role-based routing (`/admin/*` for Super Admin, `/dashboard/*` for Merchant). They share the same shell but route to different page trees based on the `role` claim in the JWT.

The `ui` package holds the design system (tokens, primitives, patterns) consumed by both apps. This prevents duplicating Button, DataTable, FormField, etc.

---

## 2. Pages / Screens Inventory

### 2.1 Storefront (Customer-Facing) -- apps/storefront

Every storefront page is rendered within the store's theme (colors, fonts, border radius, logo) fetched from `GET /api/store/:domain` on initial load. Theme tokens are injected as CSS custom properties at the `<html>` level.

#### Public (No Auth Required)

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| S1 | Home | `/` | Hero banner, featured products, categories | `GET /public/store`, `GET /public/products` |
| S2 | Product Listing (Category) | `/products` or `/categories/:slug` | Filtered/searchable product grid | `GET /public/products/search` |
| S3 | Product Detail | `/products/:slug` | Images, variants, modifiers, reviews, related | `GET /public/products/:id`, `GET /public/reviews` |
| S4 | Store Info | `/about` | Store branding, social links, contact | `GET /public/store` |
| S5 | Cart (Session) | `/cart` | View/update cart for guest users | `GET /public/cart`, `PATCH /public/cart/items/:itemId` |

#### Customer Auth (Login Required)

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| S6 | Login | `/login` | Email + password, link to register/forgot | `POST /auth/customer/login` |
| S7 | Register | `/register` | Create customer account | `POST /auth/customer/register` |
| S8 | Verify Email | `/verify-email?token=` | Confirm email ownership | `POST /auth/customer/verify-email` |
| S9 | Forgot Password | `/forgot-password` | Request password reset email | `POST /auth/customer/forgot-password` |
| S10 | Reset Password | `/reset-password?token=` | Set new password | `POST /auth/customer/reset-password` |

#### Customer Account (Auth Required)

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| S11 | Account Dashboard | `/account` | Order summary, profile quick links | `GET /customer/orders` (recent) |
| S12 | Order History | `/account/orders` | Paginated order list with status filters | `GET /customer/orders` |
| S13 | Order Detail | `/account/orders/:id` | Line items, status timeline, totals | `GET /customer/orders/:id` |
| S14 | Profile | `/account/profile` | Name, phone, email, avatar | `GET/PATCH /customer/profile` |
| S15 | Addresses | `/account/addresses` | CRUD shipping addresses | `GET/POST/PATCH/DELETE /customer/addresses` |
| S16 | Wishlist | `/account/wishlist` | Saved products grid | `GET /customer/wishlist` |
| S17 | Reviews | `/account/reviews` | Manage customer's own reviews | `GET /customer/reviews` |

#### Checkout Flow (Auth Optional)

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| S18 | Checkout -- Shipping | `/checkout/shipping` | Address entry or select saved, shipping rate selection | `GET /customer/addresses`, `POST /public/shipping/calculate` |
| S19 | Checkout -- Payment | `/checkout/payment` | Payment method, coupon code, order summary | `POST /public/tax/calculate`, `POST /public/coupons/validate` |
| S20 | Checkout -- Confirm | `/checkout/confirm` | Final review, place order | `POST /checkout` |
| S21 | Order Confirmation | `/order-confirmed/:id` | Success page with order details | `GET /customer/orders/:id` |

**Total Storefront Pages: 21**

---

### 2.2 Merchant Dashboard -- apps/dashboard

The dashboard uses a persistent sidebar + topbar shell. Navigation items are conditionally rendered based on the staff member's role and permissions (OWNER sees everything; MANAGER sees most; CASHIER sees limited set).

#### Auth

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| D1 | Login | `/login` | Merchant email + password | `POST /auth/merchant/login` |
| D2 | Forgot Password | `/forgot-password` | Request reset | `POST /auth/merchant/forgot-password` |
| D3 | Reset Password | `/reset-password?token=` | Set new password | `POST /auth/merchant/reset-password` |
| D4 | Accept Invite | `/invite/:token` | Staff member sets password | `POST /staff/accept-invite` |

#### Home / Analytics

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| D5 | Dashboard Home | `/dashboard` | Revenue chart, recent orders, key stats | `GET /merchant/analytics/dashboard`, `GET /merchant/analytics/revenue` |

#### Products

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| D6 | Products List | `/dashboard/products` | Searchable/filterable product table | `GET /merchant/products/search` |
| D7 | Product Create | `/dashboard/products/new` | Multi-step product form | `POST /merchant/products`, `POST /upload` |
| D8 | Product Edit | `/dashboard/products/:id` | Edit product, variants, modifiers, images | `PATCH /merchant/products/:id`, variant/modifier CRUD |
| D9 | Categories | `/dashboard/categories` | Category + subcategory management | `GET/POST/PATCH/DELETE /merchant/categories` |

#### Orders

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| D10 | Orders List | `/dashboard/orders` | Filter by status, search, date range | `GET /merchant/orders` |
| D11 | Order Detail | `/dashboard/orders/:id` | Line items, status update, customer info | `GET /merchant/orders/:id`, `PATCH /merchant/orders/:id/status` |

#### Customers

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| D12 | Customers List | `/dashboard/customers` | Search, view customer list | `GET /merchant/customers` |
| D13 | Customer Detail | `/dashboard/customers/:id` | Orders, profile, addresses | `GET /merchant/customers/:id` |

#### Store Settings

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| D14 | Store General | `/dashboard/settings/general` | Name, domain, currency, language | `GET/PATCH /merchant/store` |
| D15 | Store Branding | `/dashboard/settings/branding` | Colors, fonts, logo, favicon, hero | `PATCH /merchant/store` (theme fields), `POST /upload` |
| D16 | Shipping Settings | `/dashboard/settings/shipping` | Zones, rates, methods | Shipping zone + rate CRUD |
| D17 | Tax Settings | `/dashboard/settings/tax` | Tax rates CRUD | Tax rate CRUD |
| D18 | Staff Management | `/dashboard/settings/staff` | Invite, role assignment | `GET/POST/PATCH/DELETE /merchant/staff` |

#### Marketing

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| D19 | Coupons | `/dashboard/coupons` | Coupon list, create, edit | Coupon CRUD, `POST /merchant/coupons/validate` |
| D20 | Reviews | `/dashboard/reviews` | Review moderation, respond, approve | `GET /merchant/reviews`, respond/approve endpoints |

#### Modifiers

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| D21 | Modifier Groups | `/dashboard/modifiers` | Product/category modifier management | Modifier group + option CRUD |

**Total Merchant Dashboard Pages: 21**

---

### 2.3 Super Admin -- apps/dashboard (same app, different route tree)

Super Admin pages share the same shell component but have a different sidebar nav and access different API endpoints scoped to `/api/super-admin/*`.

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| A1 | Login | `/admin/login` | Super admin login (separate from merchant) | `POST /auth/super-admin/login` |
| A2 | Dashboard | `/admin` | Platform-wide stats, merchant health | `GET /super-admin/dashboard` (if exists) |
| A3 | Merchants List | `/admin/merchants` | Paginated list with status filters | `GET /super-admin/merchants` |
| A4 | Merchant Detail | `/admin/merchants/:id` | Approve/suspend/reactivate, view stores | `GET/PATCH /super-admin/merchants/:id` |
| A5 | Plans | `/admin/plans` | Subscription plan CRUD | Plan CRUD |
| A6 | Stores | `/admin/stores` | Store management across merchants | `GET /super-admin/stores` |

**Total Super Admin Pages: 6**

**GRAND TOTAL: 48 pages across all three audiences.**

---

## 3. User Flows

### 3.1 Customer Checkout Flow

```
[Product Page] --> [Add to Cart]
                      |
                      v
              [Cart Page] --> [Guest?] --Yes--> [Checkout as Guest or Login/Register]
                      |                                    |
                      No                                  v
                      |                           [Auth Step]
                      v                                |
              [Checkout: Shipping] <-------------------+
                      |
                      v
              [Select Saved Address OR Enter New]
                      |
                      v
              [Checkout: Shipping Rate Selection]
                      |
                      v
              [Checkout: Payment]
                      |--> Apply Coupon Code
                      |--> Tax Calculation
                      |
                      v
              [Checkout: Review & Confirm]
                      |
                      v
              [Order Placed] --> [Order Confirmation Page]
```

Key UX decisions:
- Cart is session-based for guests (cookie/session header), merges on login
- Checkout is a 3-step wizard, not a single long page (reduces abandonment on mobile)
- Coupon code applied at Payment step with instant feedback via `POST /public/coupons/validate`
- Shipping and tax calculated dynamically when address/rate changes

### 3.2 Merchant Product Management Flow

```
[Products List] --> [Create Product]
                        |
                        v
                [Step 1: Basic Info] (title, description, category, pricing, images)
                        |
                        v
                [Step 2: Variants] (add variant groups + options with price adjustments)
                        |
                        v
                [Step 3: Modifiers] (add modifier groups: size, addons, etc.)
                        |
                        v
                [Step 4: Publish Settings] (sort order, tags, published/draft toggle)
                        |
                        v
                [Save] --> [Redirect to Product List OR Edit Page]
```

### 3.3 Merchant Order Management Flow

```
[Orders List] --> Filter by status (pending/processing/shipped/delivered/cancelled)
                        |
                        v
                [Order Detail] --> View line items, customer info, totals
                        |
                        |--> [Update Status] (pending -> processing -> shipped -> delivered)
                        |--> [Cancel Order]
```

### 3.4 Staff Invite & Accept Flow

```
[Owner: Staff Page] --> [Invite Staff]
                            |
                            v
                    [Enter Email + Select Role (Manager/Cashier)]
                            |
                            v
                    [Email Sent with Invite Token]
                            |
                            v
                    [Staff: Clicks Invite Link] --> [/invite/:token]
                            |
                            v
                    [Set Password + Optional Name] --> [Logged In]
                            |
                            v
                    [Dashboard with Role-Based Nav]
```

### 3.5 Super Admin Merchant Approval Flow

```
[Merchants List] --> Filter by status (pending/active/suspended)
                        |
                        v
                [Merchant Detail] --> [Approve] or [Suspend]
                        |
                        v
                [Merchant receives email notification]
```

### 3.6 Store Branding Theming Flow

```
[Settings > Branding] --> [Color Pickers] (primary, secondary, accent, bg, surface, text, border)
                        |--> [Font Selector] (from curated web-safe list)
                        |--> [Border Radius Slider]
                        |--> [Logo Upload] (via /upload endpoint)
                        |--> [Favicon Upload]
                        |--> [Hero Section Config] (image, title, subtitle, CTA, enabled toggle)
                        |
                        v
                [Live Preview Panel] (shows storefront homepage with applied theme)
                        |
                        v
                [Save] --> Theme applied via merchantUpdateStoreSchema
                        |
                        v
                [Storefront CSS variables updated on next page load]
```

---

## 4. Component Hierarchy

### 4.1 Design System -- packages/ui

These are primitive and composite components shared across both apps. They accept theme tokens via CSS custom properties and are fully styled by Tailwind CSS utility classes.

```
packages/ui/
  src/
    tokens/                    # Design tokens as CSS custom properties
      colors.ts
      typography.ts
      spacing.ts
      shadows.ts
      index.ts
    primitives/               # Atomic components (no business logic)
      Button/
      Input/
      Select/
      Checkbox/
      Radio/
      Toggle/
      Badge/
      Avatar/
      Spinner/
      Tooltip/
      Dialog/
      Drawer/
      DropdownMenu/
      Tabs/
      Alert/
      Toast/
      ProgressBar/
      Skeleton/
    composites/                # Composed from primitives (no business logic)
      DataTable/               # Sorting, pagination, filtering
      FormField/                # Label + input + error message
      SearchInput/              # Input with debounce + clear icon
      Card/                     # Image + title + description + actions
      PriceDisplay/             # Handles decimal formatting per currency
      ImageGallery/             # Thumbnail strip + main image
      Stepper/                  # Multi-step wizard progress indicator
      StatusBadge/              # Color-coded status pill
      Breadcrumb/
      Pagination/
      EmptyState/
      ConfirmDialog/
      ColorPicker/
      FontPicker/
    patterns/                  # Reusable layout patterns
      AppShell/                 # Sidebar + topbar + main content area
      PageHeader/               # Title + description + actions
      ResourceList/             # Search + filter + table + pagination
      FormWizard/               # Multi-step form with validation
```

### 4.2 Storefront-Specific Components -- apps/storefront

```
apps/storefront/src/components/
  layout/
    StoreHeader/                # Logo, search, cart icon, auth links
    StoreFooter/                # Links, social, copyright
    StoreNav/                   # Category navigation
  product/
    ProductCard/                # Image, title, price, add-to-cart
    ProductGrid/                # Responsive grid of ProductCards
    ProductFilters/             # Category, price range, sort
    VariantSelector/            # Color/size picker with price adjustment
    ModifierSelector/           # Addon/modifier groups (required/optional)
    ProductReviews/             # Review list + rating summary
    ReviewForm/                 # Star rating + text + image upload
  cart/
    CartDrawer/                 # Slide-in mini cart
    CartItemRow/                # Product image, title, qty, price
    CartSummary/                # Subtotal, shipping estimate, checkout CTA
  checkout/
    AddressForm/                # Shipping/billing address fields
    ShippingRateSelector/       # Radio group of available rates
    CouponCodeInput/            # Input + apply button + discount display
    OrderSummarySidebar/        # Sticky sidebar with line items + totals
    CheckoutStepper/            # Step indicator (Shipping -> Payment -> Confirm)
  account/
    OrderCard/                  # Compact order summary for list
    OrderTimeline/              # Status progression visual
    AddressCard/                # Saved address with edit/delete
    AddressBook/                # List of AddressCards
    WishlistGrid/               # Grid of wishlisted ProductCards
  theme/
    ThemeProvider/               # Wraps app, injects store theme CSS vars
    HeroSection/                # Configurable hero banner from store settings
```

### 4.3 Dashboard-Specific Components -- apps/dashboard

```
apps/dashboard/src/components/
  layout/
    DashboardSidebar/           # Nav items filtered by role/permissions
    DashboardTopbar/            # Breadcrumbs, notifications, user menu
    DashboardContent/           # Main content area with padding
  products/
    ProductForm/                # Multi-step product create/edit
    VariantManager/             # Add/edit/remove variants + options
    ModifierManager/            # Add/edit/remove modifier groups + options
    CategoryTree/               # Nested category/subcategory list
  orders/
    OrderTable/                 # Status-filterable order list
    OrderDetailPanel/           # Line items, customer, status timeline
    StatusUpdateDropdown/       # Change order status
  analytics/
    RevenueChart/               # Time-series revenue visualization
    StatsCard/                  # Single KPI metric card
    DashboardGrid/              # Layout for multiple StatsCards
  settings/
    BrandingEditor/             # Color pickers, font selector, radius slider
    ThemePreview/               # Live preview of storefront with current theme
    ShippingZoneForm/           # Zone + rate management form
    TaxRateForm/                # Tax rate CRUD form
    StaffTable/                 # Staff list with role badges
    InviteStaffDialog/          # Email + role selection
  coupons/
    CouponForm/                 # Create/edit coupon with all fields
    CouponTable/                # List with status, usage, actions
  reviews/
    ReviewTable/                # Reviews with approve/respond actions
    ReviewRespondDialog/        # Merchant response textarea
  super-admin/
    MerchantTable/              # Merchants with status actions
    MerchantDetailPanel/        # Store info, approval/suspend actions
    PlanForm/                   # Subscription plan CRUD
    PlanTable/                  # Plans list
```

---

## 5. Design Tokens

### 5.1 Multi-Tenant Theming Strategy

Each store defines its own theme via the `merchantUpdateStoreSchema` fields:
- `primaryColor`, `secondaryColor`, `accentColor` -- Brand colors
- `backgroundColor`, `surfaceColor` -- Background tones
- `textColor`, `textSecondaryColor` -- Text hierarchy
- `borderColor` -- Borders and dividers
- `borderRadius` -- Corner radius scale
- `fontFamily` -- Primary typeface
- `logoUrl`, `faviconUrl` -- Brand imagery
- `heroImage`, `heroTitle`, `heroSubtitle`, `heroCtaText`, `heroCtaLink`, `heroEnabled` -- Homepage hero

These map directly to CSS custom properties injected at the `<html>` element level:

```css
:root {
  /* Store Theme (overridden per-store from API) */
  --color-primary: #0ea5e9;
  --color-secondary: #8b5cf6;
  --color-accent: #f59e0b;
  --color-bg: #ffffff;
  --color-surface: #f8fafc;
  --color-text: #0f172a;
  --color-text-secondary: #64748b;
  --color-border: rgba(0, 0, 0, 0.1);
  --radius-base: 8px;
  --font-family: 'Inter', system-ui, sans-serif;

  /* System Tokens (never overridden by store theme) */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

### 5.2 Color System

#### Store-Themable Colors (via CSS Custom Properties)

| Token | CSS Variable | Default | Purpose |
|---|---|---|---|
| Primary | `--color-primary` | `#0ea5e9` (sky-500) | CTAs, links, active states |
| Secondary | `--color-secondary` | `#8b5cf6` (violet-500) | Secondary actions, accents |
| Accent | `--color-accent` | `#f59e0b` (amber-500) | Highlights, badges, sale tags |
| Background | `--color-bg` | `#ffffff` | Page background |
| Surface | `--color-surface` | `#f8fafc` (slate-50) | Cards, panels, modals |
| Text | `--color-text` | `#0f172a` (slate-900) | Primary text |
| Text Secondary | `--color-text-secondary` | `#64748b` (slate-500) | Captions, metadata |
| Border | `--color-border` | `rgba(0,0,0,0.1)` | Dividers, input borders |

#### System Colors (Fixed, Never Themable)

| Token | Value | Purpose |
|---|---|---|
| Success | `#22c55e` (green-500) | Confirmation, completed states |
| Warning | `#f59e0b` (amber-500) | Caution, pending states |
| Error | `#ef4444` (red-500) | Validation errors, destructive actions |
| Info | `#3b82f6` (blue-500) | Informational, tooltips |

#### Dashboard Color Palette (Dark Sidebar)

| Token | Value | Purpose |
|---|---|---|
| Sidebar BG | `#0f172a` (slate-900) | Dashboard sidebar background |
| Sidebar Text | `#e2e8f0` (slate-200) | Sidebar navigation text |
| Sidebar Active | `--color-primary` | Active nav item indicator |
| Page BG | `#f8fafc` (slate-50) | Dashboard content background |

### 5.3 Typography

| Scale | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `--text-xs` | 12px | 400 | 16px | Captions, badges |
| `--text-sm` | 14px | 400 | 20px | Body secondary, table cells |
| `--text-base` | 16px | 400 | 24px | Body primary |
| `--text-lg` | 18px | 500 | 28px | Section headings |
| `--text-xl` | 20px | 600 | 28px | Card titles |
| `--text-2xl` | 24px | 600 | 32px | Page headings |
| `--text-3xl` | 30px | 700 | 36px | Hero headings |
| `--text-4xl` | 36px | 700 | 40px | Display (storefront hero) |

Font family default: `Inter, system-ui, -apple-system, sans-serif`
Store-themable via `--font-family` CSS variable.

### 5.4 Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Inline gaps, icon padding |
| `--space-2` | 8px | Compact gaps, list items |
| `--space-3` | 12px | Default gap, form spacing |
| `--space-4` | 16px | Component padding |
| `--space-5` | 20px | Section padding (mobile) |
| `--space-6` | 24px | Card padding |
| `--space-8` | 32px | Section padding (desktop) |
| `--space-10` | 40px | Page section gaps |
| `--space-12` | 48px | Major section dividers |
| `--space-16` | 64px | Hero vertical padding |

### 5.5 Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift (cards on hover) |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Cards, dropdowns |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Modals, popovers |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` | Elevated drawers |

### 5.6 Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Buttons, inputs |
| `--radius-md` | `var(--radius-base)` (default 8px) | Cards, modals (store-themable) |
| `--radius-lg` | `12px` | Panels, image containers |
| `--radius-full` | `9999px` | Avatars, pills |

### 5.7 Breakpoints (Mobile-First)

| Name | Min Width | Target Devices | Layout Behavior |
|---|---|---|---|
| `sm` | 640px | Large phones (landscape) | 2-column product grids |
| `md` | 768px | Tablets | Sidebar collapsible, 3-column grids |
| `lg` | 1024px | Small laptops | Full dashboard sidebar, 4-column grids |
| `xl` | 1280px | Desktops | Max-width container, comfortable margins |
| `2xl` | 1536px | Large monitors | Extra breathing room |

Mobile-first principle: Base styles target phones (<640px). Use `min-width` media queries to progressively enhance for larger screens.

### 5.8 Z-Index Scale

| Token | Value | Usage |
|---|---|---|
| `--z-dropdown` | 10 | Dropdowns, selects |
| `--z-sticky` | 20 | Sticky headers |
| `--z-overlay` | 30 | Modal backdrops |
| `--z-modal` | 40 | Modal content |
| `--z-toast` | 50 | Toast notifications |
| `--z-tooltip` | 60 | Tooltips |

---

## 6. Responsive Layout Patterns

### 6.1 Storefront Layouts

**Mobile (<640px) -- Default:**
- Single-column product grid (1 card per row)
- Hamburger menu for navigation
- Cart as full-page (not drawer)
- Checkout: stacked steps (no sidebar summary)
- Bottom sticky add-to-cart bar on product pages

**Tablet (640-1024px):**
- 2-3 column product grid
- Slide-out cart drawer
- Checkout: sidebar summary visible below form
- Category nav as horizontal scroll

**Desktop (>1024px):**
- 4-column product grid
- Persistent category sidebar or mega-menu
- Cart drawer from right
- Checkout: 2-column layout (form left, summary right sticky)

### 6.2 Dashboard Layouts

**Mobile (<768px) -- Default:**
- Sidebar collapses to bottom tab bar (key icons only: Home, Products, Orders)
- Full-width data tables become card lists
- Forms stack vertically
- Topbar simplified to logo + user avatar

**Tablet (768-1280px):**
- Sidebar collapses to icon-only (expandable on tap)
- Data tables show 5-6 columns
- Forms in centered 600px container

**Desktop (>1280px):**
- Full sidebar (240px) with labels
- Data tables show 8+ columns with actions
- Forms in centered 720px container
- Side panels for detail views (order detail, customer detail)

---

## 7. Tech Stack Recommendation

### 7.1 Frontend Framework: Next.js 15 (App Router)

**Why Next.js:**
- SEO-critical for storefront (products, categories must index)
- App Router with React Server Components for optimal performance
- Built-in image optimization, font optimization, metadata API
- SSR for store theme injection (no flash of unstyled content)
- API routes can proxy to backend if needed (BFF pattern)
- Monorepo-friendly with Turborepo

**Why two separate Next.js apps instead of one:**
- Completely different layout shells (top nav vs sidebar)
- Different caching strategies (storefront needs ISR/revalidation; dashboard needs real-time)
- Different auth scopes (customer JWT vs merchant JWT)
- Storefront needs per-store theme injection at the edge; dashboard does not
- Simpler deployment: storefront can go to CDN/edge, dashboard stays on a single region

### 7.2 Component Library: packages/ui (Custom)

Build a custom design system using:
- **Radix UI** -- Accessible primitives (Dialog, Dropdown, Tabs, etc.)
- **Tailwind CSS v4** -- Utility-first styling with CSS custom properties for theming
- **Tailwind Merge** -- Conflict resolution for composed classes
- **Class Variance Authority (CVA)** -- Variant-based component APIs

Why not shadcn/ui directly: We need multi-tenant theming through CSS custom properties. shadcn/ui's approach of copying components into the project works, but we should customize the token layer to support dynamic store themes. We can use shadcn/ui as a starting reference and adapt for our theming model.

### 7.3 State Management

| Concern | Tool | Rationale |
|---|---|---|
| Server state (API data) | **TanStack Query v5** | Caching, background refetch, optimistic updates, pagination |
| Client-only state (cart UI, form state) | **Zustand** | Lightweight, no boilerplate, works in RSC boundaries via client components |
| Form state | **React Hook Form + Zod** | Matches backend validation schemas; can share Zod schemas from shared-types |
| URL state (filters, pagination) | **nuqs** | Type-safe URL search params that sync with Next.js App Router |

### 7.4 Data Fetching Pattern

```
[Next.js Server Component]
        |
        v
[TanStack Query prefetch via server] --> Initial data hydration
        |
        v
[Client Component] --> TanStack Query mutations + refetch on action
        |
        v
[Backend API] --> Fastify routes
```

- Server Components prefetch data for SEO-critical pages (product listings, product detail, home)
- Client Components handle mutations (add to cart, submit order, update settings)
- Use `shared-types` package for shared Zod schemas and TypeScript types

### 7.5 Authentication Flow

```
Storefront:
  Login POST --> Backend returns httpOnly cookie (JWT)
  Next.js middleware checks cookie presence
  Server Components pass auth to API calls

Dashboard:
  Login POST --> Backend returns httpOnly cookie (JWT)
  Role claim in JWT determines sidebar nav + route access
  Middleware redirects unauthorized routes
```

### 7.6 Internationalization (i18n)

The backend supports bilingual fields (`nameEn`, `nameAr`, `titleEn`, `titleAr`). The storefront should support:
- **next-intl** for message catalogs
- Store `language` field from store settings determines default locale
- URL pattern: `/:locale/products` or `/:domain/:locale/products`
- RTL layout support for Arabic (CSS `dir="rtl"`)

### 7.7 Full Dependency List

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "@tanstack/react-query": "^5",
    "zustand": "^5",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^3",
    "zod": "^3",
    "nuqs": "^2",
    "next-intl": "^3",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-dropdown-menu": "latest",
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-tooltip": "latest",
    "@radix-ui/react-toast": "latest",
    "@radix-ui/react-toggle": "latest",
    "@radix-ui/react-checkbox": "latest",
    "@radix-ui/react-radio-group": "latest",
    "@radix-ui/react-select": "latest",
    "class-variance-authority": "latest",
    "tailwind-merge": "latest",
    "clsx": "latest",
    "lucide-react": "latest",
    "recharts": "^2",
    "date-fns": "^4"
  },
  "devDependencies": {
    "typescript": "^5",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "latest",
    "@testing-library/react": "latest",
    "vitest": "latest",
    "playwright": "latest"
  }
}
```

---

## 8. Phase Breakdown

### Phase F1: Foundation (Weeks 1-2)

**Goal:** Monorepo setup, design system skeleton, auth flows, store theming.

| Task | Details | Est. |
|---|---|---|
| F1.1 | Scaffold `apps/storefront` and `apps/dashboard` with Next.js 15 + App Router | 2d |
| F1.2 | Create `packages/ui` with design tokens, Tailwind config, base primitives (Button, Input, Card, Badge, Spinner, Toast) | 3d |
| F1.3 | Build ThemeProvider that fetches store settings and injects CSS variables | 1d |
| F1.4 | Implement auth flows for all 3 audiences (login, register, verify, forgot/reset password) | 3d |
| F1.5 | Set up TanStack Query client with auth cookie handling, error interceptors | 1d |
| F1.6 | Build AppShell layouts (storefront: top nav + footer; dashboard: sidebar + topbar) | 2d |

**Verification Gate:** User can log in as customer, merchant, and super admin. Store theme renders with correct colors/fonts.

### Phase F2: Storefront Core (Weeks 3-5)

**Goal:** Complete shopping experience -- browse, search, cart, checkout.

| Task | Details | Est. |
|---|---|---|
| F2.1 | Home page: hero section (store-themable), featured products, category nav | 2d |
| F2.2 | Product listing page: search, filters (category, price range, sort), grid | 3d |
| F2.3 | Product detail page: images, variants, modifiers, reviews, related products | 4d |
| F2.4 | Cart: session-based for guests, merge on login, add/update/remove | 3d |
| F2.5 | Checkout wizard: shipping address, rate selection, coupon, tax, order summary | 4d |
| F2.6 | Order confirmation page | 1d |

**Verification Gate:** Guest can browse, search, add to cart, check out, and see order confirmation. SEO metadata renders for products.

### Phase F3: Customer Account (Weeks 5-6)

**Goal:** Self-service account management.

| Task | Details | Est. |
|---|---|---|
| F3.1 | Account dashboard (recent orders, profile summary) | 1d |
| F3.2 | Order history (list + detail with status timeline) | 2d |
| F3.3 | Profile management (name, phone, email, avatar) | 1d |
| F3.4 | Address book (CRUD, set default) | 2d |
| F3.5 | Wishlist | 1d |
| F3.6 | Review management (create, edit own reviews) | 2d |

**Verification Gate:** Customer can view orders, manage addresses, add/remove wishlist items, and write/edit reviews.

### Phase F4: Merchant Dashboard -- Core (Weeks 7-10)

**Goal:** Essential merchant operations -- products, orders, store settings.

| Task | Details | Est. |
|---|---|---|
| F4.1 | Dashboard home: stats cards + revenue chart | 2d |
| F4.2 | Products: list with search/filter, create (multi-step), edit, publish/draft toggle | 4d |
| F4.3 | Product variants: add/edit/remove variants and options (with price adjustments, SKU, stock) | 3d |
| F4.4 | Product modifiers: add/edit/remove modifier groups and options | 2d |
| F4.5 | Categories: CRUD with subcategories (tree view) | 2d |
| F4.6 | Image upload integration (via /upload endpoint) | 1d |
| F4.7 | Orders: list with status filters, detail view, status update | 3d |
| F4.8 | Store settings: general (name, domain, currency), branding (colors, fonts, logo, hero) | 3d |

**Verification Gate:** Merchant can create products with variants/modifiers, manage categories, view and update orders, and customize store branding with live preview.

### Phase F5: Merchant Dashboard -- Extended (Weeks 11-13)

**Goal:** Full merchant feature set.

| Task | Details | Est. |
|---|---|---|
| F5.1 | Shipping zone + rate management | 2d |
| F5.2 | Tax rate management | 1d |
| F5.3 | Coupon management (create, edit, list, validate) | 2d |
| F5.4 | Customer list and detail (merchant view) | 2d |
| F5.5 | Review moderation (list, respond, approve/reject) | 2d |
| F5.6 | Staff management (invite, role change, remove) | 2d |
| F5.7 | Modifier groups (product-level + category-level) | 2d |

**Verification Gate:** Merchant can configure shipping, taxes, coupons, manage reviews, invite staff with role-based access.

### Phase F6: Super Admin Dashboard (Weeks 14-15)

**Goal:** Platform administration.

| Task | Details | Est. |
|---|---|---|
| F6.1 | Super admin login and dashboard | 1d |
| F6.2 | Merchant list with status filter, detail view, approve/suspend/reactivate | 2d |
| F6.3 | Subscription plan CRUD | 1d |
| F6.4 | Store management (view stores across merchants) | 1d |

**Verification Gate:** Super admin can manage merchants, plans, and stores.

### Phase F7: Polish and Optimization (Weeks 16-17)

**Goal:** Performance, accessibility, responsive QA.

| Task | Details | Est. |
|---|---|---|
| F7.1 | SEO audit: metadata, structured data (Product, Organization, BreadcrumbList schemas) | 2d |
| F7.2 | Accessibility audit: keyboard nav, screen readers, color contrast, ARIA | 2d |
| F7.3 | Performance: lazy loading, image optimization, code splitting, ISR for product pages | 2d |
| F7.4 | Responsive QA: test all pages on 320px, 768px, 1280px, 1536px | 2d |
| F7.5 | Error handling: 404 pages, error boundaries, API error states, loading skeletons | 2d |
| F7.6 | RTL layout support for Arabic locale | 2d |

**Verification Gate:** Lighthouse scores 90+ on Performance, Accessibility, SEO. All pages render correctly on mobile, tablet, desktop.

### Phase F8: i18n and Launch Readiness (Weeks 18-19)

| Task | Details | Est. |
|---|---|---|
| F8.1 | Extract all user-facing strings to message catalogs (en, ar) | 3d |
| F8.2 | Implement locale routing and language switcher | 1d |
| F8.3 | E2E test suite (Playwright) for critical paths (checkout, order, product CRUD) | 3d |
| F8.4 | Deployment configuration (Vercel, Docker, or self-hosted) | 1d |

**Total estimated timeline: ~19 weeks (4.5 months)**

---

## 9. Key Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| App architecture | 2 apps (storefront + dashboard) + 1 shared UI package | Different layout shells, auth scopes, caching strategies, SEO needs |
| SSR vs SPA | Storefront = SSR (Next.js RSC); Dashboard = SPA-like (client components) | SEO for products; snappy dashboard interactions |
| Theming | CSS custom properties from store API response | No build-time recompilation; dynamic per-request theming |
| State management | TanStack Query + Zustand + React Hook Form | Right tool for each concern: server cache, client state, form state |
| Component primitives | Radix UI + Tailwind + CVA | Accessible, themeable, composable |
| Auth | httpOnly JWT cookies (already in backend) | Secure, no token management in JS |
| i18n | next-intl with bilingual fields (en/ar) | Backend already supports `nameEn`/`nameAr` pattern |
| Mobile-first | Base styles for phone, enhance with `min-width` | 60%+ e-commerce traffic is mobile |
| Price handling | String-based from API, format client-side | Backend uses string decimals for precision; format with `Intl.NumberFormat` |
| Currency | Store's `currency` field drives formatting | `currency` field in store settings determines symbol and decimals |

---

## 10. Accessibility Requirements

- **WCAG 2.1 AA** compliance for all pages
- All interactive elements reachable via keyboard (Tab, Enter, Escape)
- Focus management in modals, drawers, and wizards
- `aria-label` on icon buttons, `aria-live` on dynamic content (cart count, toast)
- Color contrast ratio minimum 4.5:1 for normal text, 3:1 for large text
- Store theme tokens must be validated against contrast requirements (warn merchant if primary-on-surface fails WCAG)
- Skip-to-content link on every page
- Screen reader announcements for status changes (order status update, add to cart)

---

## 11. Performance Budgets

| Metric | Target | Tool |
|---|---|---|
| First Contentful Paint (FCP) | < 1.5s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Time to Interactive (TTI) | < 3.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| Bundle size (storefront homepage JS) | < 150KB gzipped | Next.js bundle analyzer |
| Bundle size (dashboard initial load) | < 200KB gzipped | Next.js bundle analyzer |
| API response time (p95) | < 300ms | Backend metrics |

---

## 12. File Structure Reference

```
apps/
  storefront/
    src/
      app/
        [locale]/               # i18n routing
          (public)/              # Public route group
            page.tsx             # Home
            products/
              page.tsx           # Product listing
              [id]/page.tsx      # Product detail
            categories/
              [slug]/page.tsx    # Category products
            cart/page.tsx
          (auth)/                # Auth route group
            login/page.tsx
            register/page.tsx
            verify-email/page.tsx
            forgot-password/page.tsx
            reset-password/page.tsx
          (customer)/            # Protected customer routes
            account/
              page.tsx           # Dashboard
              orders/
                page.tsx         # List
                [id]/page.tsx    # Detail
              profile/page.tsx
              addresses/page.tsx
              wishlist/page.tsx
              reviews/page.tsx
          checkout/
            shipping/page.tsx
            payment/page.tsx
            confirm/page.tsx
          order-confirmed/[id]/page.tsx
      components/               # Storefront-specific
      lib/                       # API client, hooks, utils
      providers/                 # Theme, Query, Auth providers
      middleware.ts              # Auth + locale detection
    public/
    next.config.ts
    tailwind.config.ts

  dashboard/
    src/
      app/
        (auth)/                  # Auth route group
          login/page.tsx
          forgot-password/page.tsx
          reset-password/page.tsx
          invite/[token]/page.tsx
        (merchant)/             # Protected merchant routes
          dashboard/
            page.tsx             # Home
            products/
              page.tsx           # List
              new/page.tsx       # Create
              [id]/page.tsx      # Edit
            categories/page.tsx
            orders/
              page.tsx           # List
              [id]/page.tsx      # Detail
            customers/
              page.tsx           # List
              [id]/page.tsx      # Detail
            settings/
              general/page.tsx
              branding/page.tsx
              shipping/page.tsx
              tax/page.tsx
              staff/page.tsx
            coupons/page.tsx
            reviews/page.tsx
            modifiers/page.tsx
        (super-admin)/          # Protected super admin routes
          admin/
            page.tsx             # Dashboard
            merchants/
              page.tsx           # List
              [id]/page.tsx      # Detail
            plans/page.tsx
            stores/page.tsx
      components/               # Dashboard-specific
      lib/                       # API client, hooks, utils
      providers/                 # Auth, Query providers
      middleware.ts              # Role-based route protection
    next.config.ts
    tailwind.config.ts

packages/
  ui/
    src/
      tokens/                   # Design tokens
      primitives/               # Atomic components
      composites/               # Composite components
      patterns/                 # Layout patterns
    tailwind.config.ts          # Shared Tailwind preset
    package.json
  shared-types/                 # Existing
  shared-utils/                 # Existing
```