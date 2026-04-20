# UX Design Plan — SaaS Multi-Tenant E-Commerce Platform (v2)

> **Changelog from v1:**
> - Next.js → SvelteKit (both apps)
> - React ecosystem → Svelte 5 ecosystem throughout
> - Added: 3-theme system (Food / Clothing / Appliances) with dynamic components
> - Added: Full storefront customization map (logo, hero slideshow, section toggles, filter config, etc.)
> - Shared UI package now actually works (Svelte components)
> - Removed: Zustand, nuqs, next-intl, React Hook Form, Radix UI direct deps, recharts
> - Replaced: Paraglide JS (i18n), $state runes (client state), superforms (forms), svelte-query, layerchart

---

## 1. Architecture Decision: Two-App Strategy

### Rationale

The platform has three distinct user audiences with near-zero UI overlap:

| Audience | Needs | Auth Scope | SEO Priority |
|---|---|---|---|
| **Customers** (Shoppers) | Browse, search, cart, checkout, account | Customer session cookie | Critical — products/categories must index |
| **Merchants** (Store Owners + Staff) | Manage products, orders, analytics, store settings | Merchant session cookie with role permissions | None — private dashboard |
| **Super Admins** (Platform Operators) | Manage merchants, plans, platform-wide ops | SuperAdmin session cookie | None — private dashboard |

**Decision: Two apps + shared packages in the monorepo.**

```
apps/
  storefront/     # SvelteKit — Customer-facing (SSR, SEO, multi-tenant theming)
  dashboard/      # SvelteKit — Merchant + Super Admin (SPA-like, role-based routing)
packages/
  ui/             # Svelte 5 component library (design system) — shared across both apps
  shared-types/   # Zod schemas + TypeScript types
  shared-utils/   # Framework-agnostic utilities
```

The `dashboard` app serves both Merchant and Super Admin under role-based routing:
- `/admin/*` → Super Admin route tree
- `/dashboard/*` → Merchant route tree

Both share the same SvelteKit app shell but route to different page trees based on the `role` claim in the session. Separate `+layout.server.ts` guards per route group — Super Admin guard is stricter and fully independent from Merchant guard logic.

> **Security note:** Super Admin and Merchant use entirely separate `+layout.server.ts` auth checks. They do not share middleware logic. A Merchant session can never access `/admin/*` routes.

---

## 2. Theme System — Industry Presets + Dynamic Components

### 2.1 Three Industry Themes

Each store picks a base theme during onboarding. This drives both design tokens AND component selection.

| Theme | Target | Visual Identity | Key Differentiators |
|---|---|---|---|
| **Food** | Restaurants, cafes, dark kitchens | Warm oranges, deep browns, rounded | Meal categories, prep time, "Order Now" CTA |
| **Clothing** | Fashion, apparel, boutiques | Editorial black/gold, sharp radius | Lookbook cards, portrait ratio, size dots |
| **Appliances** | Electronics, home goods, tech | Trust blue, clean white, professional | Spec display, compare feature, warranty badges |

### 2.2 Token Differences Per Theme

```ts
// packages/ui/src/themes/food/tokens.ts
export const foodTheme = {
  colors: {
    primary: '#e85d04',
    secondary: '#370617',
    accent: '#faa307',
    bg: '#fffbf5',
    surface: '#fff8ee',
    text: '#1a0a00',
    textSecondary: '#7c4a1e',
    border: 'rgba(232, 93, 4, 0.15)',
  },
  font: 'Playfair Display',
  radius: '12px',
}

// packages/ui/src/themes/clothing/tokens.ts
export const clothingTheme = {
  colors: {
    primary: '#1a1a1a',
    secondary: '#c9a84c',
    accent: '#e8c4b8',
    bg: '#fafafa',
    surface: '#ffffff',
    text: '#0a0a0a',
    textSecondary: '#6b6b6b',
    border: 'rgba(0,0,0,0.08)',
  },
  font: 'Cormorant Garamond',
  radius: '2px',
}

// packages/ui/src/themes/appliances/tokens.ts
export const appliancesTheme = {
  colors: {
    primary: '#0052cc',
    secondary: '#172b4d',
    accent: '#36b37e',
    bg: '#f4f5f7',
    surface: '#ffffff',
    text: '#172b4d',
    textSecondary: '#5e6c84',
    border: 'rgba(23, 43, 77, 0.12)',
  },
  font: 'Inter',
  radius: '6px',
}
```

### 2.3 Dynamic Component Registry

Same page slot, different components rendered based on themeType:

```ts
// packages/ui/src/themes/index.ts
export const themeRegistry = {
  food: {
    tokens: foodTheme,
    productCard: 'FoodCard',
    heroSection: 'FoodHero',
    categoryDisplay: 'MenuSection',
    homeSections: ['HeroSection', 'CategoryMenuSection', 'FeaturedDishesSection', 'PopularSection'],
  },
  clothing: {
    tokens: clothingTheme,
    productCard: 'LookbookCard',
    heroSection: 'EditorialHero',
    categoryDisplay: 'StyleGrid',
    homeSections: ['EditorialHeroSection', 'NewArrivalsSection', 'CategoryStyleGrid', 'TrendingSection'],
  },
  appliances: {
    tokens: appliancesTheme,
    productCard: 'SpecCard',
    heroSection: 'ProductHero',
    categoryDisplay: 'CategoryList',
    homeSections: ['ProductHeroSection', 'ShopByCategorySection', 'FeaturedSpecsSection', 'BrandTrustSection'],
  },
}
```

**SvelteKit dynamic component rendering:**

```svelte
<!-- apps/storefront/src/routes/+page.svelte -->
<script>
  import { themeRegistry } from '@repo/ui/themes'
  import * as HomeSections from '$lib/components/sections'
  let { data } = $props()
  const theme = themeRegistry[data.store.themeType]
</script>

{#each theme.homeSections as sectionName}
  <svelte:component this={HomeSections[sectionName]} store={data.store} />
{/each}
```

### 2.4 Product Card Variants

| Card | Ratio | Key Fields | CTA |
|---|---|---|---|
| **FoodCard** | Square/landscape | Dish name, price, prep time badge, calories (optional) | "Order Now" |
| **LookbookCard** | Portrait 3:4 | Model photo, hover→second image, size availability dots | Wishlist heart prominent |
| **SpecCard** | Landscape | Product on white bg, 2-3 inline specs (wattage, capacity), compare checkbox | "Add to Cart" + Compare |

> **Important:** `themeType` is locked after onboarding. A food merchant cannot switch to clothing theme mid-operation — product data fields differ (prep time, calories vs sizes, colors). Only token overrides (colors, fonts) are allowed post-onboarding.

---

## 3. Storefront Customization System

### 3.1 Full Customization Map

#### Brand Identity
```
Logo upload
Favicon upload
Store name (shown in header)
Tagline (optional, below logo)
Primary / Secondary / Accent color overrides
Font family (curated list: Inter, Playfair Display, Cormorant Garamond,
             Lato, Nunito, Raleway, Montserrat, Roboto)
Border radius override (0px–20px slider)
```

#### Hero Section
```
Enable / Disable hero                    ← toggle
Hero type: Static image | Slideshow

Per slide config:
  Image upload
  Title text
  Subtitle text
  CTA button text + link
  Text position: left / center / right
  Overlay darkness: 0–80%

Slideshow settings:
  Auto-play: on/off
  Interval: 3s / 5s / 7s
  Transition: fade / slide
  Max slides: 5
```

#### Homepage Sections (Drag-to-reorder)
```
[ ✅ ] Hero Banner           (always first, locked)
[ ✅ ] Featured Categories   (draggable)
[ ✅ ] Featured Products     (draggable)
[ ✅ ] New Arrivals          (draggable)
[ ✅ ] Offer Banner          (static image + CTA link)
[ ⬜ ] Testimonials / Reviews
[ ⬜ ] Brand Story
[ ⬜ ] Trust Badges          (Free shipping / Easy returns / Secure payment)
```

Stored as ordered array in DB:
```ts
homeSections: ['hero', 'categories', 'featured', 'new-arrivals', 'offer-banner']
```

#### Product Listing Controls
```
Filters sidebar:
  Enable / Disable entirely              ← toggle
  Visible filters:
    [ ✅ ] Category
    [ ✅ ] Price range
    [ ✅ ] Rating
    [ ⬜ ] Brand
    [ ⬜ ] Tags
  Filter position: Sidebar / Top bar / Drawer

Product grid:
  Default columns: 2 / 3 / 4
  Default sort: Newest / Popular / Price ↑ / Price ↓

Product card display:
  Show rating:                           on/off
  Show "Add to cart" on card:            on/off
  Show discount badge:                   on/off
  Image aspect ratio: Square / Portrait / Landscape
```

#### Cart & Checkout
```
Cart type: Drawer (slide-in) / Full page
Guest checkout: Allow / Require login
Checkout fields:
  Phone number: required / optional / hidden
  Order notes: on/off
  Gift message: on/off
Coupon code field:                       on/off
```

#### Header & Navigation
```
Header layout:
  Logo left, nav center
  Logo center, nav below
  Minimal (logo + cart icon only)
Navigation style:
  Horizontal links
  Mega menu (categories as columns)
  Hamburger only
Sticky header:                           on/off
Search bar:                              on/off
Wishlist icon:                           on/off
```

#### Footer
```
Show footer:                             on/off
About text blurb
Social links: Instagram / Facebook / TikTok / WhatsApp / X
Quick links (auto-populated from custom pages)
Contact info: phone, email, address
Payment icons: Visa / Mastercard / Apple Pay / Google Pay
Copyright text
```

#### Custom Pages
```
Merchant can create:
  About Us
  Contact Us
  Privacy Policy
  Refund Policy
  Terms & Conditions

Editor: Simple block editor (TipTap — already used in ValaiCMS)
Auto-added to footer nav
```

### 3.2 Customization DB Schema

```ts
storeCustomization: {
  // Brand
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string | null       // overrides theme preset
  secondaryColor: string | null
  accentColor: string | null
  fontFamily: string | null
  borderRadius: number | null       // 0-20, overrides theme preset

  // Hero
  heroEnabled: boolean
  heroType: 'static' | 'slideshow'
  heroSlides: {
    imageUrl: string
    title: string
    subtitle: string
    ctaText: string
    ctaLink: string
    textPosition: 'left' | 'center' | 'right'
    overlayOpacity: number          // 0-80
  }[]
  heroAutoPlay: boolean
  heroInterval: 3000 | 5000 | 7000
  heroTransition: 'fade' | 'slide'

  // Homepage
  homeSections: string[]            // ordered array

  // Product listing
  filtersEnabled: boolean
  visibleFilters: string[]
  defaultColumns: 2 | 3 | 4
  defaultSort: 'newest' | 'popular' | 'price_asc' | 'price_desc'
  showRatingOnCard: boolean
  showAddToCartOnCard: boolean
  showDiscountBadge: boolean
  cardAspectRatio: 'square' | 'portrait' | 'landscape'

  // Checkout
  guestCheckout: boolean
  cartType: 'drawer' | 'page'
  showOrderNotes: boolean
  showGiftMessage: boolean
  showCouponField: boolean
  checkoutPhoneField: 'required' | 'optional' | 'hidden'

  // Header
  headerLayout: 'left' | 'center' | 'minimal'
  navStyle: 'horizontal' | 'mega' | 'hamburger'
  stickyHeader: boolean
  showSearch: boolean
  showWishlist: boolean

  // Footer
  footerEnabled: boolean
  footerAboutText: string | null
  socialLinks: {
    instagram?: string
    facebook?: string
    tiktok?: string
    whatsapp?: string
    x?: string
  }
  showPaymentIcons: boolean
  copyrightText: string | null
}
```

---

## 4. Pages / Screens Inventory

### 4.1 Storefront (Customer-Facing) — apps/storefront

Every storefront page renders within the store's theme (colors, fonts, border radius, logo) fetched from `GET /api/store/:domain`. Theme tokens injected as CSS custom properties at `<html>` level via `+layout.server.ts`.

#### Public (No Auth Required)

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| S1 | Home | `/` | Dynamic sections per themeType + customization config | `GET /public/store`, `GET /public/products` |
| S2 | Product Listing | `/products` or `/categories/:slug` | Filtered/searchable product grid | `GET /public/products/search` |
| S3 | Product Detail | `/products/:slug` | Images, variants, modifiers, reviews, related | `GET /public/products/:id`, `GET /public/reviews` |
| S4 | Store Info | `/about` | Store branding, social links, contact | `GET /public/store` |
| S5 | Cart | `/cart` | View/update cart (guest users) | `GET /public/cart`, `PATCH /public/cart/items/:itemId` |

#### Customer Auth (Login Required)

| # | Page | Route | Purpose | API Endpoints |
|---|---|---|---|---|
| S6 | Login | `/login` | Email + password | `POST /auth/customer/login` |
| S7 | Register | `/register` | Create customer account | `POST /auth/customer/register` |
| S8 | Verify Email | `/verify-email?token=` | Confirm email | `POST /auth/customer/verify-email` |
| S9 | Forgot Password | `/forgot-password` | Request reset email | `POST /auth/customer/forgot-password` |
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
| S18 | Checkout — Shipping | `/checkout/shipping` | Address entry or select saved, shipping rate | `GET /customer/addresses`, `POST /public/shipping/calculate` |
| S19 | Checkout — Payment | `/checkout/payment` | Payment method, coupon, order summary | `POST /public/tax/calculate`, `POST /public/coupons/validate` |
| S20 | Checkout — Confirm | `/checkout/confirm` | Final review, place order | `POST /checkout` |
| S21 | Order Confirmation | `/order-confirmed/:id` | Success page with order details | `GET /customer/orders/:id` |

> **Cart merge strategy:** Guest cart (cookie) merges on login. If same item exists in both → quantities add. Out-of-stock items from guest cart → shown as unavailable at merge, not silently dropped.

**Total Storefront Pages: 21**

---

### 4.2 Merchant Dashboard — apps/dashboard

Persistent sidebar + topbar shell. Nav items conditionally rendered based on staff role (OWNER → all; MANAGER → most; CASHIER → limited).

#### Auth

| # | Page | Route | Purpose |
|---|---|---|---|
| D1 | Login | `/login` | Merchant email + password |
| D2 | Forgot Password | `/forgot-password` | Request reset |
| D3 | Reset Password | `/reset-password?token=` | Set new password |
| D4 | Accept Invite | `/invite/:token` | Staff sets password |

#### Home / Analytics

| # | Page | Route | Purpose |
|---|---|---|---|
| D5 | Dashboard Home | `/dashboard` | Revenue chart (layerchart), recent orders, KPI cards |

#### Products

| # | Page | Route | Purpose |
|---|---|---|---|
| D6 | Products List | `/dashboard/products` | Searchable/filterable table |
| D7 | Product Create | `/dashboard/products/new` | Multi-step form (superforms) |
| D8 | Product Edit | `/dashboard/products/:id` | Edit product, variants, modifiers, images |
| D9 | Categories | `/dashboard/categories` | Category + subcategory tree management |

#### Orders

| # | Page | Route | Purpose |
|---|---|---|---|
| D10 | Orders List | `/dashboard/orders` | Filter by status, search, date range |
| D11 | Order Detail | `/dashboard/orders/:id` | Line items, status update, customer info |

#### Customers

| # | Page | Route | Purpose |
|---|---|---|---|
| D12 | Customers List | `/dashboard/customers` | Search, view customer list |
| D13 | Customer Detail | `/dashboard/customers/:id` | Orders, profile, addresses |

#### Store Settings

| # | Page | Route | Purpose |
|---|---|---|---|
| D14 | General | `/dashboard/settings/general` | Name, domain, currency, language |
| D15 | Storefront | `/dashboard/settings/storefront` | Full customization (logo, hero, sections, filters, checkout, header, footer) |
| D16 | Branding | `/dashboard/settings/branding` | Color overrides, font, radius on top of theme preset — with live preview |
| D17 | Shipping | `/dashboard/settings/shipping` | Zones, rates, methods |
| D18 | Tax | `/dashboard/settings/tax` | Tax rates CRUD |
| D19 | Staff | `/dashboard/settings/staff` | Invite, role assignment |

> **Settings → Storefront** is a tabbed page:
> `[ Brand ] [ Hero ] [ Sections ] [ Products ] [ Checkout ] [ Header ] [ Footer ]`
> Every change updates a live preview panel (right side iframe with `?preview=true` mode).

#### Marketing

| # | Page | Route | Purpose |
|---|---|---|---|
| D20 | Coupons | `/dashboard/coupons` | Coupon list, create, edit |
| D21 | Reviews | `/dashboard/reviews` | Moderation, respond, approve |

#### Modifiers

| # | Page | Route | Purpose |
|---|---|---|---|
| D22 | Modifier Groups | `/dashboard/modifiers` | Product/category modifier management |

> **Modifier vs Variant clarity for merchants:** Variants = product versions that change price/SKU/stock (e.g. Size S/M/L, Color Red/Blue). Modifiers = add-ons that don't change the base product (e.g. Extra cheese, Gift wrap). UI must label these clearly with examples on the form.

**Total Merchant Dashboard Pages: 22**

---

### 4.3 Super Admin — apps/dashboard (same app, separate route tree)

Separate `(superadmin)` route group with independent `+layout.server.ts` auth guard. Different sidebar nav, scoped to `/api/super-admin/*` endpoints.

| # | Page | Route | Purpose |
|---|---|---|---|
| A1 | Login | `/admin/login` | Super admin login (separate from merchant) |
| A2 | Dashboard | `/admin` | Platform-wide stats, merchant health |
| A3 | Merchants List | `/admin/merchants` | Paginated list with status filters |
| A4 | Merchant Detail | `/admin/merchants/:id` | Approve/suspend/reactivate, view stores |
| A5 | Plans | `/admin/plans` | Subscription plan CRUD |
| A6 | Stores | `/admin/stores` | Store management across merchants |

**Total Super Admin Pages: 6**

**GRAND TOTAL: 49 pages across all three audiences.**

---

## 5. User Flows

### 5.1 Customer Checkout Flow

```
[Product Page] → [Add to Cart]
                      |
                      v
              [Cart Page] → [Guest?] → Yes → [Checkout as Guest OR Login/Register]
                      |                                    |
                      No                                   v
                      |                            [Auth Step]
                      v                                 |
              [Checkout: Shipping] ←-------------------+
                      |
                      v
              [Select Saved Address OR Enter New]
                      |
                      v
              [Shipping Rate Selection]
                      |
                      v
              [Checkout: Payment]
                      |→ Apply Coupon Code (instant validation)
                      |→ Tax Calculation (on address change)
                      |
                      v
              [Checkout: Review & Confirm]
                      |
                      v
              [Order Placed] → [Order Confirmation Page]
```

### 5.2 Merchant Product Management Flow

```
[Products List] → [Create Product]
                        |
                        v
                [Step 1: Basic Info] (title, description, category, pricing, images)
                        |
                        v
                [Step 2: Variants] (variant groups + options with price adjustments, SKU, stock)
                        |
                        v
                [Step 3: Modifiers] (modifier groups: size, addons, etc.)
                        |
                        v
                [Step 4: Publish Settings] (sort order, tags, published/draft toggle)
                        |
                        v
                [Save] → [Redirect to Product List OR Edit Page]
```

### 5.3 Merchant Order Management Flow

```
[Orders List] → Filter by status (pending/processing/shipped/delivered/cancelled)
                        |
                        v
                [Order Detail] → View line items, customer info, totals
                        |
                        |→ [Update Status]
                        |→ [Cancel Order]
```

### 5.4 Staff Invite & Accept Flow

```
[Owner: Staff Page] → [Invite Staff: Email + Role]
                            |
                            v
                    [Email Sent with Invite Token]
                            |
                            v
                    [Staff: Clicks /invite/:token]
                            |
                            v
                    [Set Password + Name] → [Logged In → Dashboard with Role Nav]
```

### 5.5 Super Admin Merchant Approval Flow

```
[Merchants List] → Filter (pending/active/suspended)
                        |
                        v
                [Merchant Detail] → [Approve] or [Suspend]
                        |
                        v
                [Merchant receives email notification]
```

### 5.6 Storefront Customization Flow

```
[Settings → Storefront] → Tabs: Brand / Hero / Sections / Products / Checkout / Header / Footer
                        |
                        v
              [Edit any field] → Live Preview Panel updates (right side iframe)
                        |
                        v
              [Save] → CSS variables + config updated
                        |
                        v
              [Storefront reflects changes on next page load]
```

---

## 6. Component Hierarchy

### 6.1 Design System — packages/ui (Svelte 5)

Shared across both apps. Accepts theme tokens via CSS custom properties. Styled with Tailwind CSS.

```
packages/ui/
  src/
    themes/                        # Theme presets + registry
      food/tokens.ts
      clothing/tokens.ts
      appliances/tokens.ts
      index.ts                     # themeRegistry export
    tokens/                        # Base design tokens
      colors.ts
      typography.ts
      spacing.ts
      shadows.ts
    primitives/                    # Atomic Svelte components
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
    composites/                    # Composed from primitives
      DataTable/                   # Sorting, pagination, filtering
      FormField/                   # Label + input + error
      SearchInput/                 # Debounced input + clear
      Card/
      PriceDisplay/                # Decimal formatting per currency
      ImageGallery/
      Stepper/
      StatusBadge/
      Breadcrumb/
      Pagination/
      EmptyState/
      ConfirmDialog/
      ColorPicker/
      FontPicker/
    patterns/                      # Reusable layout patterns
      AppShell/                    # Sidebar + topbar + main
      PageHeader/
      ResourceList/                # Search + filter + table + pagination
      FormWizard/                  # Multi-step form with validation
```

### 6.2 Storefront-Specific Components — apps/storefront

```
apps/storefront/src/lib/components/
  layout/
    StoreHeader/
    StoreFooter/
    StoreNav/
  sections/                        # Dynamic homepage sections
    HeroSection/
    FoodHero/
    EditorialHero/
    ProductHero/
    CategoryMenuSection/
    StyleGrid/
    ShopByCategorySection/
    FeaturedDishesSection/
    NewArrivalsSection/
    FeaturedSpecsSection/
    PopularSection/
    TrendingSection/
    BrandTrustSection/
    OfferBannerSection/
    TestimonialsSection/
    TrustBadgesSection/
  product/
    FoodCard/                      # Theme-specific cards
    LookbookCard/
    SpecCard/
    ProductGrid/
    ProductFilters/
    VariantSelector/
    ModifierSelector/
    ProductReviews/
    ReviewForm/
  cart/
    CartDrawer/
    CartItemRow/
    CartSummary/
  checkout/
    AddressForm/
    ShippingRateSelector/
    CouponCodeInput/
    OrderSummarySidebar/
    CheckoutStepper/
  account/
    OrderCard/
    OrderTimeline/
    AddressCard/
    AddressBook/
    WishlistGrid/
  theme/
    ThemeProvider/                 # Injects store CSS vars at <html>
```

### 6.3 Dashboard-Specific Components — apps/dashboard

```
apps/dashboard/src/lib/components/
  layout/
    DashboardSidebar/
    DashboardTopbar/
    DashboardContent/
  products/
    ProductForm/
    VariantManager/
    ModifierManager/
    CategoryTree/
  orders/
    OrderTable/
    OrderDetailPanel/
    StatusUpdateDropdown/
  analytics/
    RevenueChart/                  # layerchart
    StatsCard/
    DashboardGrid/
  settings/
    StorefrontCustomizer/          # Tabbed customization UI
    HeroEditor/                    # Slide management
    SectionBuilder/                # Drag-to-reorder sections
    BrandingEditor/                # Color/font/radius overrides
    ThemePreview/                  # Live preview iframe
    ShippingZoneForm/
    TaxRateForm/
    StaffTable/
    InviteStaffDialog/
  coupons/
    CouponForm/
    CouponTable/
  reviews/
    ReviewTable/
    ReviewRespondDialog/
  super-admin/
    MerchantTable/
    MerchantDetailPanel/
    PlanForm/
    PlanTable/
```

---

## 7. Design Tokens

### 7.1 Multi-Tenant Theming Strategy

Theme resolution order (highest priority wins):
1. Merchant custom overrides (`primaryColor`, `fontFamily`, etc.)
2. Industry theme preset (`food` / `clothing` / `appliances`)
3. System defaults

CSS custom properties injected at `<html>` by `+layout.server.ts`:

```css
:root {
  /* Store Theme (resolved from themeType + merchant overrides) */
  --color-primary: #e85d04;
  --color-secondary: #370617;
  --color-accent: #faa307;
  --color-bg: #fffbf5;
  --color-surface: #fff8ee;
  --color-text: #1a0a00;
  --color-text-secondary: #7c4a1e;
  --color-border: rgba(232, 93, 4, 0.15);
  --radius-base: 12px;
  --font-family: 'Playfair Display', Georgia, serif;

  /* System Tokens (never overridden by store theme) */
  --color-success: #22c55e;
  --color-warning: #eab308;      /* Note: distinct from accent to avoid collision */
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

> **Accent/Warning collision fix:** `--color-warning` is now `#eab308` (yellow-500) instead of amber-500, to avoid collision with themes that use amber as accent.

### 7.2 Color System

#### Store-Themable Colors

| Token | CSS Variable | Purpose |
|---|---|---|
| Primary | `--color-primary` | CTAs, links, active states |
| Secondary | `--color-secondary` | Secondary actions |
| Accent | `--color-accent` | Highlights, badges, sale tags |
| Background | `--color-bg` | Page background |
| Surface | `--color-surface` | Cards, panels, modals |
| Text | `--color-text` | Primary text |
| Text Secondary | `--color-text-secondary` | Captions, metadata |
| Border | `--color-border` | Dividers, input borders |

#### System Colors (Fixed)

| Token | Value | Purpose |
|---|---|---|
| Success | `#22c55e` | Confirmation, completed |
| Warning | `#eab308` | Caution, pending |
| Error | `#ef4444` | Validation errors, destructive |
| Info | `#3b82f6` | Informational |

#### Dashboard Palette (Dark Sidebar)

| Token | Value | Purpose |
|---|---|---|
| Sidebar BG | `#0f172a` | Sidebar background |
| Sidebar Text | `#e2e8f0` | Nav text |
| Sidebar Active | `--color-primary` | Active nav item |
| Page BG | `#f8fafc` | Dashboard content bg |

### 7.3 Typography

| Scale | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `--text-xs` | 12px | 400 | 16px | Captions, badges |
| `--text-sm` | 14px | 400 | 20px | Table cells, secondary |
| `--text-base` | 16px | 400 | 24px | Body |
| `--text-lg` | 18px | 500 | 28px | Section headings |
| `--text-xl` | 20px | 600 | 28px | Card titles |
| `--text-2xl` | 24px | 600 | 32px | Page headings |
| `--text-3xl` | 30px | 700 | 36px | Hero headings |
| `--text-4xl` | 36px | 700 | 40px | Display (storefront hero) |

Font default: `Inter, system-ui, -apple-system, sans-serif` — overridden by theme preset and merchant selection.

### 7.4 Spacing Scale

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

### 7.5 Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `calc(var(--radius-base) * 0.5)` | Buttons, inputs |
| `--radius-md` | `var(--radius-base)` | Cards, modals (store-themable) |
| `--radius-lg` | `calc(var(--radius-base) * 1.5)` | Panels, image containers |
| `--radius-full` | `9999px` | Avatars, pills |

> All radius tokens derived from `--radius-base`. If merchant sets radius-base to 0, everything scales to flat. No hardcoded px overrides.

### 7.6 Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Card hover |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Cards, dropdowns |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Modals, popovers |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` | Elevated drawers |

### 7.7 Breakpoints (Mobile-First)

| Name | Min Width | Layout Behavior |
|---|---|---|
| `sm` | 640px | 2-column product grids |
| `md` | 768px | Collapsible sidebar, 3-column grids |
| `lg` | 1024px | Full dashboard sidebar, 4-column grids |
| `xl` | 1280px | Max-width container |
| `2xl` | 1536px | Extra breathing room |

### 7.8 Z-Index Scale

| Token | Value | Usage |
|---|---|---|
| `--z-dropdown` | 10 | Dropdowns |
| `--z-sticky` | 20 | Sticky headers |
| `--z-overlay` | 30 | Modal backdrops |
| `--z-modal` | 40 | Modal content |
| `--z-toast` | 50 | Toast notifications |
| `--z-tooltip` | 60 | Tooltips |

---

## 8. Responsive Layout Patterns

### 8.1 Storefront

**Mobile (<640px):**
- Single-column product grid
- Hamburger menu
- Cart as full page (not drawer — configurable)
- Checkout: stacked steps, no sidebar summary
- Bottom sticky add-to-cart bar on product pages

**Tablet (640–1024px):**
- 2–3 column product grid
- Slide-out cart drawer
- Sidebar summary visible below checkout form
- Category nav as horizontal scroll

**Desktop (>1024px):**
- 4-column product grid
- Persistent category sidebar or mega-menu
- Cart drawer from right
- Checkout: 2-column (form left, sticky summary right)

### 8.2 Dashboard

**Mobile (<768px):**
- Sidebar collapses to hamburger + overlay (no bottom tab bar — low ROI for merchant dashboard)
- Data tables → card lists
- Forms stack vertically

**Tablet (768–1280px):**
- Icon-only sidebar (expandable on tap)
- Tables show 5–6 columns
- Forms in 600px centered container

**Desktop (>1280px):**
- Full sidebar (240px) with labels
- Tables show 8+ columns with actions
- Forms in 720px centered container
- Side panels for order/customer detail

---

## 9. Tech Stack

### Core
```
Runtime:        Bun
Framework:      SvelteKit (Svelte 5 runes)
Monorepo:       Turborepo
Package mgr:    Bun workspaces
```

### UI & Styling
```
Components:     shadcn-svelte (Radix-based, accessible)
Styling:        Tailwind CSS v4
Icons:          lucide-svelte
Charts:         layerchart (Svelte-native, D3-based)
Theming:        CSS custom properties (runtime, per-store, per-theme)
Image opt:      @sveltejs/enhanced-img
```

### Forms & Validation
```
Forms:          superforms + sveltekit-superforms
Validation:     zod (shared schemas from packages/shared-types)
Uploads:        SvelteKit form actions + S3-compatible endpoint
```

### State Management
```
Server state:   svelte-query (TanStack Query Svelte v5)
Client state:   Svelte 5 $state runes           ← no Zustand needed
URL state:      SvelteKit $page.url.searchParams ← no nuqs needed
Form state:     superforms                       ← no React Hook Form
```

### Auth
```
Library:        better-auth
Sessions:       httpOnly cookies (JWT)
Route guards:   +layout.server.ts per route group
                (merchant + superadmin guards are fully independent)
```

### i18n
```
Library:        Paraglide JS (@inlang/paraglide-sveltekit)
Locales:        en, ar
RTL:            dir="rtl" + Tailwind RTL utilities
```

### Backend (already built)
```
Runtime:        Bun
Framework:      Hono.js
ORM:            Drizzle ORM
DB:             PostgreSQL
Storage:        Cloudflare R2 (S3-compatible)
Real-time:      SSE
```

### Dev & Deploy
```
Unit tests:     Vitest
E2E tests:      Playwright
Linting:        ESLint + prettier-plugin-svelte
Deploy:         Docker + Oracle Cloud
Proxy:          Cloudflare (HTTPS, no server-side SSL config)
```

### Full Dependency List

```json
{
  "dependencies": {
    "@sveltejs/kit": "^2",
    "svelte": "^5",
    "svelte-query": "^5",
    "superforms": "^2",
    "sveltekit-superforms": "^2",
    "zod": "^3",
    "better-auth": "latest",
    "@inlang/paraglide-sveltekit": "latest",
    "layerchart": "latest",
    "lucide-svelte": "latest",
    "tailwind-merge": "latest",
    "clsx": "latest",
    "date-fns": "^4"
  },
  "devDependencies": {
    "typescript": "^5",
    "tailwindcss": "^4",
    "@sveltejs/enhanced-img": "latest",
    "@sveltejs/adapter-node": "latest",
    "vite": "^6",
    "vitest": "latest",
    "@playwright/test": "latest",
    "prettier": "latest",
    "prettier-plugin-svelte": "latest",
    "eslint": "latest",
    "eslint-plugin-svelte": "latest"
  }
}
```

---

## 10. Phase Breakdown

### Phase F1: Foundation (Weeks 1–2)

**Goal:** Monorepo setup, design system skeleton, auth flows, theme system.

| Task | Details | Est. |
|---|---|---|
| F1.1 | Scaffold `apps/storefront` and `apps/dashboard` with SvelteKit + Bun | 1d |
| F1.2 | Configure Turborepo with `packages/ui`, `packages/shared-types`, `packages/shared-utils` | 1d |
| F1.3 | Create `packages/ui` — design tokens, Tailwind config, theme registry (food/clothing/appliances), base primitives | 3d |
| F1.4 | Build ThemeProvider — fetches store settings, injects CSS variables at `<html>`, resolves themeType → preset → merchant overrides | 1d |
| F1.5 | Implement auth flows for all 3 audiences via better-auth (login, register, verify, forgot/reset, invite) | 3d |
| F1.6 | Build AppShell layouts (storefront: top nav + footer; dashboard: sidebar + topbar with role-based nav) | 2d |
| F1.7 | Set up svelte-query client with auth cookie handling and error interceptors | 1d |

**Verification Gate:** All three auth flows work. Store theme renders per themeType. Merchant and Super Admin see different nav.

---

### Phase F2: Storefront Core (Weeks 3–5)

**Goal:** Complete shopping experience — browse, search, cart, checkout.

| Task | Details | Est. |
|---|---|---|
| F2.1 | Dynamic homepage — section builder renders sections from `homeSections` config, theme-specific hero | 3d |
| F2.2 | Product listing — search, configured filters, grid with merchant-configured columns/sort/card style | 3d |
| F2.3 | Product detail — images, variants, modifiers, reviews, related products, sticky add-to-cart | 4d |
| F2.4 | Cart — session-based for guests, merge on login (with conflict resolution), drawer/page per config | 3d |
| F2.5 | Checkout wizard — shipping address, rate selection, coupon, tax, order summary | 4d |
| F2.6 | Order confirmation page | 1d |

**Verification Gate:** Guest can browse, add to cart, check out, see confirmation. SEO metadata renders. Theme-specific cards display correctly.

---

### Phase F3: Customer Account (Weeks 5–6)

**Goal:** Self-service account management.

| Task | Details | Est. |
|---|---|---|
| F3.1 | Account dashboard (recent orders, profile summary) | 1d |
| F3.2 | Order history + detail with status timeline | 2d |
| F3.3 | Profile management | 1d |
| F3.4 | Address book CRUD with default address | 2d |
| F3.5 | Wishlist | 1d |
| F3.6 | Review management | 2d |

**Verification Gate:** Customer can manage full account self-service.

---

### Phase F4: Merchant Dashboard — Core (Weeks 7–10)

**Goal:** Essential merchant operations.

| Task | Details | Est. |
|---|---|---|
| F4.1 | Dashboard home — KPI stats cards + revenue chart (layerchart) | 2d |
| F4.2 | Products list with search/filter, create (multi-step superforms), edit, publish toggle | 4d |
| F4.3 | Variants — add/edit/remove variant groups and options (price, SKU, stock) | 3d |
| F4.4 | Modifiers — add/edit/remove modifier groups and options | 2d |
| F4.5 | Categories — CRUD with subcategories (tree view) | 2d |
| F4.6 | Image upload integration | 1d |
| F4.7 | Orders — list with status filters, detail, status update | 3d |
| F4.8 | Store settings — general (name, domain, currency), full storefront customizer (tabbed: hero, sections, filters, checkout, header, footer) with live preview | 4d |

**Verification Gate:** Merchant can create products, manage orders, and configure full storefront customization with live preview.

---

### Phase F5: Merchant Dashboard — Extended (Weeks 11–13)

**Goal:** Full merchant feature set.

| Task | Details | Est. |
|---|---|---|
| F5.1 | Shipping zone + rate management | 2d |
| F5.2 | Tax rate management | 1d |
| F5.3 | Coupon management | 2d |
| F5.4 | Customer list and detail | 2d |
| F5.5 | Review moderation (list, respond, approve/reject) | 2d |
| F5.6 | Staff management (invite, role change, remove) | 2d |
| F5.7 | Custom pages (TipTap block editor) | 2d |

**Verification Gate:** Full merchant operations working end-to-end.

---

### Phase F6: Super Admin Dashboard (Weeks 14–15)

**Goal:** Platform administration.

| Task | Details | Est. |
|---|---|---|
| F6.1 | Super admin login (separate auth guard, independent from merchant) + dashboard | 1d |
| F6.2 | Merchant list with status filter, detail, approve/suspend/reactivate | 2d |
| F6.3 | Subscription plan CRUD | 1d |
| F6.4 | Store management across merchants | 1d |

**Verification Gate:** Super admin can manage merchants and plans. Merchant session cannot access admin routes.

---

### Phase F7: Polish and Optimization (Weeks 16–17)

| Task | Details | Est. |
|---|---|---|
| F7.1 | SEO audit — metadata, structured data (Product, Organization, BreadcrumbList) | 2d |
| F7.2 | Accessibility audit — keyboard nav, screen readers, color contrast (WCAG 2.1 AA), ARIA | 2d |
| F7.3 | Performance — lazy loading, enhanced-img, code splitting | 2d |
| F7.4 | Responsive QA — 320px, 768px, 1280px, 1536px | 2d |
| F7.5 | Error handling — 404 pages, error boundaries, API error states, loading skeletons | 2d |
| F7.6 | RTL layout support for Arabic | 2d |
| F7.7 | Merchant theme WCAG contrast validation — warn if primary-on-surface fails 4.5:1 | 1d |

**Verification Gate:** Lighthouse 90+ on Performance, Accessibility, SEO. All pages correct on all breakpoints.

---

### Phase F8: i18n and Launch Readiness (Weeks 18–19)

| Task | Details | Est. |
|---|---|---|
| F8.1 | Extract all strings to Paraglide message catalogs (en, ar) | 3d |
| F8.2 | Locale routing + language switcher | 1d |
| F8.3 | E2E test suite (Playwright) — checkout, order, product CRUD, auth flows | 3d |
| F8.4 | Docker deployment config | 1d |

**Total estimated timeline: ~19 weeks (4.5 months)**

> **Realistic note:** This is a full-time estimate for a solo developer. Buffer 20-30% for unexpected issues. Phases F4+F5 (Merchant Dashboard) are the heaviest — do not underestimate the storefront customizer live preview complexity.

---

## 11. Key Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| App architecture | 2 SvelteKit apps + shared packages | Same framework = shared UI actually works |
| SSR vs SPA | Storefront = SSR (`+page.server.ts`); Dashboard = SPA-like (client load) | SEO for storefront; snappy dashboard |
| Theme system | 3 industry presets (food/clothing/appliances) + merchant token overrides | Different UX patterns, not just colors |
| Dynamic components | `<svelte:component>` registry per themeType | Native Svelte, no framework overhead |
| themeType mutability | Locked after onboarding | Product data fields differ per theme |
| Theming injection | CSS custom properties at `<html>` via `+layout.server.ts` | No build recompilation, no FOUC |
| State management | svelte-query + $state runes + superforms | Right tool per concern, no Zustand needed |
| Component primitives | shadcn-svelte (Radix-based) + Tailwind + shared packages/ui | Accessible, themeable, actually shareable |
| Auth | httpOnly JWT cookies via better-auth | Secure, no token management in JS |
| Route guards | Independent `+layout.server.ts` per role group | Super Admin guard never shares code with Merchant guard |
| i18n | Paraglide JS | Made for SvelteKit, compile-time, zero runtime overhead |
| Mobile-first | Base styles for phone, `min-width` enhancement | 60%+ e-commerce traffic is mobile |
| Dashboard mobile | Hamburger + overlay (not bottom tab bar) | Merchant dashboards are desktop-primary; tab bar is over-engineering |
| Cart merge | Add quantities + flag out-of-stock items | No silent drops, no data loss |
| Live preview | iframe with `?preview=true` mode | Real storefront rendering, not simulation |
| Radius system | All derived from `--radius-base` via calc() | Consistent scaling, no hardcoded values |

---

## 12. Accessibility Requirements

- **WCAG 2.1 AA** compliance for all pages
- All interactive elements keyboard-navigable (Tab, Enter, Escape)
- Focus management in modals, drawers, wizards
- `aria-label` on icon buttons, `aria-live` on dynamic content (cart count, toast)
- Color contrast minimum 4.5:1 normal text, 3:1 large text
- **Merchant theme validation:** Warn in branding editor if custom primary color fails contrast against surface
- Skip-to-content link on every page
- Screen reader announcements for status changes

---

## 13. Performance Budgets

| Metric | Target | Tool |
|---|---|---|
| First Contentful Paint (FCP) | < 1.5s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Time to Interactive (TTI) | < 3.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| Storefront homepage JS | < 120KB gzipped | Vite bundle analyzer |
| Dashboard initial load JS | < 180KB gzipped | Vite bundle analyzer |
| API response time (p95) | < 300ms | Backend metrics |

> Storefront target lowered vs v1 (150KB → 120KB) — SvelteKit ships less JS than Next.js by default.

---

## 14. File Structure Reference

```
apps/
  storefront/
    src/
      routes/
        [locale]/
          (public)/
            +page.svelte              # Home (dynamic sections)
            +page.server.ts
            products/
              +page.svelte            # Product listing
              [slug]/+page.svelte     # Product detail
            categories/
              [slug]/+page.svelte
            cart/+page.svelte
            about/+page.svelte
          (auth)/
            login/+page.svelte
            register/+page.svelte
            verify-email/+page.svelte
            forgot-password/+page.svelte
            reset-password/+page.svelte
          (customer)/
            +layout.server.ts         # Auth guard
            account/+page.svelte
            account/orders/+page.svelte
            account/orders/[id]/+page.svelte
            account/profile/+page.svelte
            account/addresses/+page.svelte
            account/wishlist/+page.svelte
            account/reviews/+page.svelte
          checkout/
            shipping/+page.svelte
            payment/+page.svelte
            confirm/+page.svelte
          order-confirmed/[id]/+page.svelte
      lib/
        components/                   # Storefront-specific components
        server/                       # Server-side API client
        stores/                       # $state stores
      hooks.server.ts                 # Auth + locale detection
    svelte.config.js
    tailwind.config.ts

  dashboard/
    src/
      routes/
        (auth)/
          login/+page.svelte
          forgot-password/+page.svelte
          reset-password/+page.svelte
          invite/[token]/+page.svelte
        (merchant)/
          +layout.server.ts           # Merchant auth guard
          dashboard/+page.svelte
          dashboard/products/+page.svelte
          dashboard/products/new/+page.svelte
          dashboard/products/[id]/+page.svelte
          dashboard/categories/+page.svelte
          dashboard/orders/+page.svelte
          dashboard/orders/[id]/+page.svelte
          dashboard/customers/+page.svelte
          dashboard/customers/[id]/+page.svelte
          dashboard/settings/general/+page.svelte
          dashboard/settings/storefront/+page.svelte
          dashboard/settings/branding/+page.svelte
          dashboard/settings/shipping/+page.svelte
          dashboard/settings/tax/+page.svelte
          dashboard/settings/staff/+page.svelte
          dashboard/coupons/+page.svelte
          dashboard/reviews/+page.svelte
          dashboard/modifiers/+page.svelte
        (superadmin)/
          +layout.server.ts           # Super Admin auth guard (independent)
          admin/+page.svelte
          admin/merchants/+page.svelte
          admin/merchants/[id]/+page.svelte
          admin/plans/+page.svelte
          admin/stores/+page.svelte
      lib/
        components/                   # Dashboard-specific components
        server/                       # Server-side API client
      hooks.server.ts
    svelte.config.js
    tailwind.config.ts

packages/
  ui/
    src/
      themes/                         # Theme presets + registry
      tokens/                         # Design tokens
      primitives/                     # Atomic Svelte 5 components
      composites/                     # Composed components
      patterns/                       # Layout patterns
    tailwind.config.ts                # Shared Tailwind preset
    package.json
  shared-types/
    src/
      schemas/                        # Zod schemas (shared with backend)
      types/                          # TypeScript types
  shared-utils/
    src/
      format/                         # Price, date formatting
      validate/                       # Shared validators
```
