# Sosika App Behavior Report for Tracking and Data Collection

## Purpose

This report explains how the current Sosika frontend works so a tracking plan can be designed against the real runtime behavior, not just the file tree.

The key finding is that the repository contains both:

- A currently active mood-based discovery app flow
- A larger set of older auth, profile, vendor, order, and recommendation pages that still exist in the codebase but are mostly not mounted in the live router

For tracking work, treat the mood flow, vendor menu page, cart/checkout flow, and admin dashboard as the primary live surfaces.

## High-Level Architecture

- Framework: React 18 + TypeScript
- Build tool: Vite
- Routing: `react-router-dom`
- Styling/UI: Tailwind CSS, Radix UI, Framer Motion
- State:
  - Zustand for selected mood
  - React Context for cart state
  - localStorage for session-like persistence and caching
- Backend/data:
  - Firebase Analytics
  - Firebase Firestore
  - Firebase Cloud Messaging
  - Google Maps Places + Maps JS
  - Mapbox in older/legacy parts
  - EmailJS for checkout notifications
  - Cloudinary for admin image uploads
  - A legacy REST backend at `VITE_API_URL` / `https://sosika-backend.onrender.com`
- PWA: enabled through `vite-plugin-pwa`

## Boot Sequence

### `src/main.tsx`

On app startup:

1. Global CSS is loaded.
2. The stored theme is applied from localStorage.
3. Firebase Analytics logs `app_open`.
4. React renders the app inside `CartProvider`.

### `src/App.tsx`

The app wraps the UI with:

- `HelmetProvider`
- `MapProvider`
- another `CartProvider`
- React Router
- `TooltipProvider`
- `PageWrapper`

Notes:

- There are two nested `CartProvider`s: one in `src/main.tsx` and another in `src/App.tsx`.
- The inner provider is the one actually used by routed pages/components.
- `App.tsx` also logs a `session_duration` analytics event on `beforeunload`.

## Active Routes

The live router currently exposes these routes:

- `/` -> `MoodSelection`
- `/mood` -> `MoodSelection`
- `/mood/location` -> `LocationSelection`
- `/mood/results` -> `ResultsPage`
- `/vendor/:vendorId/menu` -> `VendorMenuPage`
- `/admin` -> `AdminDashboard`

Important:

- Many older routes still have page files, but are commented out in `src/App.tsx`.
- Those dormant routes include login, register, explore, profile, orders, vendor registration, vendor profile, vendor orders, order tracking, forgot/reset password, waitlist, and others.

For tracking, separate events into:

- `active_prod_flows`
- `legacy_or_disabled_flows`

## Main Live User Journey

## 1. Mood Selection

File: `src/pages/mood/MoodSelection.tsx`

Behavior:

- User lands on the mood picker.
- The app computes a time-based default set of mood options:
  - Breakfast in morning
  - Lunch midday
  - Dinner later
  - plus Drink, Snack, Nearby
- User can also type a custom mood.
- Selected mood is stored in Zustand via `useMood`.
- After a 300ms delay, navigation moves to `/mood/location`.

Data/state touched:

- In-memory Zustand state only
- No persistence to localStorage here

Tracking implications:

- This is the first real intent capture point.
- Strong events here:
  - page_view: mood_selection
  - mood_selected
  - custom_mood_submitted

## 2. Location Selection

File: `src/pages/mood/LocationSelection.tsx`

Behavior:

- Loads Google Maps through `MapProvider`.
- Lets user choose location through:
  - Places autocomplete search
  - browser geolocation
  - direct map click
  - recent stored places
- Reverse geocodes coordinates to a human-readable address.
- Saves confirmed location with `useLocationStorage`.
- Then:
  - normal flow -> navigates to `/mood/results`
  - offer flow -> runs checkout immediately, then returns home

Persistence:

- Saves up to 3 recent locations in localStorage key `sosika_locations`

Tracking implications:

- This is the first explicit location-consent and location-resolution step.
- Good events:
  - location_screen_viewed
  - location_autocomplete_used
  - location_geolocate_clicked
  - location_geolocate_success
  - location_geolocate_failed
  - location_map_selected
  - location_recent_selected
  - location_confirmed

Recommended event properties:

- source: `autocomplete | geolocation | map | recent`
- lat/lng rounded or geohashed, not exact raw coordinates in analytics
- address_present: boolean
- has_recent_locations: boolean

## 3. Mood Results

Files:

- `src/pages/mood/ResultsPage.tsx`
- `src/pages/mood/api/mood-api.tsx`

Behavior:

1. Reads:
   - selected mood from Zustand
   - latest saved location from `sosika_locations`
2. Calls `fetchMoodResults({ mood, location })`
3. `fetchMoodResults`:
   - fetches all documents from Firestore collection `vendors`
   - filters vendors within 100 km of the selected location
   - maps the mood to allowed menu categories
   - fetches matching `menuItems` for nearby vendors from Firestore
   - filters menu items client-side by category
4. `ResultsPage` renders vendor cards and navigates to vendor menu on click.

Important implementation detail:

- The results page currently fetches all vendors, then fetches menu items for nearby vendors, then filters client-side.
- It stores both `vendors` and `menuItems`, but UI mainly presents vendor cards rather than individual menu items.

Tracking implications:

- This is the main recommendation/discovery surface.
- Good events:
  - mood_results_requested
  - mood_results_loaded
  - mood_results_empty
  - vendor_card_impression
  - vendor_card_clicked

Recommended properties:

- mood
- location_bucket
- vendor_count
- menu_item_count
- fetch_duration_ms
- selected_vendor_id
- selected_vendor_name
- vendor_position
- distance_km_bucket

## 4. Vendor Menu Page

File: `src/pages/vendor/MenuPage.tsx`

Behavior:

- Loads one vendor document from Firestore
- Loads all `menuItems` for that vendor from Firestore
- Groups menu items by category
- Supports:
  - search filtering
  - category tab scrolling
  - switching between Menu and Reviews tabs
- Users can add items to cart
- Users can read and submit reviews

Review behavior:

- Reviews are stored in Firestore collection `reviews`
- `addReview` runs a Firestore transaction that:
  - creates the review
  - updates `ratingCount` and `averageRating` on the target vendor/menu item

Tracking implications:

- This is the deepest live engagement page.
- Good events:
  - vendor_menu_viewed
  - vendor_menu_loaded
  - vendor_menu_search
  - vendor_category_selected
  - menu_item_add_to_cart
  - reviews_tab_opened
  - review_submitted

Recommended properties:

- vendor_id
- vendor_name
- menu_item_count
- category_count
- search_term_length
- search_results_count
- item_id
- item_name
- item_category
- item_price
- quantity
- review_rating

## 5. Cart and Checkout

Files:

- `src/context/cartContext.tsx`
- `src/hooks/useCart.ts`
- `src/components/my-components/CartDrawer.tsx`
- `src/components/my-components/navbar.tsx`

Behavior:

- Cart state is maintained in React state and persisted to localStorage key `cart`
- Cart drawer is opened from the bottom navbar
- Cart totals are recalculated when cart or location changes
- Delivery fee is computed from:
  - user location from `sosika_locations`
  - vendor geolocation from Firestore
  - distance formula
  - fee rule roughly `ceil(distance_km * 1200)` rounded up to nearest 100 TZS

Checkout flow:

1. User clicks checkout in `CartDrawer`
2. `useCart.checkout()` opens a SweetAlert phone prompt
3. Phone is stored in localStorage key `guestPhone`
4. Existing analytics logs `reached_checkout`
5. Order is written directly from frontend to Firestore collection `orders`
6. Firestore document is then updated so `orderId` equals the generated document id
7. EmailJS sends an admin notification email
8. Success modal is shown and cart is cleared

Order document fields written by the client include:

- `userId`
- `phone`
- `cart`
- `subtotal`
- `deliveryFee`
- `totalAmount`
- `orderId`
- `displayLocation`
- `locationCoords`
- `rawCoordinates`
- `timestamp`
- `status`
- `riderId`
- `assignedAt`
- `pickedUpAt`
- `deliveredAt`
- `paymentStatus`

Tracking implications:

- This is the strongest conversion funnel in the app.
- Good events:
  - cart_opened
  - cart_item_added
  - cart_item_removed
  - cart_quantity_changed
  - checkout_started
  - checkout_phone_prompt_shown
  - checkout_phone_entered
  - checkout_cancelled
  - order_create_started
  - order_create_succeeded
  - order_create_failed
  - email_notification_sent

Recommended properties:

- cart_item_count
- cart_subtotal
- delivery_fee
- total_amount
- vendor_id
- location_present
- user_type: `guest | logged_in`
- order_id

## 6. Admin Dashboard

Files:

- `src/pages/admin/Dashboard.tsx`
- `src/components/my-components/AdminLogin.tsx`

Behavior:

- `/admin` is protected only by a frontend username/password check against env vars
- Once authenticated in-memory, admin can:
  - create vendor documents in Firestore
  - create menu item documents in Firestore
  - bulk upload menu items from JSON
  - upload images to Cloudinary

Tracking implications:

- Admin behavior should be tracked separately from user analytics.
- Good events:
  - admin_login_attempt
  - admin_login_success
  - vendor_created
  - menu_item_created
  - menu_items_bulk_uploaded
  - cloudinary_upload_started
  - cloudinary_upload_succeeded
  - cloudinary_upload_failed

## Data Sources and Integrations

## Firebase

File: `src/firebase.ts`

Used for:

- Analytics
- Firestore
- Auth provider setup
- Messaging

Current analytics usage is minimal:

- `app_open`
- `session_duration`
- `reached_checkout`

## Firestore Collections Observed

- `vendors`
- `menuItems`
- `reviews`
- `orders`

## Google Maps

Used in the live mood location flow:

- Maps JS
- Places Autocomplete
- AdvancedMarker
- Geocoder

Env vars:

- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_GOOGLE_MAPS_MAP_ID`

## Firebase Cloud Messaging

Files:

- `src/services/push-notifications.tsx`
- `src/push-notifications.ts`
- `public/firebase-messaging-sw.js`

Notes:

- Push setup exists but is commented out in `src/App.tsx`, so it is not part of the live app boot path.
- The service worker contains hardcoded Firebase config values.
- If push tracking is added, first confirm which push flow is actually intended to be active.

## EmailJS

Used during checkout to notify admin after order creation.

Env vars:

- `VITE_EMAILJS_USER_ID`
- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`

## Cloudinary

Used only in admin vendor/menu item creation.

Env vars:

- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

## Legacy REST Backend

Observed across older pages:

- auth
- orders
- vendor profile
- vendor registration
- recommendations
- location update

These pages still make calls to:

- `VITE_API_URL`
- `https://sosika-backend.onrender.com`

But most of these flows are not currently routed in the live app.

## Local Storage and Client Persistence

High-value localStorage keys:

- `cart`
- `sosika_locations`
- `guestPhone`
- `authToken`
- `userId`
- `email`
- `vendorId`
- `password` (legacy, from older register/login flow)
- `theme`
- `fcmToken`
- `selectedLocation` (older component)
- `menu_cache` (legacy explore page)

Tracking notes:

- Several keys belong to legacy flows and should not be assumed active.
- `password` in localStorage is a security concern and should never be used for analytics.
- `rawCoordinates` in order payloads is highly sensitive and should not be copied into analytics as-is.

## Current Tracking State

The app is not comprehensively instrumented.

Current explicit event coverage:

- `app_open` on startup
- `session_duration` on tab unload
- `reached_checkout` during checkout

What is not currently covered well:

- route/page views
- mood selection funnel
- location selection method
- vendor impressions/clicks
- search behavior
- add-to-cart interactions
- checkout drop-off points
- review submission outcomes
- admin content operations

## Legacy / Dormant Code Areas

These files still exist and may matter later, but are not currently part of the mounted app router:

- `src/pages/login.tsx`
- `src/pages/register.tsx`
- `src/pages/orders.tsx`
- `src/pages/profile.tsx`
- `src/pages/vendorRegistration.tsx`
- `src/pages/vendor/profile.tsx`
- `src/pages/vendor/orders.tsx`
- `src/pages/vendor/menuItems.tsx`
- `src/pages/forgot-password.tsx`
- `src/pages/reset-password.tsx`
- `src/pages/waitlist.tsx`
- `src/pages/explore.tsx`
- `src/components/my-components/recommendationCard.tsx`
- several older map/order/location components

These older flows use:

- backend REST endpoints
- additional caching in localStorage
- notification handlers
- profile/order management logic

Recommendation:

- Do not mix tracking schemas for active and inactive flows.
- Create a current-state tracking plan first, then separately decide whether to revive and instrument legacy flows.

## Risks and Implementation Notes Relevant to Tracking

## 1. Firestore Rules in Repo Are Fully Open

File: `src/pages/mood/firestore.rules`

The checked-in rules allow read/write `if true` for vendors, menuItems, reviews, and orders.

That matters because:

- client writes are trusted heavily
- analytics data should not be treated as authoritative business data

## 2. Admin Auth Is Client-Side Only

Admin login checks env values in the browser and keeps auth state only in component state.

Tracking should identify admin events clearly and avoid mixing them with customer funnels.

## 3. Some Sensitive Data Is Stored or Sent From Client

Examples:

- guest phone number
- exact location coordinates
- rawCoordinates on orders
- legacy password storage

Tracking design should minimize or hash/redact sensitive data.

## 4. Mixed Architecture

The repo currently mixes:

- direct Firestore reads/writes
- frontend-only admin operations
- legacy REST API flows
- legacy and current map providers

This makes it important to define one canonical user identity model before adding deep analytics.

## Best Tracking Insertion Points

If Gemini is going to help implement efficient tracking, these are the cleanest code points to instrument first:

1. `src/main.tsx`
   - app bootstrap
   - session init
2. `src/App.tsx`
   - route change/page view tracking
   - session lifecycle
3. `src/pages/mood/MoodSelection.tsx`
   - intent selection
4. `src/pages/mood/LocationSelection.tsx`
   - location source and confirmation
5. `src/pages/mood/ResultsPage.tsx`
   - recommendation request/load/impression/click
6. `src/pages/vendor/MenuPage.tsx`
   - vendor engagement, search, review activity
7. `src/hooks/useCart.ts`
   - cart mutations, checkout funnel, order creation
8. `src/pages/admin/Dashboard.tsx`
   - admin-side content operations

## Suggested Event Taxonomy Starter

Recommended first-pass event groups:

- `app_*`
- `page_*`
- `mood_*`
- `location_*`
- `results_*`
- `vendor_*`
- `cart_*`
- `checkout_*`
- `order_*`
- `review_*`
- `admin_*`

Example starter event names:

- `page_view`
- `mood_selected`
- `location_confirmed`
- `results_loaded`
- `vendor_opened`
- `menu_item_added`
- `cart_opened`
- `checkout_started`
- `checkout_cancelled`
- `order_created`
- `review_submitted`
- `admin_vendor_created`

## Recommended Tracking Dimensions

Useful common properties:

- `session_id`
- `user_id` if available
- `user_type`
- `route`
- `referrer_route`
- `mood`
- `location_source`
- `vendor_id`
- `vendor_name`
- `item_id`
- `item_category`
- `item_price`
- `cart_value`
- `order_id`
- `result_count`
- `position_index`
- `success`
- `error_code`
- `duration_ms`

Sensitive values to avoid sending raw where possible:

- exact phone number
- exact full address
- exact raw coordinates
- stored password

## Final Summary

The app currently behaves like a location-based food discovery and ordering PWA built mainly on Firebase, with the active production path centered on:

1. mood selection
2. location selection
3. nearby vendor discovery
4. vendor menu browsing
5. cart and direct Firestore checkout

The repository also contains a substantial older product surface using REST endpoints, but most of it is not currently mounted in the router.

For efficient tracking work, Gemini should focus first on the active mood flow, vendor menu engagement, cart mutations, checkout funnel, and admin content operations, while treating legacy auth/order/profile code as a separate secondary scope.
