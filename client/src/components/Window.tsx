/**
 * Window Component
 * Design: Brutalist Digital Minimalism - draggable, resizable, thick borders, mechanical motion
 * Exact replica of original
 */
import { useState, useRef, useEffect } from 'react';

interface WindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isActive: boolean;
  onClose: () => void;
  onClick: () => void;
  color?: string;
  bgColor?: string;
  textColor?: string;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
}

type ResizeDirection = 'se' | 'sw' | 'ne' | 'nw' | null;

export default function Window({ id, title, children, isActive, onClose, onClick, color = 'white', bgColor = '#000000', textColor = '#ffffff', initialPosition, initialSize }: WindowProps) {
  const [position, setPosition] = useState(initialPosition || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 150 });
  const [size, setSize] = useState(initialSize || { width: 1100, height: 720 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-controls')) return;
    onClick();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !isMaximized) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
      if (isResizing && resizeDirection) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = resizeStart.posX;
        let newY = resizeStart.posY;
        // Handle horizontal resizing
        if (resizeDirection.includes('e')) {
          newWidth = Math.max(300, resizeStart.width + deltaX);
        } else if (resizeDirection.includes('w')) {
          newWidth = Math.max(300, resizeStart.width - deltaX);
          if (newWidth > 300) {
            newX = resizeStart.posX + deltaX;
          }
        }
        // Handle vertical resizing
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(200, resizeStart.height + deltaY);
        } else if (resizeDirection.includes('n')) {
          newHeight = Math.max(200, resizeStart.height - deltaY);
          if (newHeight > 200) {
            newY = resizeStart.posY + deltaY;
          }
        }
        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
    };
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, isMaximized, resizeDirection]);

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleDoubleClick = () => {
    setIsMaximized(!isMaximized);
  };

  // Header is fixed at top-6 (24px) with ~3 lines of 13px text + padding ≈ 96px total
  const HEADER_HEIGHT = 96;
  const windowStyle = isMaximized
    ? { left: 0, top: HEADER_HEIGHT, width: '100%', height: `calc(100% - ${HEADER_HEIGHT}px)` }
    : { left: `${position.x}px`, top: `${position.y}px`, width: `${size.width}px`, height: `${size.height}px` };

  return (
    <div
      ref={windowRef}
      className="window pointer-events-auto"
      style={{
        ...windowStyle,
        zIndex: isActive ? 200 : 150,
        ['--folder-bg' as any]: bgColor,
        ['--folder-text' as any]: textColor,
        ['--folder-muted' as any]: textColor,
      }}
      onClick={onClick}
    >
      {/* Title Bar */}
      <div
        className="window-title-bar"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <span className={title.length <= 2 && title.charCodeAt(0) > 127 ? 'text-[23.5px] leading-none' : 'text-[14.5px] font-semibold'} style={{ flex: 1, textAlign: 'center', fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif", letterSpacing: '-0.01em' }}>
          {title}
        </span>
        <div className="window-controls flex gap-3" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}>
          <button
            className="hover:opacity-70 outline-none focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handleMaximize();
            }}
            aria-label="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="1" width="8" height="8" />
            </svg>
          </button>
          <button
            className="hover:opacity-70 outline-none focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1l8 8M9 1L1 9" />
            </svg>
          </button>
        </div>
      </div>
      {/* Content */}
      <div className="relative window-scrollbar" style={{ height: 'calc(100% - 32px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', overflowY: 'auto', background: bgColor, color: textColor, cursor: 'none' }}>
        {children}
      </div>
      {/* Resize Handle - Bottom-right only */}
      {!isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50"
          onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          style={{
            background: 'linear-gradient(135deg, transparent 50%, #555 50%)',
          }}
        />
      )}
    </div>
  );
}
