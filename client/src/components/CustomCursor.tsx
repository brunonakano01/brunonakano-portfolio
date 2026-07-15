/**
 * CustomCursor Component
 * White circle with black border by default.
 * Fills solid black when hovering over any clickable element.
 */
import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const posRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
        }
        rafRef.current = null;
      });
    };

    const checkHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickable = target.closest(
        'a, button, [role="button"], input, select, textarea, label, [tabindex], canvas'
      );
      setIsHovering(!!clickable);
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseover', checkHover);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', checkHover);
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
        width: 16,
        height: 16,
        borderRadius: '50%',
        border: '1.5px solid #000000',
        backgroundColor: isHovering ? '#000000' : '#ffffff',
        transform: 'translate(-100px, -100px)',
        pointerEvents: 'none',
        zIndex: 99999,
        marginLeft: -8,
        marginTop: -8,
        transition: 'background-color 0.12s ease',
        mixBlendMode: 'normal',
      }}
    />
  );
}
