'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function arrayMove<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const LONG_PRESS_MS = 220;
const SCROLL_CANCEL_PX = 10;

/**
 * Lightweight drag-to-reorder for a grid of thumbnails.
 * - Desktop: native HTML5 drag & drop.
 * - Touch: press-and-hold (~0.2s) then drag; a quick swipe still scrolls the page.
 *
 * Attach `containerRef` to the grid and spread `getItemProps(index)` on each item.
 */
export function useSortable(onMove: (from: number, to: number) => void) {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerEl(node);
  }, []);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const moveTo = useCallback((to: number) => {
    const from = dragIndexRef.current;
    if (from === null || from === to) return;
    onMoveRef.current(from, to);
    dragIndexRef.current = to;
    setDraggingIndex(to);
  }, []);

  const endDrag = useCallback(() => {
    dragIndexRef.current = null;
    setDraggingIndex(null);
  }, []);

  // Touch support (native listeners so we can preventDefault scrolling while dragging)
  useEffect(() => {
    const el = containerEl;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0;
    let startY = 0;
    let touchDragging = false;

    const indexFromPoint = (x: number, y: number): number | null => {
      const target = document.elementFromPoint(x, y) as HTMLElement | null;
      const item = target?.closest('[data-sort-index]') as HTMLElement | null;
      if (!item || !el.contains(item)) return null;
      const idx = Number(item.dataset.sortIndex);
      return Number.isNaN(idx) ? null : idx;
    };

    const clearTimer = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      // Don't hijack taps on buttons inside the thumbnail (remove / arrows)
      if ((e.target as HTMLElement).closest('button')) return;
      const idx = indexFromPoint(t.clientX, t.clientY);
      if (idx === null) return;
      startX = t.clientX;
      startY = t.clientY;
      clearTimer();
      timer = setTimeout(() => {
        touchDragging = true;
        dragIndexRef.current = idx;
        setDraggingIndex(idx);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(20); } catch { /* noop */ }
        }
      }, LONG_PRESS_MS);
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!touchDragging) {
        if (Math.abs(t.clientX - startX) > SCROLL_CANCEL_PX || Math.abs(t.clientY - startY) > SCROLL_CANCEL_PX) {
          clearTimer();
        }
        return;
      }
      e.preventDefault();
      const idx = indexFromPoint(t.clientX, t.clientY);
      if (idx !== null) moveTo(idx);
    };

    const onTouchEnd = () => {
      clearTimer();
      if (touchDragging) {
        touchDragging = false;
        endDrag();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    // Prevent long-press context menu on images while dragging
    const onContextMenu = (e: Event) => {
      if (touchDragging || timer) e.preventDefault();
    };
    el.addEventListener('contextmenu', onContextMenu);

    return () => {
      clearTimer();
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('contextmenu', onContextMenu);
    };
  }, [containerEl, moveTo, endDrag]);

  const getItemProps = (index: number) => ({
    'data-sort-index': index,
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      dragIndexRef.current = index;
      setDraggingIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(index)); } catch { /* noop */ }
    },
    onDragOver: (e: React.DragEvent) => {
      if (dragIndexRef.current === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      moveTo(index);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      endDrag();
    },
    onDragEnd: endDrag,
    style: {
      cursor: 'grab',
      opacity: draggingIndex === index ? 0.45 : 1,
      transition: 'opacity 0.15s ease, transform 0.15s ease',
      transform: draggingIndex === index ? 'scale(0.96)' : undefined,
      WebkitTouchCallout: 'none',
      userSelect: 'none',
    } as React.CSSProperties,
  });

  return { containerRef, getItemProps, draggingIndex };
}
