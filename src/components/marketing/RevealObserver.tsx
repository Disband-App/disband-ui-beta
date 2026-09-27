"use client";

import { useEffect } from "react";

/**
 * Arms the scroll reveals (motion.css `.reveal`). The hidden starting state
 * only applies once this has run and set data-reveal on <html>, so without
 * JavaScript — or before hydration — every section is simply visible.
 */
export function RevealObserver() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    root.setAttribute("data-reveal", "");
    return () => {
      observer.disconnect();
      root.removeAttribute("data-reveal");
    };
  }, []);
  return null;
}
