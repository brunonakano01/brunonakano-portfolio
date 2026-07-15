/**
 * FlyCursor — white circle custom cursor for all modes.
 * Always at z-index max so it's above every window.
 */
import { useEffect, useRef, useState } from 'react';

const CIRCLE_SIZE = 13; // px — white circle with black border

export default function FlyCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -200, y: -200 });
  const rafRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);

  // Persistent cursor:none
  useEffect(() => {
    if (document.getElementById('custom-cursor-hide')) return;
    const style = document.createElement('style');
    style.id = 'custom-cursor-hide';
    style.textContent = `*, *::before, *::after { cursor: none !important; }`;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate(${posRef.current.x - CIRCLE_SIZE / 2}px, ${posRef.current.y - CIRCLE_SIZE / 2}px)`;
        }
        rafRef.current = null;
      });

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const interactive = el?.closest('a, button, [role="button"], input, select, textarea, [onclick], label');
      setHovered(!!interactive);
    };

    document.addEventListener('mousemove', move);
    return () => {
      document.removeEventListener('mousemove', move);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: '50%',
        background: hovered ? '#000000' : '#ffffff',
        border: '1.5px solid #000000',
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 2147483647,
        transform: `translate(-200px, -200px)`,
        transition: 'background 120ms ease-out',
      }}
    />
  );
}
