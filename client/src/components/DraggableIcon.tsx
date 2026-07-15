/**
 * DraggableIcon Component
 * Design: Brutalist Digital Minimalism
 * - Folder: solid black straight-line SVG, section name label below
 * - About: headshot photo
 * - Chat: 💬 bubble emoji
 */
import { useState, useRef, useEffect } from 'react';

interface DraggableIconProps {
  id: string;
  label: string;
  initialPosition: { x: number; y: number };
  onClick: () => void;
  color?: string;
  bgColor?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isBlurred?: boolean;
}

export default function DraggableIcon({ id, label, initialPosition, onClick, bgColor, onDragStart, onDragEnd, isBlurred }: DraggableIconProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const moveThreshold = 5;
  const startPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    setHasMoved(false);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - startPosRef.current.x;
        const dy = e.clientY - startPosRef.current.y;
        if (!hasMoved && Math.sqrt(dx * dx + dy * dy) > moveThreshold) {
          setHasMoved(true);
          onDragStart?.();
        }
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (hasMoved) onDragEnd?.();
      }
    };
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, hasMoved, onDragStart, onDragEnd]);

  const handleClick = () => {
    if (!hasMoved) onClick();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const isChat = id === 'webcam';
  const isAbout = id === 'about';
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      ref={iconRef}
      className="absolute pointer-events-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: isDragging ? 15 : 10,
        cursor: 'none',
        userSelect: 'none',
        filter: isBlurred ? 'blur(8px)' : 'none',
        transition: 'filter 0.25s ease',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="button"
      aria-label={`Open ${label} folder`}
    >
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '5px',
          background: 'transparent',
        }}
      >
        {/* Icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isAbout ? (
            /* About: ⓘ emoji — no hover change */
            <span style={{ fontSize: '42px', lineHeight: 1, display: 'block' }}>ⓘ</span>
          ) : isChat ? (
            /* Chat: speech bubble emoji */
            <span style={{ fontSize: '40px', lineHeight: 1, display: 'block' }}>💬</span>
          ) : (
            /* Folder: pixel-art style with stepped black border, filled with folder color */
            <svg width="64" height="54" viewBox="0 0 64 54" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* === BLACK OUTLINE (drawn as filled shape) === */}
              {/* Tab outline */}
              <rect x="2" y="2" width="2" height="2" fill="#000" />
              <rect x="4" y="0" width="22" height="2" fill="#000" />
              <rect x="26" y="2" width="2" height="2" fill="#000" />
              <rect x="28" y="4" width="2" height="2" fill="#000" />
              <rect x="30" y="6" width="32" height="2" fill="#000" />
              {/* Top edge of body */}
              <rect x="0" y="8" width="2" height="2" fill="#000" />
              <rect x="0" y="10" width="62" height="2" fill="#000" />
              <rect x="62" y="8" width="2" height="2" fill="#000" />
              {/* Left edge */}
              <rect x="0" y="12" width="2" height="36" fill="#000" />
              {/* Right edge */}
              <rect x="62" y="10" width="2" height="38" fill="#000" />
              {/* Bottom edge */}
              <rect x="2" y="48" width="2" height="2" fill="#000" />
              <rect x="4" y="50" width="56" height="2" fill="#000" />
              <rect x="60" y="48" width="2" height="2" fill="#000" />
              {/* Shelf line outline */}
              <rect x="0" y="16" width="62" height="2" fill="#000" />

              {/* === FOLDER COLOR FILL === */}
              {/* Tab fill */}
              <rect x="4" y="2" width="22" height="2" fill={bgColor || '#000'} />
              <rect x="2" y="4" width="26" height="2" fill={bgColor || '#000'} />
              <rect x="2" y="6" width="28" height="2" fill={bgColor || '#000'} />
              {/* Body fill above shelf */}
              <rect x="2" y="12" width="60" height="4" fill={bgColor || '#000'} />
              {/* Body fill below shelf */}
              <rect x="2" y="18" width="60" height="30" fill={bgColor || '#000'} />
            </svg>
          )}
        </div>

        {/* Section name label below icon */}
        {!isChat && (
          <div
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: '11px',
              fontWeight: '500',
              textTransform: 'none',
              textAlign: 'center',
              color: isHovered ? '#ffffff' : '#000000',
              background: isHovered ? '#000000' : 'transparent',
              lineHeight: 1.4,
              letterSpacing: '-0.01em',
              maxWidth: '88px',
              wordBreak: 'break-word',
              padding: isHovered ? '1px 4px' : '1px 4px',
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
