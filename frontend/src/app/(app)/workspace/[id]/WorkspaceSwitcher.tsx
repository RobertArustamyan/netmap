"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Workspace { id: string; name: string; }
interface Props { currentId: string; currentName: string; workspaces: Workspace[]; }

const ITEM_H = 52;

export default function WorkspaceSwitcher({ currentId, currentName, workspaces }: Props) {
  const currentIdx = Math.max(0, workspaces.findIndex((w) => w.id === currentId));
  const [open, setOpen] = useState(false);
  const [centeredIdx, setCenteredIdx] = useState(currentIdx);
  const centeredIdxRef = useRef(currentIdx);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  function moveTo(idx: number) {
    const clamped = Math.max(0, Math.min(workspaces.length - 1, idx));
    centeredIdxRef.current = clamped;
    setCenteredIdx(clamped);
    scrollRef.current?.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
  }

  // Scroll to current workspace whenever picker opens
  useEffect(() => {
    if (!open || !scrollRef.current) return;
    centeredIdxRef.current = currentIdx;
    setCenteredIdx(currentIdx);
    scrollRef.current.scrollTop = currentIdx * ITEM_H;
  }, [open, currentIdx]);

  // Wheel: move exactly one item at a time
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      moveTo(centeredIdxRef.current + (e.deltaY > 0 ? 1 : -1));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollTop / ITEM_H);
    setCenteredIdx(Math.max(0, Math.min(workspaces.length - 1, idx)));
  }, [workspaces.length]);

  function handleClick(idx: number) {
    if (idx !== centeredIdx) {
      scrollRef.current?.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
      setCenteredIdx(idx);
    } else {
      const ws = workspaces[idx];
      if (ws) { setOpen(false); router.push(`/workspace/${ws.id}/graph`); }
    }
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "inherit", fontSize: 14, fontWeight: 500,
          color: "var(--foreground)", padding: "4px 10px", borderRadius: 8,
          transition: "background 0.15s", maxWidth: 260,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {currentName}
        </span>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ opacity: 0.4, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", left: "50%",
          transform: "translateX(-50%)", width: 240,
          background: "white", borderRadius: 16,
          boxShadow: "0 12px 48px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", zIndex: 100,
          animation: "sw-in 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <style>{`
            @keyframes sw-in {
              from { opacity:0; transform:translateX(-50%) scale(0.93) translateY(-6px); }
              to   { opacity:1; transform:translateX(-50%) scale(1) translateY(0); }
            }
            .ws-scroll::-webkit-scrollbar { display: none; }
          `}</style>

          <div style={{ position: "relative", height: ITEM_H * 3, overflow: "hidden" }}>

            {/* 1. Highlight band — behind everything */}
            <div style={{
              position: "absolute", top: ITEM_H, left: 0, right: 0, height: ITEM_H,
              background: "#f5f3ff",
              borderTop: "1px solid #ede9fe", borderBottom: "1px solid #ede9fe",
            }} />

            {/* 2. Scroll drum — above highlight, below fades */}
            <div
              ref={scrollRef}
              className="ws-scroll"
              onScroll={handleScroll}
              style={{
                position: "absolute", inset: 0,
                overflowY: "scroll", scrollSnapType: "y mandatory",
                scrollbarWidth: "none", zIndex: 1,
                background: "transparent",
              }}
            >
              <div style={{ height: ITEM_H }} />

              {workspaces.map((ws, idx) => {
                const isCenter = idx === centeredIdx;
                const dist = Math.abs(idx - centeredIdx);
                return (
                  <div
                    key={ws.id}
                    onClick={() => handleClick(idx)}
                    style={{
                      height: ITEM_H, scrollSnapAlign: "center",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 20px", cursor: "pointer", userSelect: "none",
                      transition: "opacity 0.15s, transform 0.15s, font-size 0.15s, color 0.15s",
                      fontSize: isCenter ? 15 : 13,
                      fontWeight: isCenter ? 600 : 400,
                      color: isCenter ? "#4f46e5" : "#000",
                      opacity: dist === 0 ? 1 : 0.6,
                      transform: `scale(${isCenter ? 1 : 0.9})`,
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ws.name}
                    </span>
                  </div>
                );
              })}

              <div style={{ height: ITEM_H }} />
            </div>

            {/* 3. Fades — topmost, pointer-events off */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: ITEM_H,
              background: "linear-gradient(to bottom, rgba(255,255,255,0.92) 40%, transparent)",
              pointerEvents: "none", zIndex: 2,
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: ITEM_H,
              background: "linear-gradient(to top, rgba(255,255,255,0.92) 40%, transparent)",
              pointerEvents: "none", zIndex: 2,
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
