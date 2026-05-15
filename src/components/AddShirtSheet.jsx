import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddEditShirt from '../pages/AddEditShirt';
import { useSheet } from '../context/SheetContext';

export default function AddShirtSheet() {
  const { addShirtOpen, closeAddShirt } = useSheet();
  const navigate = useNavigate();

  // Animation state — separate from open state so we can drive the enter/exit transition
  const [animIn, setAnimIn] = useState(false);

  const sheetRef   = useRef(null);
  const backdropRef = useRef(null);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  // Lock/unlock body scroll and trigger slide animation
  useEffect(() => {
    if (addShirtOpen) {
      document.body.style.overflow = 'hidden';
      // Clear any inline styles left by a previous drag before animating in
      if (sheetRef.current) {
        sheetRef.current.style.transform  = '';
        sheetRef.current.style.transition = '';
      }
      // Double-rAF: ensure the browser has painted the start state first
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setAnimIn(true)),
      );
      return () => cancelAnimationFrame(id);
    } else {
      document.body.style.overflow = '';
      setAnimIn(false);
    }
  }, [addShirtOpen]);

  // Cleanup on unmount
  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  // ── Drag-to-dismiss on the handle bar ────────────────────────────────────
  function onDragStart(e) {
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    isDragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }

  function onDragMove(e) {
    if (!isDragging.current) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const delta   = Math.max(0, clientY - dragStartY.current);
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
    // Dim backdrop proportionally
    if (backdropRef.current) {
      backdropRef.current.style.opacity = String(Math.max(0, 1 - delta / 350));
    }
  }

  function onDragEnd(e) {
    if (!isDragging.current) return;
    isDragging.current = false;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const delta   = Math.max(0, clientY - dragStartY.current);

    if (delta > 120) {
      // Dismiss — slide the rest of the way off screen, then close
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.25s ease-in';
        sheetRef.current.style.transform  = 'translateY(100%)';
      }
      setTimeout(closeAddShirt, 240);
    } else {
      // Snap back
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.35s cubic-bezier(0.32,0.72,0,1)';
        sheetRef.current.style.transform  = 'translateY(0)';
      }
      if (backdropRef.current) {
        backdropRef.current.style.opacity = '1';
      }
      setTimeout(() => {
        if (sheetRef.current) sheetRef.current.style.transition = '';
        if (backdropRef.current) backdropRef.current.style.opacity = '';
      }, 360);
    }
  }

  function handleSaved(shirtId) {
    closeAddShirt();
    navigate(`/shirts/${shirtId}`);
  }

  const { prefillData, openKey } = useSheet();

  return (
    /* Outer container — always in DOM, pointer events only when open */
    <div
      className={`fixed inset-0 z-[60] ${addShirtOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${animIn ? 'opacity-100' : 'opacity-0'}`}
        onClick={closeAddShirt}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 mx-auto max-w-2xl flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${animIn ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ borderRadius: '24px 24px 0 0', maxHeight: '90dvh', height: '90dvh', backgroundColor: '#0D0D0D' }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Drag handle ──────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
          onMouseDown={onDragStart}
          onMouseMove={isDragging.current ? onDragMove : undefined}
          onMouseUp={onDragEnd}
          aria-hidden="true"
        >
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 relative flex items-center justify-center px-5 py-3.5 border-b border-gray-700">
          <h2 className="text-base font-bold text-gray-50 tracking-tight">Add Shirt</h2>
          <button
            onClick={closeAddShirt}
            className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-50 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable form content ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-5">
            <AddEditShirt
              key={openKey}
              forceNewMode
              initialData={prefillData}
              onComplete={handleSaved}
              onCancel={closeAddShirt}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
