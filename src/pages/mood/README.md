# Mood-Based Recommendation Feature

This directory contains the implementation of the mood-based recommendation feature for Sosika. It allows users to discover food based on their current mood, craving, or time of day, and their location.

## Feature Flow

The user journey is divided into three main steps:

1.  **Mood Selection (`/mood`):** The user is presented with a screen to select their "mood". This can be a pre-defined option (e.g., "Breakfast", "Lunch", "Snack") or a custom-entered craving. The component `MoodSelection.tsx` handles this logic.

2.  **Location Selection (`/mood/location`):** After selecting a mood, the user is prompted to specify their location. The `LocationSelection.tsx` component provides several ways to do this:
    *   **Search:** An autocomplete search bar to find a specific place or address.
    *   **Geolocation:** A button to automatically detect and use the user's current location.
    *   **Map Interaction:** Tapping directly on the map to select a location.
    *   **Recent Locations:** A list of recently used locations for quick access.

3.  **Results Display (`/mood/results`):** The final step is the `ResultsPage.tsx` component, which fetches and displays a curated list of menu items and vendors that match the user's selected mood and location. The results are grouped into logical sections like "Featured for You", "Popular Choices", "Budget Friendly", and by vendor.

## Components

*   **`MoodSelection.tsx`:** The entry point of the feature. It allows users to select a mood and navigates them to the location selection screen.
*   **`LocationSelection.tsx`:** Handles all aspects of location selection, including map interaction, search, and geolocation.
*   **`ResultsPage.tsx`:** Displays the final list of recommended menu items and vendors. It includes sub-components for rendering the different sections and individual item cards.
*   **`api/mockApi.tsx`:** Contains the mock API for fetching mood-based results. It simulates fetching data from a backend and includes logic for filtering vendors by location and menu items by category.
*   **`data/MockData.ts`:** Provides the sample data for vendors and menu items used by the mock API.
*   **`types/types.ts`:** Defines the TypeScript types for the `Vendor` and `MenuItem` data structures.

## Data Flow

1.  The `useMood` hook (likely a Zustand store) is used to store the selected mood and make it available across the different components.
2.  The `useLocationStorage` hook is used to persist and retrieve the user's location history from local storage.
3.  On the `ResultsPage.tsx`, the `fetchMoodResults` function is called with the selected mood and location.
4.  `fetchMoodResults` filters the `vendors` from `MockData.ts` based on proximity and then filters the `menuItems` based on the vendor and the mood-to-category mapping.
5.  The filtered data is then returned to the `ResultsPage.tsx` and rendered.

## Recent Improvements (as of January 2026)

The feature has undergone a recent overhaul to improve its user interface, user experience, and performance.

### UI/UX Enhancements

*   **`MoodSelection.tsx`:**
    *   Redesigned with a more modern and visually appealing layout, including a background gradient and improved spacing.
    *   Enhanced with more engaging micro-interactions and animations using `framer-motion`.
    *   Improved visual hierarchy and a more prominent headline.

*   **`LocationSelection.tsx`:**
    *   Added a "Use My Location" button for automatic geolocation, which was a significant UX improvement.
    *   Restructured the layout to group primary actions and make the flow more intuitive.
    *   Refined the design to be consistent with the new `MoodSelection` screen.

### Performance Optimizations

*   **`ResultsPage.tsx`:**
    *   **Memoization:** The `groupedItems` object is now memoized using `useMemo` to prevent expensive recalculations on every render.
    *   **Lazy Image Loading:** A custom `LazyImage` component has been implemented to show a placeholder while images are loading, improving perceived performance and user experience.
