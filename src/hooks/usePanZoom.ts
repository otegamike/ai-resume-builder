"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export const PAN_ZOOM_MAX_Z = 4;
const FIT_PAD = 16;
const DRAG_THRESHOLD_PX = 4;
const INTERACT_RELEASE_MS = 120;
const FIT_ANIM_MS = 180;

interface PanZoomPoint {
  x: number;
  y: number;
}

interface PanZoomTransform {
  x: number;
  y: number;
  z: number;
}

interface PinchSnapshot {
  dist: number;
  z: number;
  cx: number;
  cy: number;
  x: number;
  y: number;
}

interface DragSnapshot {
  downX: number;
  downY: number;
  x: number;
  y: number;
  pointerId: number;
  moved: boolean;
}

export interface UsePanZoomOptions {
  isOpen: boolean;
  initialZoom?: number;
  onClose?: () => void;
}

export interface UsePanZoomReturn {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  zoomPercent: number;
  minZoomPercent: number;
  maxZoomPercent: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const isFormField = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable);

export function usePanZoom(
  viewportRef: React.RefObject<HTMLDivElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>,
  options: UsePanZoomOptions
): UsePanZoomReturn {
  const { isOpen, initialZoom, onClose } = options;

  const state = useRef<PanZoomTransform>({ x: 0, y: 0, z: 1 });
  const minZ = useRef(0.5);
  const raf = useRef(0);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointers = useRef(new Map<number, PanZoomPoint>());
  const pinch = useRef<PinchSnapshot | null>(null);
  const drag = useRef<DragSnapshot | null>(null);
  const rectCache = useRef<DOMRect | null>(null);
  const hasInteracted = useRef(false);
  const suppressClick = useRef(false);
  const fitAnim = useRef(0);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const [zoomPercent, setZoomPercent] = useState(100);
  const [minZoomPercent, setMinZoomPercent] = useState(50);
  const maxZoomPercent = Math.round(PAN_ZOOM_MAX_Z * 100);

  const commitZoomLabel = useCallback(() => {
    const pct = Math.round(state.current.z * 100);
    setZoomPercent((prev) => (prev === pct ? prev : pct));
  }, []);

  const write = useCallback(() => {
    raf.current = 0;
    const el = contentRef.current;
    if (el) {
      const s = state.current;
      el.style.transform = `translate(${s.x}px, ${s.y}px) scale(${s.z})`;
    }
    commitZoomLabel();
  }, [commitZoomLabel, contentRef]);

  const schedule = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(write);
  }, [write]);

  const markInteracting = useCallback(() => {
    const el = contentRef.current;
    if (releaseTimer.current) {
      clearTimeout(releaseTimer.current);
      releaseTimer.current = null;
    }
    el?.setAttribute("data-interacting", "true");
  }, [contentRef]);

  const endInteracting = useCallback(() => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => {
      contentRef.current?.removeAttribute("data-interacting");
      releaseTimer.current = null;
    }, INTERACT_RELEASE_MS);
  }, [contentRef]);

  const clampPan = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const w = content.offsetWidth;
    const h = content.offsetHeight;
    if (w === 0 || h === 0) return;
    const s = state.current;

    const scaledW = w * s.z;
    if (scaledW <= vw - FIT_PAD * 2) {
      s.x = (vw - scaledW) / 2;
    } else {
      s.x = clamp(s.x, vw - FIT_PAD - scaledW, FIT_PAD);
    }

    const scaledH = h * s.z;
    if (scaledH <= vh - FIT_PAD * 2) {
      s.y = FIT_PAD;
    } else {
      s.y = clamp(s.y, vh - FIT_PAD - scaledH, FIT_PAD);
    }
  }, [contentRef, viewportRef]);

  const zoomAt = useCallback(
    (cx: number, cy: number, nextZ: number) => {
      const s = state.current;
      const z = clamp(nextZ, minZ.current, PAN_ZOOM_MAX_Z);
      const r = z / s.z;
      s.x = cx - (cx - s.x) * r;
      s.y = cy - (cy - s.y) * r;
      s.z = z;
      clampPan();
      markInteracting();
      schedule();
      endInteracting();
    },
    [clampPan, endInteracting, markInteracting, schedule]
  );

  const measureFit = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return null;
    const w = content.offsetWidth;
    const h = content.offsetHeight;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (w === 0 || h === 0 || vw === 0 || vh === 0) return null;
    const z = Math.min((vw - FIT_PAD * 2) / w);
    return { w, h, vw, vh, z };
  }, [contentRef, viewportRef]);

  const applyFitState = useCallback(
    (animate: boolean) => {
      const m = measureFit();
      if (!m) return;
      minZ.current = Math.min(0.5, m.z);
      setMinZoomPercent(Math.round(minZ.current * 100));
      const s = state.current;
      const target: PanZoomTransform = {
        z: m.z,
        x: (m.vw - m.w * m.z) / 2,
        y: FIT_PAD,
      };
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!animate || reduceMotion) {
        if (fitAnim.current) cancelAnimationFrame(fitAnim.current);
        fitAnim.current = 0;
        s.x = target.x;
        s.y = target.y;
        s.z = target.z;
        clampPan();
        markInteracting();
        schedule();
        endInteracting();
        return;
      }
      const from = { x: s.x, y: s.y, z: s.z };
      const start = performance.now();
      if (fitAnim.current) cancelAnimationFrame(fitAnim.current);
      markInteracting();
      const step = (now: number) => {
        const t = clamp((now - start) / FIT_ANIM_MS, 0, 1);
        const e = 1 - Math.pow(1 - t, 3);
        s.x = from.x + (target.x - from.x) * e;
        s.y = from.y + (target.y - from.y) * e;
        s.z = from.z + (target.z - from.z) * e;
        clampPan();
        schedule();
        if (t < 1) {
          fitAnim.current = requestAnimationFrame(step);
        } else {
          fitAnim.current = 0;
          endInteracting();
        }
      };
      fitAnim.current = requestAnimationFrame(step);
    },
    [clampPan, endInteracting, markInteracting, measureFit, schedule]
  );

  const fit = useCallback(() => {
    hasInteracted.current = true;
    applyFitState(true);
  }, [applyFitState]);

  const zoomAboutCenter = useCallback(
    (factor: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      hasInteracted.current = true;
      zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, state.current.z * factor);
    },
    [viewportRef, zoomAt]
  );

  const zoomIn = useCallback(() => zoomAboutCenter(1.2), [zoomAboutCenter]);
  const zoomOut = useCallback(() => zoomAboutCenter(1 / 1.2), [zoomAboutCenter]);

  // Initial fit (or centered initialZoom) after layout on open.
  useLayoutEffect(() => {
    if (!isOpen) return;
    pointers.current.clear();
    pinch.current = null;
    drag.current = null;
    suppressClick.current = false;
    hasInteracted.current = false;
    let rafId = 0;

    const finishInitial = (m: { w: number; h: number; vw: number; vh: number; z: number }) => {
      const s = state.current;
      if (initialZoom !== undefined) {
        const z = clamp(initialZoom, minZ.current, PAN_ZOOM_MAX_Z);
        s.z = z;
        s.x = (m.vw - m.w * z) / 2;
        s.y = FIT_PAD;
      } else {
        s.z = m.z;
        s.x = (m.vw - m.w * m.z) / 2;
        s.y = FIT_PAD;
      }
      clampPan();
      const el = contentRef.current;
      if (el) {
        el.style.transform = `translate(${s.x}px, ${s.y}px) scale(${s.z})`;
      }
      commitZoomLabel();
    };

    const doInitial = () => {
      const m = measureFit();
      if (m) {
        minZ.current = Math.min(0.5, m.z);
        setMinZoomPercent(Math.round(minZ.current * 100));
        finishInitial(m);
        return;
      }
      // Content not laid out yet; retry once next frame.
      rafId = requestAnimationFrame(() => {
        const retry = measureFit();
        if (!retry) return;
        minZ.current = Math.min(0.5, retry.z);
        setMinZoomPercent(Math.round(minZ.current * 100));
        finishInitial(retry);
      });
    };

    doInitial();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isOpen, initialZoom, clampPan, commitZoomLabel, contentRef, measureFit]);

  // Viewport resize: refit only until the user interacts.
  useEffect(() => {
    if (!isOpen) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    rectCache.current = viewport.getBoundingClientRect();
    const ro = new ResizeObserver(() => {
      rectCache.current = viewport.getBoundingClientRect();
      if (!hasInteracted.current) applyFitState(false);
    });
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [isOpen, applyFitState, viewportRef]);

  // Content size changes (multi-page resume height): update clamp bounds without zoom reset.
  useEffect(() => {
    if (!isOpen) return;
    const content = contentRef.current;
    if (!content) return;
    const ro = new ResizeObserver(() => {
      clampPan();
      schedule();
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [isOpen, clampPan, schedule, contentRef]);

  // Native wheel handler (must be non-passive to preventDefault trackpad pinch).
  useEffect(() => {
    if (!isOpen) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      hasInteracted.current = true;
      const rect = viewport.getBoundingClientRect();
      const unit = e.deltaMode === 1 ? 16 : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      if (e.ctrlKey || e.metaKey) {
        const k = e.ctrlKey ? 0.01 : 0.002;
        const s = state.current;
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, s.z * Math.exp(-dy * k));
      } else {
        const s = state.current;
        s.x -= dx;
        s.y -= dy;
        clampPan();
        markInteracting();
        schedule();
        endInteracting();
      }
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [isOpen, clampPan, endInteracting, markInteracting, schedule, viewportRef, zoomAt]);

  // iOS Safari safety net against page-level pinch zoom.
  useEffect(() => {
    if (!isOpen) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const stop = (e: Event) => e.preventDefault();
    viewport.addEventListener("gesturestart", stop, { passive: false });
    viewport.addEventListener("gesturechange", stop, { passive: false });
    return () => {
      viewport.removeEventListener("gesturestart", stop);
      viewport.removeEventListener("gesturechange", stop);
    };
  }, [isOpen, viewportRef]);

  // Pointer gestures on window (so drags continue outside the viewport).
  useEffect(() => {
    if (!isOpen) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const activePointers = pointers.current;

    const distOf = (a: PanZoomPoint, b: PanZoomPoint) =>
      Math.hypot(a.x - b.x, a.y - b.y);

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (fitAnim.current) {
        cancelAnimationFrame(fitAnim.current);
        fitAnim.current = 0;
      }
      rectCache.current = viewport.getBoundingClientRect();
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      try {
        viewport.setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture not supported or element disconnected.
      }

      if (activePointers.size === 1) {
        const s = state.current;
        drag.current = {
          downX: e.clientX,
          downY: e.clientY,
          x: s.x,
          y: s.y,
          pointerId: e.pointerId,
          moved: false,
        };
      } else if (activePointers.size === 2) {
        hasInteracted.current = true;
        const [a, b] = [...activePointers.values()];
        const rect = rectCache.current;
        const cx = (a.x + b.x) / 2 - rect.left;
        const cy = (a.y + b.y) / 2 - rect.top;
        const s = state.current;
        pinch.current = { dist: distOf(a, b) || 1, z: s.z, cx, cy, x: s.x, y: s.y };
        drag.current = null;
        viewport.removeAttribute("data-dragging");
        markInteracting();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const s = state.current;

      if (activePointers.size === 2) {
        if (e.cancelable) e.preventDefault();
        const snap = pinch.current;
        if (!snap) return;
        const [a, b] = [...activePointers.values()];
        const d = distOf(a, b);
        if (d === 0) return;
        const rect = rectCache.current ?? viewport.getBoundingClientRect();
        const cx = (a.x + b.x) / 2 - rect.left;
        const cy = (a.y + b.y) / 2 - rect.top;
        const z = clamp(snap.z * (d / snap.dist), minZ.current, PAN_ZOOM_MAX_Z);
        const r = z / snap.z;
        s.z = z;
        s.x = cx - (snap.cx - snap.x) * r;
        s.y = cy - (snap.cy - snap.y) * r;
        clampPan();
        markInteracting();
        schedule();
        commitZoomLabel();
        return;
      }

      if (activePointers.size === 1 && drag.current && e.pointerId === drag.current.pointerId) {
        const d = drag.current;
        const dx = e.clientX - d.downX;
        const dy = e.clientY - d.downY;
        if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
          d.moved = true;
          hasInteracted.current = true;
          suppressClick.current = true;
          viewport.setAttribute("data-dragging", "true");
          markInteracting();
        }
        if (d.moved) {
          if (e.cancelable) e.preventDefault();
          s.x = d.x + dx;
          s.y = d.y + dy;
          clampPan();
          schedule();
        }
      }
    };

    const clearPointer = (e: PointerEvent) => {
      try {
        if (viewport.hasPointerCapture(e.pointerId)) {
          viewport.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Pointer already released.
      }
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) pinch.current = null;
      if (activePointers.size === 1) {
        // Went from two fingers to one: re-anchor the drag on the
        // remaining pointer and the current transform.
        const remaining = [...activePointers.entries()][0];
        const s = state.current;
        drag.current = {
          downX: remaining[1].x,
          downY: remaining[1].y,
          x: s.x,
          y: s.y,
          pointerId: remaining[0],
          moved: false,
        };
      } else if (activePointers.size === 0) {
        drag.current = null;
        viewport.removeAttribute("data-dragging");
        endInteracting();
      }
    };

    const onBlur = () => {
      activePointers.clear();
      pinch.current = null;
      drag.current = null;
      viewport.removeAttribute("data-dragging");
    };

    const onClickCapture = (e: MouseEvent) => {
      if (suppressClick.current) {
        e.stopPropagation();
        e.preventDefault();
        suppressClick.current = false;
      }
    };

    viewport.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", clearPointer);
    window.addEventListener("pointercancel", clearPointer);
    window.addEventListener("blur", onBlur);
    viewport.addEventListener("click", onClickCapture, true);
    return () => {
      viewport.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", clearPointer);
      window.removeEventListener("pointercancel", clearPointer);
      window.removeEventListener("blur", onBlur);
      viewport.removeEventListener("click", onClickCapture, true);
      activePointers.clear();
      pinch.current = null;
      drag.current = null;
    };
  }, [isOpen, clampPan, commitZoomLabel, endInteracting, markInteracting, schedule, viewportRef]);

  // Cleanup rAF/timers on close/unmount so reopening resets cleanly.
  useEffect(() => {
    if (isOpen) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    if (fitAnim.current) cancelAnimationFrame(fitAnim.current);
    fitAnim.current = 0;
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = null;
    pointers.current.clear();
    pinch.current = null;
    drag.current = null;
    suppressClick.current = false;
  }, [isOpen]);

  // Keyboard: Escape closes, +/- zoom, arrows pan, 0 fits.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (isFormField(e.target)) return;
      if (e.key === "Escape") {
        onCloseRef.current?.();
        return;
      }
      if (e.key === "+" || e.key === "=") {
        hasInteracted.current = true;
        zoomAboutCenter(1.2);
      } else if (e.key === "-" || e.key === "_") {
        hasInteracted.current = true;
        zoomAboutCenter(1 / 1.2);
      } else if (e.key === "0") {
        fit();
      } else if (e.key.startsWith("Arrow")) {
        hasInteracted.current = true;
        const s = state.current;
        if (e.key === "ArrowLeft") s.x += 40;
        else if (e.key === "ArrowRight") s.x -= 40;
        else if (e.key === "ArrowUp") s.y += 40;
        else if (e.key === "ArrowDown") s.y -= 40;
        clampPan();
        markInteracting();
        schedule();
        endInteracting();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, clampPan, endInteracting, fit, markInteracting, schedule, zoomAboutCenter]);

  return { zoomIn, zoomOut, fit, zoomPercent, minZoomPercent, maxZoomPercent };
}
