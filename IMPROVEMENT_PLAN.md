# Rudra-Ayurved Improvement Plan

This document outlines the plan to improve the security, code quality, performance, and testing of the `rudra-ayurved` application.

## 1. Security

### 1.1. Address Dependency Vulnerabilities

*   **Status:** Pending
*   **Details:** The project has critical and high vulnerabilities in `jspdf`, `next`, and `preact`. `hono` and `lodash` are also reported as vulnerable.
*   **Action:**
    1.  Attempt to fix vulnerabilities using `npm audit fix`.
    2.  If `npm audit fix` is not sufficient, use `npm overrides` in `package.json` to force secure versions of transitive dependencies, as detailed in `SECURITY_VULNERABILITY_PLAN.md`.
    3.  Verify the fixes by running `npm audit`.
    4.  Document the outcome.

## 2. Code Quality & Maintainability

### 2.1. Enforce Linting

*   **Status:** Pending
*   **Details:** ESLint errors are currently ignored during the build process.
*   **Action:**
    1.  In `next.config.ts`, set `ignoreDuringBuilds` to `false` within the `eslint` configuration.
    2.  Run `npm run lint` to identify all linting errors.

### 2.2. Fix Linting Errors

*   **Status:** Pending
*   **Details:** There are multiple linting errors, including improper use of `<a>` tags, unescaped JSX characters, and missing `useEffect` dependencies.
*   **Action:**
    1.  Incrementally fix all reported linting errors. This might involve:
        *   Replacing `<a>` tags with Next.js `<Link>` components for internal navigation.
        *   Fixing JSX syntax.
        *   Adding missing dependencies to `useEffect` dependency arrays.
    2.  Run `npm run lint` after each fix to ensure it is resolved.

### 2.3. Refactor Large Components

*   **Status:** Pending
*   **Details:** `app/pharmacy/PharmacyClient.tsx` and `app/patients/[id]/page.tsx` are too large.
*   **Action:**
    1.  Analyze `app/pharmacy/PharmacyClient.tsx` and identify sections that can be extracted into smaller, reusable components.
    2.  Refactor `app/pharmacy/PharmacyClient.tsx`.
    3.  Analyze `app/patients/[id]/page.tsx` and extract components.
    4.  Refactor `app/patients/[id]/page.tsx`.

### 2.4. Remove Hardcoded Values

*   **Status:** Pending
*   **Details:** Hardcoded values like appointment fees should be dynamic.
*   **Action:**
    1.  Identify hardcoded values in the codebase.
    2.  Modify the Prisma schema to include fields for these values.
    3.  Update the UI to fetch and display these values from the database.

## 3. Performance

### 3.1. Optimize Data Fetching

*   **Status:** Pending
*   **Details:** The patient detail page uses client-side data fetching.
*   **Action:**
    1.  Refactor `app/patients/[id]/page.tsx` to use server-side data fetching (e.g., `getServerSideProps` or React Server Components) for the initial data load.

### 3.2. Optimize Images

*   **Status:** Pending
*   **Details:** The landing page uses standard `<img>` tags.
*   **Action:**
    1.  Replace `<img>` tags in `app/page.tsx` with the Next.js `<Image>` component.

### 3.3. Implement Real-time Updates

*   **Status:** Pending
*   **Details:** The dashboard uses polling.
*   **Action:**
    1.  This is a larger task. For now, we will note it as a future improvement. The recommendation is to consider WebSockets.

## 4. Testing

### 4.1. Introduce a Testing Strategy

*   **Status:** Pending
*   **Details:** The project has no automated tests.
*   **Action:**
    1.  Install and configure a testing framework like Jest and React Testing Library.
    2.  Write initial unit tests for a critical component to establish a pattern.
