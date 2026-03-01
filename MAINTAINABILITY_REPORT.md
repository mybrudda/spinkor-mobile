# Spinkor — Maintainability Report

**Generated:** February 27, 2026 · **Last updated:** February 27, 2026  
**Project:** Spinkor (React Native / Expo marketplace app)  
**Tech Stack:** React Native 0.81.4 · Expo SDK 54 · Expo Router v6 · Supabase · Zustand · TypeScript (strict)

---

## Table of Contents

1. [Priority & Effort Definitions](#priority--effort-definitions)
2. [Quick Wins — Start Here](#quick-wins--start-here)
3. [Critical](#critical)
4. [Important](#important)
5. [Recommended](#recommended)
6. [Optional](#optional)
7. [Summary Table](#summary-table)

---

## Priority & Effort Definitions

### Priority

| Priority | Meaning |
|---|---|
| **Critical** | Actively causes bugs, data loss, security exposure, or makes the codebase unsafe to change. Address immediately. |
| **Important** | Causes significant developer friction, hidden bugs, or technical debt that compounds over time. Address in the near term. |
| **Recommended** | Reduces duplication, improves readability, and makes future changes safer. Address during normal development cycles. |
| **Optional** | Low-risk polish items that improve consistency and long-term health. Address opportunistically. |

### Effort

| Effort | Meaning |
|---|---|
| **Trivial** | A single-line or single-file change. Under 5 minutes. No risk of breakage. |
| **Easy** | A few targeted edits across 1–3 files. Under 30 minutes. Mechanical and low-risk. |
| **Medium** | Requires understanding a non-trivial flow, touching 3–6 files, or some design judgment. 1–4 hours. |
| **Hard** | Requires significant refactoring, architectural decisions, or touches many files. Half a day or more. |

---

## Quick Wins — Start Here

These items are **Trivial** or **Easy** to fix but have a meaningful impact. They are the best place to start — each one can be completed in a single focused session with no risk of breaking other functionality.

| ID | Title | Priority | Effort | Status |
|---|---|---|---|---|
| ~~O-7~~ | ~~Create a `.env.example` file~~ | ~~Optional~~ | ~~**Trivial**~~ | ✅ Done |
| ~~R-7~~ | ~~Rename `FormOptions.tsx` → `FormOptions.ts`~~ | ~~Recommended~~ | ~~**Trivial**~~ | ✅ Done |
| ~~R-9~~ | ~~Remove debug `console.log` statements~~ | ~~Recommended~~ | ~~**Trivial**~~ | ✅ Done |
| ~~R-1~~ | ~~Extract `blurhash` to a shared constant~~ | ~~Recommended~~ | ~~**Easy**~~ | ✅ Done |
| ~~R-2~~ | ~~Extract `POSTS_PER_PAGE` to a shared constant~~ | ~~Recommended~~ | ~~**Easy**~~ | ✅ Done |
| O-3 | Type the NHTSA API response in `useVehicleModels` | Optional | **Easy** |
| O-2 | Replace `useRef<any>` for reCAPTCHA with a proper type | Optional | **Easy** |
| I-3 | Replace `useState<any>` for `currentUser` in `ChatRoom` | Important | **Easy** |
| ~~C-2~~ | ~~Replace hardcoded Supabase URLs with env variable~~ | ~~Critical~~ | ~~**Easy**~~ | ✅ Done |
| C-3 | Replace hardcoded Cloudinary values with env variables | Critical | **Easy** |
| I-7 | Convert `supabaseClient.js` to TypeScript | Important | **Easy** |
| C-4 | Unsubscribe `onAuthStateChange` to prevent memory leak | Critical | **Easy** |
| I-6 | Remove incorrect `getItemLayout` from chat `FlatList` | Important | **Easy** |
| I-8 | Fix N+1 query in `chatService.getMessages` | Important | **Easy** |

---

## Critical

---

### C-1 · Zero Test Coverage

**Priority:** Critical · **Effort:** Hard

**File(s):** Entire codebase  
**Why it matters:** `package.json` configures `jest-expo` and lists `react-test-renderer` as a dev dependency, but there is not a single `.test.ts`, `.test.tsx`, `.spec.ts`, or `__tests__/` file anywhere in the project. The app handles real money-adjacent transactions (marketplace listings), user authentication, real-time chat, and push notifications — all with zero automated verification. Any refactoring, dependency upgrade, or bug fix is done completely blind. A regression in authentication or post creation could go undetected until a user reports it.

**Impact of fixing:** Enables safe refactoring of the large files and duplicated logic identified elsewhere in this report. Provides a regression safety net for every future change.

**Why Hard:** Writing meaningful tests requires understanding every flow, setting up mocks for Supabase and Cloudinary, and making incremental decisions about what to test first. This is ongoing work, not a one-time fix.

**Suggested first steps (start Easy, build up):**
- Unit tests for `utils/format.ts`, `utils/messageUtils.ts`, and `types/forms.ts` (pure functions, zero setup required) — these are **Easy** on their own.
- Integration tests for `lib/savedPostsService.ts` and `lib/chatService.ts` using a Supabase test project or mock.
- Component snapshot/interaction tests for `PostCard`, `ChatMessage`, and `BasePostForm`.

---

### ~~C-2 · Hardcoded Supabase Project URLs in Auth Store~~ ✅ Done

**Priority:** Critical · **Effort:** Easy · **Status: Completed February 27, 2026**

Both hardcoded Edge Function URLs in `store/useAuthStore.ts` have been replaced with template literals that derive the base URL from `EXPO_PUBLIC_SUPABASE_URL`:

```ts
// signUp
`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/register-new-user`

// resetPassword
`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/password-reset`
```

The project reference ID no longer appears in source code. Pointing the app at a different Supabase project now only requires updating the `.env` file.

---

### C-3 · Hardcoded Cloudinary Credentials in Source Code

**Priority:** Critical · **Effort:** Easy

**File(s):** `lib/cloudinary.ts`, `.github/workflows/cleanup-posts-conversations.yml`  
**Why it matters:** The Cloudinary cloud name `"dtac4dhtj"` and upload preset `"Default"` are hardcoded as string literals in `lib/cloudinary.ts`. The same cloud name also appears hardcoded in the GitHub Actions workflow YAML and in a placeholder image URL in `components/chat/ConversationList.tsx`. This means:
- Rotating or changing the Cloudinary account requires hunting down multiple files.
- The cloud name is committed to version control history permanently.
- There is no way to use a different Cloudinary project for development vs. production.

**Impact of fixing:** Centralises all external service configuration in environment variables. Enables environment separation for image storage.

**Why Easy:** Add `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` and `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` to `.env`, replace the 3–4 hardcoded occurrences with `process.env.*` references, and add the cloud name as a GitHub Actions repository variable. Touches 3 files but each change is a one-liner.

---

### C-4 · `onAuthStateChange` Subscription Never Unsubscribed

**Priority:** Critical · **Effort:** Easy

**File(s):** `store/useAuthStore.ts` (`initialize` function)  
**Why it matters:** `supabase.auth.onAuthStateChange(...)` returns an `{ data: { subscription } }` object. The `initialize` function in `useAuthStore` sets up this listener but never calls `subscription.unsubscribe()`. If `initialize` is called more than once (e.g., during hot reload in development, or if the store is re-created), duplicate listeners accumulate. Each listener fires on every auth event, potentially triggering duplicate state updates, redundant Supabase queries, and push token registrations. In production this is a memory leak; in development it causes confusing double-fire behaviour.

**Impact of fixing:** Eliminates a memory leak. Prevents duplicate auth event handling. Makes the auth flow deterministic.

**Why Easy:** Destructure the return value, store the subscription in the Zustand state or a module-level variable, and call `subscription.unsubscribe()` in a cleanup function. A ~5-line change in one file.

---

### C-5 · Push Notification Tap Handler Does Nothing

**Priority:** Critical · **Effort:** Medium

**File(s):** `lib/pushNotificationService.ts` (`handleNotificationResponse`)  
**Why it matters:** When a user taps a push notification, `handleNotificationResponse` is called. The handler reads the notification type (`message` or `post`) and then only calls `console.log` — there is no navigation to the relevant chat room or post detail screen. From the user's perspective, tapping a "You have a new message" notification does nothing. The entire push notification infrastructure (Expo token registration, Supabase RPC to store tokens, Edge Function calls to send notifications) is wasted because the final step — routing the user to the correct screen — is missing.

**Impact of fixing:** Makes push notifications functional as a feature. Directly improves user retention and engagement.

**Why Medium:** The navigation logic itself is straightforward (Expo Router's `router.push`), but `pushNotificationService` is a singleton class that currently has no reference to the router. You need to decide how to inject the router (module-level ref, callback, or a React hook wrapper) and handle the case where the app is cold-started from a notification tap.

---

### C-6 · Data Passed Between Screens as Serialized JSON in Route Params

**Priority:** Critical · **Effort:** Hard

**File(s):** `app/PostDetails.tsx`, `app/ChatRoom.tsx`, `app/(tabs)/create/create-post.tsx`  
**Why it matters:** Complex objects (`Post`, `Conversation`, form data) are serialized with `JSON.stringify` and passed as URL route parameters. This pattern has several failure modes:
- **URL length limits**: Very long post descriptions or many images can exceed URL length limits on some platforms, silently truncating or dropping data.
- **No type safety at the boundary**: The receiving screen must `JSON.parse` and cast the result, bypassing TypeScript's type system entirely.
- **Stale data**: If a post is updated by another user while the current user is viewing it, the detail screen shows the old data because it came from the URL, not a fresh fetch.
- **Fragility**: Any change to the `Post` type requires updating every serialization and deserialization site.

**Impact of fixing:** Eliminates a class of hard-to-debug data inconsistency bugs. Restores type safety at screen boundaries. Enables screens to always show fresh data.

**Why Hard:** The fix requires passing only an ID in the route param and having each destination screen fetch its own data on mount. This touches the navigation call sites, the destination screens' data-fetching logic, and loading state handling — a meaningful refactor across multiple files.

---

## Important

---

### I-1 · `usePostForm` and `usePostUpdate` Share ~60% Duplicated Code

**Priority:** Important · **Effort:** Medium

**File(s):** `lib/hooks/usePostForm.ts`, `lib/hooks/usePostUpdate.ts`  
**Why it matters:** Both hooks implement identical logic for:
- `resizeImage` (copy-pasted function, byte-for-byte identical)
- `handlePickImage` / `handleRemoveImage`
- Form validation (calls the same `validatePostForm` from `types/forms.ts`)
- Cloudinary upload loop

Any bug fix or behaviour change (e.g., changing image resize dimensions, changing the maximum image count) must be applied in two places. The two files have already drifted slightly — `usePostForm` and `usePostUpdate` handle the image array differently in subtle ways that are easy to miss. At 275 + 515 = 790 lines of combined code, roughly 470 lines are duplicated.

**Impact of fixing:** A single bug fix applies everywhere. Reduces the total codebase by ~200–300 lines. Makes image handling behaviour consistent between create and edit flows.

**Why Medium:** The shared logic is clear, but the two hooks diverge in how they manage image state (new images vs. existing images). Extracting shared utilities (e.g., `resizeImage`, `pickImage`) into `utils/imageUtils.ts` is straightforward. Merging the hooks entirely requires more design thought.

---

### I-2 · Three Near-Identical Supabase Query Blocks in Home Screen

**Priority:** Important · **Effort:** Medium

**File(s):** `app/(tabs)/home/index.tsx`  
**Why it matters:** The home feed screen contains three separate, nearly identical Supabase query constructions: `fetchInitialPosts`, `fetchFilteredPosts`, and an inline query inside `handleFilter`. Each one manually builds the same `select`, `eq`, `ilike`, `gte`, `lte`, `range`, and `order` chain. When a new filter field is added, it must be added to all three locations. When the post schema changes (e.g., a column is renamed), all three must be updated. This is the most common source of subtle filter bugs — a condition present in `fetchFilteredPosts` but missing from `handleFilter` means the filter appears to work but silently returns wrong results in one code path.

**Impact of fixing:** Adding or modifying a filter requires changing one function instead of three. Eliminates an entire category of filter inconsistency bugs.

**Why Medium:** Requires reading all three query blocks carefully to understand where they differ, then extracting a single `buildPostQuery(filters, page)` function. The logic is self-contained within one file, so there is no risk of breaking other screens.

---

### I-3 · `currentUser` Typed as `any` in ChatRoom

**Priority:** Important · **Effort:** Easy

**File(s):** `app/ChatRoom.tsx`  
**Why it matters:** The most complex screen in the app (`useState<any>(null)` for the authenticated user) has no type safety on the user object. Every access to `currentUser.id`, `currentUser.email`, or any other property is unchecked. A property rename in the `User` type (defined in `types/database.ts`) will not produce a TypeScript error in `ChatRoom.tsx` — it will silently produce `undefined` at runtime, potentially causing messages to be sent with a `null` sender ID or blocking logic to fail silently.

**Impact of fixing:** TypeScript will catch property access errors at compile time. Makes the chat screen as type-safe as the rest of the app.

**Why Easy:** Change `useState<any>(null)` to `useState<User | null>(null)` and import the `User` type. TypeScript will then flag any incorrect property accesses immediately, guiding the remaining fixes.

---

### I-4 · Direct Supabase Call Inside `ChatRoom` Bypasses Service Layer

**Priority:** Important · **Effort:** Medium

**File(s):** `app/ChatRoom.tsx` (`handleBlock` function)  
**Why it matters:** The block/unblock action in `ChatRoom.tsx` calls `supabase.from('blocked_users').insert(...)` directly, bypassing both the `useBlockedUsers` hook and any centralised error handling. The rest of the app uses `useBlockedUsers` for block state, but after `handleBlock` runs, the hook's internal state is stale (it does not know about the new block) until the component re-mounts. This means the "block" button may remain in the wrong state, or the user may be able to send messages to a user they just blocked until they navigate away and back.

**Impact of fixing:** Block state is consistent across the app. Error handling is centralised. The hook's state is always in sync with the database.

**Why Medium:** Requires adding a `blockUser` / `unblockUser` action to `useBlockedUsers`, updating `ChatRoom` to call it, and verifying the hook's state refreshes correctly after the action. Touches 2 files with moderate logic changes.

---

### I-5 · Supabase Queries Inside Zustand Store Actions

**Priority:** Important · **Effort:** Medium

**File(s):** `store/useUnreadMessagesStore.ts`  
**Why it matters:** `setUnreadCount` and `incrementUnreadCount` perform async Supabase database queries inside what are conceptually synchronous state setters. Zustand store actions are not designed to be async data-fetching layers. This makes the store:
- **Hard to test**: mocking Supabase is required just to test basic state logic.
- **Hard to reason about**: callers do not know that calling `setUnreadCount` triggers a network request.
- **Fragile**: if the Supabase call fails, the store silently stays in the wrong state.
- **Architecturally inconsistent**: every other store in the project (`useAuthStore`, `useThemeStore`, `useCountryStore`) does not perform queries inside actions.

**Impact of fixing:** Store actions become pure, testable, and predictable. Network logic moves to the appropriate layer (hooks or services).

**Why Medium:** Requires moving the Supabase query out of the store into a hook or service, then having that hook update the store after the query resolves. Needs care to avoid breaking the polling logic in `_layout.tsx`.

---

### I-6 · `getItemLayout` Uses Incorrect Fixed Height for Chat Messages

**Priority:** Important · **Effort:** Easy

**File(s):** `app/ChatRoom.tsx`  
**Why it matters:** The `FlatList` in `ChatRoom.tsx` provides a `getItemLayout` callback that assumes every message item is exactly 60px tall. Chat messages are variable height — short messages, long messages, images, date separators, and retry buttons all render at different heights. When `getItemLayout` returns incorrect dimensions, the `FlatList`'s scroll position calculations are wrong. This causes:
- `scrollToIndex` (used to scroll to the latest message) jumping to the wrong position.
- Pull-to-refresh loading older messages and the scroll position snapping unexpectedly.
- Visible layout jank when the list scrolls programmatically.

**Impact of fixing:** Correct scroll-to-bottom behaviour. No layout jank when loading older messages. Reliable `scrollToIndex` calls.

**Why Easy:** Remove the `getItemLayout` prop entirely. React Native's `FlatList` works correctly without it for variable-height items — `getItemLayout` is only a performance optimisation for fixed-height lists. Removing it is a one-line deletion with an immediate, visible improvement.

---

### I-7 · `supabaseClient.js` Is Plain JavaScript in a TypeScript Project

**Priority:** Important · **Effort:** Easy

**File(s):** `supabaseClient.js`, `supabaseClient.d.ts`  
**Why it matters:** Every file in the project imports from `supabaseClient.js`. It is the single most-imported module in the codebase, yet it is the only file not compiled by TypeScript. The `.d.ts` declaration file is a manual workaround that must be kept in sync by hand. If the client configuration changes (e.g., adding custom headers, changing auth options), the type declaration will not update automatically. TypeScript cannot catch errors in the client initialisation code itself.

**Impact of fixing:** The most critical shared module gains full type checking. The manual `.d.ts` workaround is eliminated. The project becomes uniformly TypeScript.

**Why Easy:** Rename `supabaseClient.js` to `supabaseClient.ts`, delete `supabaseClient.d.ts`, and verify the TypeScript compiler is satisfied. The file is only ~19 lines. All import paths stay the same.

---

### I-8 · `N+1` User Lookup in `chatService.getMessages`

**Priority:** Important · **Effort:** Easy

**File(s):** `lib/chatService.ts`  
**Why it matters:** `getMessages` fetches a page of messages and then, for each message, performs a separate Supabase query to look up the sender's profile. For a page of 20 messages, this is 21 network round-trips instead of 1. On a mobile connection this can make the chat screen feel slow to load and increases Supabase read usage significantly. Supabase supports joining related tables in a single query using the PostgREST `select` syntax (e.g., `select('*, sender:users(*)')`).

**Impact of fixing:** Chat message loading drops from N+1 queries to 1 query per page. Measurable improvement in chat screen load time on slow connections.

**Why Easy:** Change the `select('*')` in `getMessages` to `select('*, sender:users(*)')` (or the appropriate foreign key relationship name), remove the per-message user lookup loop, and update the type of the returned messages to include the nested `sender` object. A focused change in one function.

---

## Recommended

---

### ~~R-1 · `blurhash` Constant Copy-Pasted Across Four Files~~ ✅ Done

**Priority:** Recommended · **Effort:** Easy · **Status: Completed March 2, 2026**

`PLACEHOLDER_BLURHASH` has been extracted to `constants/images.ts`. All five files (`app/ChatRoom.tsx`, `app/PostDetails.tsx`, `components/posts/PostCard.tsx`, `components/chat/ConversationList.tsx`, `components/forms/ImagePickerSection.tsx`) now import it from there instead of defining a local constant.

---

### ~~R-2 · `POSTS_PER_PAGE` Constant Redefined in Multiple Files~~ ✅ Done

**Priority:** Recommended · **Effort:** Easy · **Status: Completed March 2, 2026**

`POSTS_PER_PAGE` has been extracted to `constants/pagination.ts`. Both `app/(tabs)/home/index.tsx` and `app/(tabs)/profile/my-posts.tsx` now import it from there instead of defining a local constant.

---

### R-3 · Hardcoded Colors Outside the Theme System

**Priority:** Recommended · **Effort:** Medium

**File(s):** `components/posts/PostCard.tsx`, `app/(tabs)/home/index.tsx`, `components/chat/ConversationList.tsx`  
**Why it matters:** Raw hex and RGB color values (`'#666'`, `'#999'`, `'#eee'`, `'rgb(168, 96, 146)'`, `'rgba(0,0,0,0.5)'`) are used directly in `StyleSheet.create` calls instead of referencing the theme defined in `constants/theme.ts`. The project already uses `react-native-paper`'s MD3 theming system. Hardcoded colors do not respond to dark mode, making these elements look broken in dark theme.

**Impact of fixing:** All UI elements respond correctly to dark/light mode switching. Color changes for branding updates require editing one file.

**Why Medium:** Requires auditing all three files, mapping each hardcoded color to the correct MD3 theme token (or adding a new token if none fits), and verifying the visual result in both light and dark mode. Not complex per-file, but requires design judgment on which theme token each color should map to.

---

### R-4 · Country Selection UI Duplicated Between Onboarding and Profile

**Priority:** Recommended · **Effort:** Medium

**File(s):** `app/(onboarding)/index.tsx`, `app/(tabs)/profile/index.tsx`  
**Why it matters:** The Afghanistan/Pakistan country selection card UI is implemented twice — once in the onboarding flow and once in the profile screen. Both render the same flag icons, country names, and selection logic. Adding a new country requires updating both screens. A visual inconsistency between the two (e.g., one gets a style update the other doesn't) creates a confusing UX.

**Impact of fixing:** Adding a new country requires one change. Visual consistency is guaranteed.

**Why Medium:** Extract a `CountrySelector` component, verify it works in both the modal context (profile) and the full-screen context (onboarding), and update both call sites. Requires understanding both screens' data flow.

---

### R-5 · `ChatRoom.tsx` Is an 824-Line Monolithic Component

**Priority:** Recommended · **Effort:** Hard

**File(s):** `app/ChatRoom.tsx`  
**Why it matters:** The chat screen file contains: auth state fetching, conversation creation/lookup, message pagination, real-time subscription setup, optimistic send with temp ID management, a 10-second cleanup timeout for failed messages, block/unblock logic, keyboard scroll handling, memoized message grouping, a post info banner, and the full render tree. This makes the file extremely difficult to navigate, reason about, or modify without accidentally breaking an unrelated concern. The real-time subscription setup alone is ~80 lines.

**Impact of fixing:** Each extracted component or hook is independently understandable and testable. Changes to (e.g.) the message retry logic do not require reading 800 lines of unrelated code.

**Why Hard:** The component has deeply intertwined state — the real-time subscription, the optimistic message list, the scroll ref, and the keyboard handler all share state. Extracting hooks requires carefully identifying which state belongs where and ensuring the extracted pieces compose correctly.

**Suggested breakdown:**
- `useChatMessages` hook — pagination, real-time subscription, optimistic send, retry
- `useChatRoom` hook — conversation lookup/creation, block/unblock
- `PostInfoBanner` component — the header showing the linked post
- `MessageList` component — the `FlatList` with date separators

---

### R-6 · Profile Screen Is 695 Lines with an Inline Modal

**Priority:** Recommended · **Effort:** Medium

**File(s):** `app/(tabs)/profile/index.tsx`  
**Why it matters:** The profile screen embeds a full country-selection modal (~400 lines of JSX) directly in the screen file. The file also handles avatar upload with optimistic update/rollback, theme toggling, sign-out, and navigation to six sub-screens. The country modal alone is large enough to be its own component file.

**Impact of fixing:** Each concern is independently navigable and modifiable. The profile screen file becomes a thin coordinator.

**Why Medium:** Extracting the country modal is straightforward — it has a clear boundary (open/close state + selected country). The avatar upload logic is more intertwined with the profile state and may take more care.

---

### ~~R-7 · `FormOptions.tsx` Has `.tsx` Extension but Contains No JSX~~ ✅ Done

**Priority:** Recommended · **Effort:** Trivial · **Status: Completed February 27, 2026**

`constants/FormOptions.tsx` has been renamed to `constants/FormOptions.ts` via `git mv`. All import paths were unaffected since they omit the file extension.

---

### R-8 · Legacy `CITIES` Array Still Present Alongside `CountryData`

**Priority:** Recommended · **Effort:** Medium

**File(s):** `constants/FormOptions.tsx`, `constants/CountryData.ts`  
**Why it matters:** `FormOptions.tsx` contains a `CITIES` array with only Afghan cities, left over from before the app supported Pakistan. `CountryData.ts` was introduced as a replacement, providing cities for both countries. The legacy array is still exported and may still be referenced in older code paths. Keeping both creates confusion about which source of truth to use when adding a new city.

**Impact of fixing:** One canonical source of city data. No ambiguity about which array to use. Removes dead code.

**Why Medium:** Requires auditing all usages of the legacy `CITIES` array, migrating each call site to use `getCitiesForCountry` from `CountryData.ts`, and then deleting the legacy array. The migration is mechanical but requires verifying each call site behaves correctly with the new data shape.

---

### ~~R-9 · Debug `console.log` Statements Left in Production Code~~ ✅ Done

**Priority:** Recommended · **Effort:** Trivial · **Status: Completed February 27, 2026**

All debug logs have been removed from the four affected files:
- `app/(tabs)/home/index.tsx` — removed bare `'Mounted Home Screen'` log. The remaining logs in this file are inside `if (__DEV__)` guards and are intentional.
- `lib/chatService.ts` — removed all 5 role-check logs from `deleteConversation`.
- `lib/pushNotificationService.ts` — removed 10 informational logs including notification payload logs. The `handleNotificationResponse` stub cases now carry `// TODO (C-5)` comments.
- `app/_layout.tsx` — removed 3 verbose push token registration logs; the `if (!hasToken)` block was simplified accordingly.

---

### R-10 · Missing User-Facing Error Feedback in Several Screens

**Priority:** Recommended · **Effort:** Easy

**File(s):** `app/(tabs)/profile/index.tsx`, `app/(tabs)/profile/my-posts.tsx`, `lib/pushNotificationService.ts`  
**Why it matters:** Several error paths only call `console.error` with no user-facing feedback:
- `fetchUserProfile` failure in `profile/index.tsx` — the screen silently shows no data.
- `handleDelete` failure in `my-posts.tsx` — the post appears to have been deleted but reappears on next load.
- Push token registration failure in `_layout.tsx` — the user never knows notifications won't work.

Silent failures are among the hardest bugs to diagnose because users report "it just doesn't work" with no actionable information.

**Impact of fixing:** Users receive actionable feedback when operations fail. Support requests include more useful context.

**Why Easy:** Add a `react-native-paper` `Snackbar` or `Alert.alert(...)` call in each error handler. The project already uses `react-native-paper`, so no new dependency is needed. Each fix is a 2–3 line addition per error path.

---

## Optional

---

### O-1 · `PostDetails` Interface Has `[key: string]: any` Index Signature

**Priority:** Optional · **Effort:** Hard

**File(s):** `types/database.ts`  
**Why it matters:** The `PostDetails` interface (used for the dynamic key-value details grid on post cards) includes `[key: string]: any`, which disables type checking for all dynamic properties. While the dynamic nature of post details makes strict typing harder, the index signature also weakens type checking for the explicitly declared properties on the same interface, since TypeScript must allow `any` for all keys.

**Impact of fixing:** Stronger type safety for post detail access. Potential to use a discriminated union or generic type to model category-specific details.

**Why Hard:** Properly typing a dynamic, category-specific details object requires either a discriminated union (one type per category) or a generic approach. Either way requires understanding all 14 categories and their possible fields — a significant design exercise.

---

### O-2 · `useRef<any>` for reCAPTCHA Ref in Register Screen

**Priority:** Optional · **Effort:** Easy

**File(s):** `app/(auth)/register.tsx`  
**Why it matters:** The reCAPTCHA component ref is typed as `useRef<any>`. The `react-native-recaptcha-that-works` package (or equivalent) likely exports a ref type. Using `any` means TypeScript cannot verify that the correct methods (e.g., `.open()`, `.close()`) are called on the ref.

**Impact of fixing:** Type-safe reCAPTCHA interaction. TypeScript catches incorrect method calls at compile time.

**Why Easy:** Check the package's type exports, replace `useRef<any>` with the correct ref type (e.g., `useRef<Recaptcha>(null)`), and fix any resulting type errors. A 5-minute change in one file.

---

### O-3 · `useVehicleModels` Maps API Response Items as `any`

**Priority:** Optional · **Effort:** Easy

**File(s):** `lib/hooks/useVehicleModels.ts`  
**Why it matters:** The NHTSA API response is mapped with `(item: any) => item.Model_Name`. Defining a minimal interface for the API response (e.g., `interface NHTSAModel { Model_Name: string }`) would make the mapping type-safe and self-documenting.

**Impact of fixing:** Type-safe API response handling. Makes the expected API shape explicit and documentable.

**Why Easy:** Add a 2-line interface definition at the top of the file and replace `any` with it. Zero risk of runtime behaviour change.

---

### O-4 · `isFirstInGroup` / `isLastInGroup` Logic Duplicated in `messageUtils.ts`

**Priority:** Optional · **Effort:** Easy

**File(s):** `utils/messageUtils.ts`  
**Why it matters:** Both functions are computed inline inside `groupMessages` and also exported as standalone functions. The standalone exports exist for use in the `ChatMessage` component, but the logic is not shared — it is written twice. If the grouping logic changes (e.g., grouping threshold changes from same-sender to same-sender-within-5-minutes), both locations must be updated.

**Impact of fixing:** Single source of truth for message grouping logic.

**Why Easy:** The inline computations inside `groupMessages` can simply call the already-exported standalone functions. A mechanical change within one file.

---

### O-5 · No `CONTRIBUTING.md` or Inline JSDoc for Public APIs

**Priority:** Optional · **Effort:** Medium

**File(s):** Project root, `lib/`, `utils/`  
**Why it matters:** The `README.md` covers setup and architecture at a high level, but there is no `CONTRIBUTING.md` describing the development workflow, branch naming conventions, or PR process. Public-facing service functions in `lib/chatService.ts`, `lib/savedPostsService.ts`, and `lib/cloudinary.ts` have no JSDoc comments describing parameters, return values, or error conditions.

**Impact of fixing:** New contributors can onboard faster. Service function contracts are explicit and discoverable without reading the implementation.

**Why Medium:** Writing good documentation takes time and judgment. The `CONTRIBUTING.md` itself is quick to create; the JSDoc for all public service functions is the larger effort.

---

### O-6 · `savedPostsService.getSavedPosts` Uses `as any` Cast

**Priority:** Optional · **Effort:** Easy

**File(s):** `lib/savedPostsService.ts`  
**Why it matters:** The return value of the Supabase join query is cast with `as any` before being returned. This is a sign that the Supabase generated types (or manual types) do not accurately model the joined query shape. The `as any` cast silently hides any type mismatch between what the query returns and what the caller expects.

**Impact of fixing:** Type-safe saved posts retrieval. TypeScript catches mismatches between the query result and the consuming component.

**Why Easy:** Define an explicit return type for the joined query result (matching the `select` columns) and replace `as any` with it. A focused change in one function.

---

### ~~O-7 · No `.env.example` File~~ ✅ Done

**Priority:** Optional · **Effort:** Trivial · **Status: Completed February 27, 2026**

`.env.example` has been created at the project root listing all 9 required environment variables (Supabase, Cloudinary, Upstash Redis, reCAPTCHA) with placeholder values.

---

### O-8 · GitHub Actions Workflow Has Hardcoded Cloudinary Cloud Name

**Priority:** Optional · **Effort:** Easy

**File(s):** `.github/workflows/cleanup-posts-conversations.yml`  
**Why it matters:** The Cloudinary cloud name appears hardcoded in the workflow YAML in addition to `lib/cloudinary.ts`. GitHub Actions supports repository secrets and variables — the cloud name should be stored as a repository variable and referenced as `${{ vars.CLOUDINARY_CLOUD_NAME }}` for consistency with how other credentials are managed.

**Impact of fixing:** Consistent credential management. Changing the Cloudinary account requires updating one secret, not multiple files.

**Why Easy:** Add `CLOUDINARY_CLOUD_NAME` as a GitHub Actions repository variable, then replace the hardcoded string in the YAML with `${{ vars.CLOUDINARY_CLOUD_NAME }}`. A 2-line change (note: this is already partially addressed by C-3 if done together).

---

## Summary Table

| ID | Title | Priority | Effort | Status |
|---|---|---|---|---|
| C-1 | Zero test coverage | **Critical** | Hard | Open |
| ~~C-2~~ | ~~Hardcoded Supabase project URLs in auth store~~ | ~~**Critical**~~ | ~~Easy~~ | ✅ Done |
| C-3 | Hardcoded Cloudinary credentials in source code | **Critical** | Easy | Open |
| C-4 | `onAuthStateChange` subscription never unsubscribed | **Critical** | Easy | Open |
| C-5 | Push notification tap handler does nothing | **Critical** | Medium | Open |
| C-6 | Data passed between screens as serialized JSON params | **Critical** | Hard | Open |
| I-1 | `usePostForm` / `usePostUpdate` share ~60% duplicated code | **Important** | Medium | Open |
| I-2 | Three near-identical Supabase query blocks in home screen | **Important** | Medium | Open |
| I-3 | `currentUser` typed as `any` in ChatRoom | **Important** | Easy | Open |
| I-4 | Direct Supabase call in ChatRoom bypasses service layer | **Important** | Medium | Open |
| I-5 | Supabase queries inside Zustand store actions | **Important** | Medium | Open |
| I-6 | `getItemLayout` uses incorrect fixed height for chat messages | **Important** | Easy | Open |
| I-7 | `supabaseClient.js` is plain JavaScript in a TypeScript project | **Important** | Easy | Open |
| I-8 | N+1 user lookup in `chatService.getMessages` | **Important** | Easy | Open |
| ~~R-1~~ | ~~`blurhash` constant copy-pasted across four files~~ | ~~**Recommended**~~ | ~~Easy~~ | ✅ Done |
| ~~R-2~~ | ~~`POSTS_PER_PAGE` constant redefined in multiple files~~ | ~~**Recommended**~~ | ~~Easy~~ | ✅ Done |
| R-3 | Hardcoded colors outside the theme system | **Recommended** | Medium | Open |
| R-4 | Country selection UI duplicated between onboarding and profile | **Recommended** | Medium | Open |
| R-5 | `ChatRoom.tsx` is an 824-line monolithic component | **Recommended** | Hard | Open |
| R-6 | Profile screen is 695 lines with an inline modal | **Recommended** | Medium | Open |
| ~~R-7~~ | ~~`FormOptions.tsx` has `.tsx` extension but contains no JSX~~ | ~~Recommended~~ | ~~Trivial~~ | ✅ Done |
| R-8 | Legacy `CITIES` array still present alongside `CountryData` | **Recommended** | Medium | Open |
| ~~R-9~~ | ~~Debug `console.log` statements left in production code~~ | ~~Recommended~~ | ~~Trivial~~ | ✅ Done |
| R-10 | Missing user-facing error feedback in several screens | **Recommended** | Easy | Open |
| O-1 | `PostDetails` interface has `[key: string]: any` index signature | **Optional** | Hard | Open |
| O-2 | `useRef<any>` for reCAPTCHA ref in register screen | **Optional** | Easy | Open |
| O-3 | `useVehicleModels` maps API response items as `any` | **Optional** | Easy | Open |
| O-4 | `isFirstInGroup` / `isLastInGroup` logic duplicated in `messageUtils.ts` | **Optional** | Easy | Open |
| O-5 | No `CONTRIBUTING.md` or inline JSDoc for public APIs | **Optional** | Medium | Open |
| O-6 | `savedPostsService.getSavedPosts` uses `as any` cast | **Optional** | Easy | Open |
| ~~O-7~~ | ~~No `.env.example` file~~ | ~~Optional~~ | ~~Trivial~~ | ✅ Done |
| O-8 | GitHub Actions workflow has hardcoded Cloudinary cloud name | **Optional** | Easy | Open |

---

### Items by Effort Level

| Effort | Items | Remaining |
|---|---|---|
| **Trivial** | ~~R-7~~, ~~R-9~~, ~~O-7~~ | 0 of 3 |
| **Easy** | ~~C-2~~, C-3, C-4, I-3, I-6, I-7, I-8, ~~R-1~~, ~~R-2~~, R-10, O-2, O-3, O-4, O-6, O-8 | 12 of 15 |
| **Medium** | C-5, I-1, I-2, I-4, I-5, R-3, R-4, R-6, R-8, O-5 | 10 of 10 |
| **Hard** | C-1, C-6, R-5, O-1 | 4 of 4 |

---

*Total items: 6 Critical · 8 Important · 10 Recommended · 8 Optional*  
*By effort: 3 Trivial · 15 Easy · 10 Medium · 4 Hard*  
*Progress: **6 / 32 completed** (R-7, R-9, O-7, C-2, R-1, R-2)*
