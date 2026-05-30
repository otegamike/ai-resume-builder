# Fix: `document is not defined` Runtime Error

## Problem
`document` and `window` are browser-only APIs that don't exist during Next.js SSR (server-side rendering). The error occurs because:
1. `headerSize.ts` calls `document.querySelector` / `window.innerHeight` without SSR guards
2. `LoginClient.tsx` calls `calculateEditorHeight()` at **module level** (line 12), which runs on the server even with `"use client"`

## Changes

### 1. `src/utils/headerSize.ts`
Add SSR guards to all three functions:

```ts
export function getHeaderHeight() {
    if (typeof document === 'undefined') return 0;            // ADD
    const header = document.querySelector('header') as HTMLElement;
    return header?.offsetHeight || 0;
}

export function gettitleBarHeight() {
    if (typeof document === 'undefined') return 0;            // ADD
    const header = document.querySelector('header') as HTMLElement;
    return header?.offsetHeight || 0;
}

export function getViewportHeight() {
    if (typeof window === 'undefined') return 0;              // ADD
    const viewportHeight = window.innerHeight;
    return viewportHeight;
}
```

### 2. `src/app/auth/login/LoginClient.tsx`
**a)** Add `useEffect` to the React import (line 3):
```ts
import { FormEvent, useEffect, useState } from "react";
```

**b)** Remove the module-level call and constant (lines 11-12):
```ts
// DELETE these two lines:
import { calculateEditorHeight } from "@/utils/headerSize";
const containerHeight = `${calculateEditorHeight()}px`;
```
Keep the import — it's still needed inside the component.

**c)** Add state + effect inside the component (after `setError`):
```ts
const [containerHeight, setContainerHeight] = useState("100vh");

useEffect(() => {
    setContainerHeight(`${calculateEditorHeight()}px`);
}, []);
```

## Why this works
- `useEffect` only runs on the client after hydration
- `"100vh"` is a safe SSR fallback that prevents layout shift
- The SSR guards in `headerSize.ts` are defensive — they prevent crashes if any other component calls these functions during SSR
