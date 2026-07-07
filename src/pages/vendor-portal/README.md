# Sosika Vendor Portal: Operational Console & Feature Catalog

Welcome to the **Sosika Vendor Portal** documentation. This document provides a comprehensive operational overview of the vendor onboarding steps, the core features of the vendor dashboard, the premium feature-gating design, and the Google Play Billing model. It is designed to equip our marketing team with the technical and value-proposition details needed to pitch Sosika to prospective food vendors.

---

## 1. Executive Summary & Value Proposition

The **Sosika Vendor Portal** is a modern, high-performance web interface (integrated as a Progressive Web App/Trusted Web Activity) that empowers local restaurant owners ("vendors") to list their menus, customize their digital shopfronts, and manage customer orders in real-time. 

### Key Marketing Hooks:
* **Hyper-Local Onboarding:** Integrated map-pinning ensures instant registration with pinpoint accuracy for delivery range calculations.
* **Frictionless Mobile-First Management:** Designed for busy kitchens; accessible on cheap smartphones with responsive layouts.
* **Instant Order Alerts:** SMS notifications notify vendors of new orders instantly, minimizing preparation delays.
* **Actionable Performance Insights:** Unlocked dashboards detailing sales trends, popular items, and total revenue.

---

## 2. Step-by-Step Vendor Onboarding Flow

Onboarding is designed as an interactive, multi-step wizard (`vendor-onboarding.tsx`) to guide new partners from account creation to active status:

| Step | Phase | Details & Required Inputs | Marketing Angle |
| :--- | :--- | :--- | :--- |
| **Step 0** | **Welcome** | Simple welcome screens introducing the portal's terms. | Zero-friction starting point. |
| **Step 1** | **Partner Profile** | Owner/Manager Full Name, Email, Password, and Phone Number. | Instant secure account generation. |
| **Step 2** | **Spot Customization** | Spot (Restaurant) Name, cover banner image, description, average preparation time (ETA), and cuisine tags (e.g., *Breakfast*, *Lunch*, *Dinner*, *Drinks*). | Personalize their digital identity to attract students. |
| **Step 3** | **Physical Location** | Map location input using the Google Maps Geocoder API. Registers exact Latitude and Longitude coordinates. | Ensures distance-based delivery calculations are 100% accurate. |
| **Step 4** | **Review & Launch** | Final overview screen displaying the compiled profile, cover photo, location coordinates, and operational terms. | Full preview control before going live. |
| **Step 5** | **Success Queue** | The account enters a `pending_verification` state for administrator review before displaying on the customer app. | Ensures portal safety and high-quality partner listings. |

---

## 3. Core Dashboard Modules (`dashboard.tsx`)

Once approved, vendors log into the **Sosika Vendor Console**, featuring 4 key navigation panels:

### A. Live Orders Console (`orders`)
The central hub for kitchen operations. It tracks order fulfillment status:
* **Pending Orders:** Incoming requests. Vendors review items, subtotals, and can Accept or Reject them.
* **Preparing Orders:** Active orders in the kitchen. Once cooked, vendors mark them as Ready.
* **Out for Delivery:** Dispatched orders. Displays driver/rider assignment (Rider ID) and delivery state.
* **Completed Orders:** Past order logs for receipt reconciliation.

### B. Menu Catalogue View (`menu`)
Allows absolute control over the kitchen menu:
* Add new dishes with title, description, price (TZS), and images.
* Edit existing pricing or descriptions instantly.
* **Stock Toggles:** Instantly mark items as "In Stock" or "Out of Stock" to avoid customer disappointment.

### C. Store Settings (`profile`)
Direct control over digital storefront configurations:
* **Open/Closed Switch:** Instantly toggle operational status (`is_open`) to pause or resume customer ordering streams.
* Adjust kitchen ETA, edit descriptions, or update the cover banner image.

### D. Help & Support View (`support`)
Customer success and support integration:
* Submit support tickets directly to the Firestore backend (`supportTickets` collection).
* Direct click-to-action buttons redirecting vendors to WhatsApp chat, direct phone call, or email support with the Sosika Administrator team.

---

## 4. Premium Subscription & Feature Gating

Sosika offers a freemium tiering system to drive platform monetization. Premium status can be unlocked system-wide or enabled modularly:

| Feature / Benefit | Free Tier | Premium Tier | Marketing Benefit |
| :--- | :--- | :--- | :--- |
| **Customer Contact Info** | Masked phone numbers (`🔒 Premium Feature`) | Fully unlocked phone numbers (`+255...`) | Direct contact with customers in case of order adjustments. |
| **Delivery Maps & Routing** | Coordinates and maps are hidden | Full interactive Google Maps routing and location coordinates | Smooth handoffs to local drivers/bodabodas. |
| **Store Analytics** | Blocked via Blurry Glass UI overlay | Unlocked dashboard showing Total Orders, Revenue (TZS), and Sales Charts | Data-driven menu pricing and optimization. |
| **SMS Notifications** | Manual console monitoring required | Automated instant SMS alerts via Meseji API for every order | Zero missed orders, faster preparation times. |
| **Store Verification Badge** | Standard storefront | "Premium Partner" badge on customer-facing profiles | Increases brand trust and conversion rate. |

---

## 5. Google Play Billing & Upgrade Mechanics (`usePlayBilling.ts`)

Premium upgrades are handled securely on mobile devices:
1. **Google Digital Goods API:** The console detects if it is running inside our Android Trusted Web Activity (TWA) wrapper.
2. **PaymentRequest API Overlay:** If supported, the console triggers a native Google Play billing checkout window displaying the subscription price.
3. **Secure Verification:** Upon payment approval, a secure Firebase Cloud Function (`verifyVendorSubscription`) queries the Google Play Developer API with the purchase token, validates payment success, and updates the vendor's Firestore record.
4. **Fallback Instructions:** If the vendor is accessing the console via standard web browsers (Safari, Chrome), the portal detects lack of API support and displays clear instructions pointing them to our Native Android App's subscription settings page.

---

## 6. Marketing Team Key Takeaways

Use these key benefits when onboarding new restaurants:
* **"Never Miss an Order:"** Highlight the **Premium SMS Alert** feature. Let vendors know they don't need to stare at a screen; their phone will buzz when an order drops.
* **"Data-Driven Growth:"** Pitch the **Premium Analytics Suite**. Tell them they can see which of their meals are bestsellers and analyze peak revenue hours.
* **"Zero Friction Setup:"** The geocoding wizard makes setting up delivery ranges simple. If they can pin their location on WhatsApp, they can register on Sosika.
* **"Safe & Secure Payments:"** Reassure them that premium subscription handling is processed safely through the official Google Play Store Billing framework.
