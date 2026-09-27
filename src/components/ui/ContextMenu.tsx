"use client";

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  OVERLAY_Z,
  handleTopmostEscape,
  pushEscapeHandler,
} from "@/lib/overlay";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface ContextMenuContextValue {
  openMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  closeMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [mounted, setMounted] = useState(false);
  const menuId = useId();
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Placed after measuring, so the menu flips to stay on screen and grows out
  // of whichever corner sits at the pointer.
  const [placement, setPlacement] = useState<{ left: number; top: number; origin: string } | null>(null);

  useEffect(() => setMounted(true), []);

  const closeMenu = useCallback(() => setMenu(null), []);

  const openMenu = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
    setPlacement(null);
    setMenu({ x, y, items });
  }, []);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!menu || !el) return;
    const margin = 8;
    const { width, height } = el.getBoundingClientRect();
    const flipX = menu.x + width + margin > window.innerWidth;
    const flipY = menu.y + height + margin > window.innerHeight;
    const left = Math.max(margin, flipX ? menu.x - width : menu.x);
    const top = Math.max(margin, flipY ? menu.y - height : menu.y);
    setPlacement({ left, top, origin: `${flipY ? "bottom" : "top"} ${flipX ? "right" : "left"}` });
  }, [menu]);

  const moveFocus = useCallback((delta: 1 | -1) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)") ?? [],
    );
    if (items.length === 0) return;
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(at + delta + items.length) % items.length]?.focus();
  }, []);

  // Focus the first item when the menu opens so keyboard users land inside
  // it; Escape is routed through the topmost-only stack.
  useEffect(() => {
    if (!menu) return;
    const removeEscape = pushEscapeHandler(closeMenu);
    const t = requestAnimationFrame(() => firstItemRef.current?.focus());
    const onDown = (e: MouseEvent) => {
      // Don't close when the press starts on the opener: the click that
      // opened the menu would otherwise instantly dismiss it.
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-context-menu]")) return;
      if (target?.closest("[data-context-menu-trigger-open]")) return;
      closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        moveFocus(e.key === "ArrowDown" ? 1 : -1);
        return;
      }
      handleTopmostEscape(e);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(t);
      removeEscape();
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu, closeMenu, moveFocus]);

  return (
    <ContextMenuContext.Provider value={{ openMenu, closeMenu }}>
      {children}
      {mounted &&
        menu &&
        createPortal(
          <div
            ref={menuRef}
            data-context-menu
            role="menu"
            aria-labelledby={menuId}
            className={`glass-thick fixed min-w-[220px] max-w-[300px] rounded-[14px] p-[5px] ${placement ? "menu-pop" : "invisible"}`}
            style={{
              zIndex: OVERLAY_Z.contextMenu,
              left: placement?.left ?? menu.x,
              top: placement?.top ?? menu.y,
              ["--menu-origin" as string]: placement?.origin ?? "top left",
            }}
          >
            <span id={menuId} className="sr-only">
              Context menu
            </span>
            {menu.items.map((item, i) => {
              // Destructive actions sit in their own group below a separator,
              // as they do in system menus, so they are never one slip away.
              const firstDanger = item.danger && !menu.items[i - 1]?.danger && i > 0;
              return (
                <Fragment key={item.id}>
                  {firstDanger && <div role="separator" className="mx-2.5 my-[5px] h-px bg-hairline" />}
                  <button
                    ref={i === 0 ? firstItemRef : undefined}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled) item.onClick();
                      closeMenu();
                    }}
                    className={`flex h-8 w-full items-center gap-3 rounded-[8px] px-2.5 text-left text-[13.5px] outline-none transition-colors duration-100 disabled:opacity-40 ${
                      item.danger
                        ? "text-status-dnd hover:bg-status-dnd/12 focus-visible:bg-status-dnd/12"
                        : "text-text-normal hover:bg-interactive-selected focus-visible:bg-interactive-selected"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.icon && (
                      <span className={`flex w-4 shrink-0 justify-center ${item.danger ? "" : "text-text-muted"}`}>{item.icon}</span>
                    )}
                  </button>
                </Fragment>
              );
            })}
          </div>,
        document.body,
        )}
    </ContextMenuContext.Provider>
  );
}

export function useContextMenu() {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) throw new Error("useContextMenu requires ContextMenuProvider");
  return ctx;
}
