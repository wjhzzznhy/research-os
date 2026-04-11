"use client";

import { useState, useRef, useEffect, MouseEvent, TouchEvent } from "react";
import { Settings } from "lucide-react";

interface AppHeaderProps {
  onOpenSettings?: () => void;
}

export default function AppHeader({ onOpenSettings }: AppHeaderProps) {
  const [position, setPosition] = useState({ top: 16, right: 16 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ top: 16, right: 16 });
  const hasMovedRef = useRef(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Helper to create global overlay to prevent iframe interference
  const addOverlay = () => {
    if (document.getElementById('header-drag-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'header-drag-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;cursor:grabbing;';
    document.body.appendChild(overlay);
  };

  const removeOverlay = () => {
    const overlay = document.getElementById('header-drag-overlay');
    if (overlay) overlay.remove();
  };

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
      if (!isDraggingRef.current || !buttonRef.current) return;
      
      // Prevent default to avoid text selection or scrolling
      if (e.cancelable) e.preventDefault();
      
      let clientX: number | undefined;
      let clientY: number | undefined;

      if ('touches' in e) {
        clientX = e.touches[0]?.clientX;
        clientY = e.touches[0]?.clientY;
      } else {
        clientX = (e as globalThis.MouseEvent).clientX;
        clientY = (e as globalThis.MouseEvent).clientY;
      }
      
      if (clientX === undefined || clientY === undefined) return;

      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;
      
      // Calculate new position
      // Moving mouse LEFT (negative deltaX) -> right value increases
      // Moving mouse DOWN (positive deltaY) -> top value increases
      let newRight = initialPosRef.current.right - deltaX;
      let newTop = initialPosRef.current.top + deltaY;

      // Boundary checks
      const BUTTON_SIZE = 40; // Approximate size
      const MARGIN = 10;
      // const maxX = window.innerWidth - BUTTON_SIZE - MARGIN;
      // const maxY = window.innerHeight - BUTTON_SIZE - MARGIN;

      // Clamp values
      // Right: min MARGIN, max window.innerWidth - BUTTON_SIZE - MARGIN
      // Note: right is distance from right edge. 
      // max right means button is at left edge.
      newRight = Math.max(MARGIN, Math.min(window.innerWidth - BUTTON_SIZE - MARGIN, newRight));
      newTop = Math.max(MARGIN, Math.min(window.innerHeight - BUTTON_SIZE - MARGIN, newTop));

      // Direct DOM manipulation for smooth performance
      buttonRef.current.style.top = `${newTop}px`;
      buttonRef.current.style.right = `${newRight}px`;
      
      if (!hasMovedRef.current && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
        hasMovedRef.current = true;
        addOverlay(); // Add overlay only when drag starts
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current && buttonRef.current) {
        isDraggingRef.current = false;
        removeOverlay(); // Remove overlay
        // Sync state with final DOM position
        const style = window.getComputedStyle(buttonRef.current);
        setPosition({
          top: parseInt(style.top, 10),
          right: parseInt(style.right, 10)
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove as any);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove as any, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
    
    return () => {
      removeOverlay(); // Cleanup on unmount
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove as any);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  const handleStart = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = { x: clientX, y: clientY };
    initialPosRef.current = { ...position };
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    handleStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleClick = (e: MouseEvent) => {
      if (hasMovedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
      }
      onOpenSettings && onOpenSettings();
  };

  return (
    <div 
        ref={buttonRef}
        className="fixed z-50 select-none touch-none cursor-grab active:cursor-grabbing" 
        style={{ top: position.top, right: position.right }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
    >
      <button
        type="button"
        onClick={handleClick}
        className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-full shadow-md border border-gray-200/50 hover:shadow-lg group"
        aria-label="配置"
        title="配置 (可拖动)"
      >
        <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
      </button>
    </div>
  );
}
