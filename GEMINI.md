# Project Sosika: Architecture & Improvements

This document provides a high-level overview of the Sosika project's architecture, the current development focus, and a list of potential improvements.

## Current Focus: Mood-Based Recommendation Feature

The immediate priority is to enhance the existing mood-based recommendation feature, which is currently in production. This feature allows users to discover food based on their mood and location.

### Feature Flow:

1.  **Mood Selection (`/mood`):** Users select a mood (e.g., "Breakfast", "Lunch") or enter a custom craving.
2.  **Location Selection (`/mood/location`):** Users select their location using a map or search.
3.  **Results (`/mood/results`):** The application displays a curated list of menu items from nearby vendors that match the user's mood.

### Areas for Improvement:

*   **UI/UX:** Refine the user interface and experience of the entire flow to make it more intuitive and visually appealing.
*   **Performance:** Optimize the performance of the feature, especially the data fetching and rendering of the results page.

## Architecture Overview

Sosika is a modern, client-side, single-page web application (SPA) built as a Progressive Web App (PWA).

*   **Framework:** React with TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS with a custom theme.
*   **Routing:** React Router (`react-router-dom`)
*   **State Management:** Zustand and React Context
*   **Backend Services:** Firebase (Authentication, Firestore, etc.)
*   **Key Features:**
    *   Location-based services (Google Maps, Leaflet)
    *   Push notifications
    *   Fuzzy search (`fuse.js`)
    *   Rich UI with custom components and Radix UI.

The project follows a standard React project structure, with a clear separation of concerns between components, pages, hooks, services, and context.

## Potential Improvements (Second Priority)

The following are potential areas for improvement to be addressed after the current development priorities are completed.

*   **Code Splitting:** Implement explicit route-level code splitting with `React.lazy` and `Suspense` to improve initial load times.
*   **Image Optimization:** Optimize images in `public/images` by using modern formats (e.g., WebP) and appropriate resizing.
*   **State Management Consolidation:** Consolidate state management to either Zustand or React Context for better consistency.
*   **Accessibility (a11y):** Conduct a full accessibility audit and implement improvements to ensure WCAG compliance.
*   **Testing:** Introduce a testing framework (e.g., Vitest, React Testing Library) and write unit and integration tests for critical components and logic.