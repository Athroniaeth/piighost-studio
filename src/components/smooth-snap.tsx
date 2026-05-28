"use client";

import { useEffect } from "react";

const LOCK_MS = 850;
const MIN_DELTA = 6;

function isInsideScrollable(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function SmoothSnap() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let locked = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function snapTargets(): HTMLElement[] {
      return Array.from(document.querySelectorAll<HTMLElement>(".snap-start"));
    }

    function currentIndex(list: HTMLElement[]): number {
      const probe = window.scrollY + window.innerHeight / 2;
      let idx = 0;
      list.forEach((el, i) => {
        if (el.offsetTop <= probe) idx = i;
      });
      return idx;
    }

    function onWheel(e: WheelEvent) {
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaY) < MIN_DELTA) return;
      if (isInsideScrollable(e.target)) return;

      if (locked) {
        e.preventDefault();
        return;
      }

      const list = snapTargets();
      if (list.length === 0) return;

      const cur = currentIndex(list);
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = cur + dir;
      if (next < 0 || next >= list.length) return;

      e.preventDefault();
      locked = true;
      list[next].scrollIntoView({ behavior: "smooth", block: "start" });

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        locked = false;
      }, LOCK_MS);
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
