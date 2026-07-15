// EyeCharacter — pixel-art face with directional eye sprites.
// Switches between center/up/down/left/right/up-left/up-right/down-left/down-right based on cursor angle.
// Fades out when any folder window is open.

import { useEffect, useRef, useState } from 'react';

// Uploaded sprite URLs
const SPRITES = {
  center:     '/assets/center_cfa93e8c_6b62fb.png',
  up:         '/assets/up_429113e4_57e9aa.png',
  down:       '/assets/down_c3967a0f_186e3b.png',
  left:       '/assets/left_502c1109_0e154c.png',
  right:      '/assets/right_0f055a49_6f2c71.png',
  'up-left':    '/assets/up-left_ef79073f_5bc82f.png',
  'up-right':   '/assets/up-right_2dc6850e_d4fce6.png',
  'down-left':  '/assets/down-left_0c3351e0_26da7b.png',
  'down-right': '/assets/down-right_14b9aefe_cc5be7.png',
};

type Direction = keyof typeof SPRITES;

function getDirection(dx: number, dy: number): Direction {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 80) return 'center';

  const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180

  // Divide 360° into 8 equal 45° sectors, offset by 22.5° so cardinal/diagonal boundaries are clean
  // Up:         -112.5 to -67.5
  // Up-right:    -67.5 to -22.5
  // Right:       -22.5 to  22.5
  // Down-right:   22.5 to  67.5
  // Down:         67.5 to 112.5
  // Down-left:   112.5 to 157.5
  // Left:        157.5 to 180 OR -180 to -157.5
  // Up-left:    -157.5 to -112.5

  if (angle >= -112.5 && angle < -67.5) return 'up';
  if (angle >= -67.5  && angle < -22.5) return 'up-right';
  if (angle >= -22.5  && angle <  22.5) return 'right';
  if (angle >=  22.5  && angle <  67.5) return 'down-right';
  if (angle >=  67.5  && angle < 112.5) return 'down';
  if (angle >= 112.5  && angle < 157.5) return 'down-left';
  if (angle >= -157.5 && angle < -112.5) return 'up-left';
  // Remaining: 157.5 to 180 and -180 to -157.5 → left
  return 'left';
}

interface EyeCharacterProps {
  hasOpenWindows: boolean;
  isBlurred?: boolean;
}

export default function EyeCharacter({ hasOpenWindows, isBlurred }: EyeCharacterProps) {
  const [direction, setDirection] = useState<Direction>('center');
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      setDirection(getDirection(dx, dy));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const containerSize = 140;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
        pointerEvents: 'none',
        transition: 'opacity 0.5s ease',
        opacity: hasOpenWindows ? 0 : visible ? 1 : 0,
        filter: isBlurred ? 'blur(8px)' : 'none',
        userSelect: 'none',
        width: containerSize,
        height: containerSize,
      }}
    >
      <img
        src={SPRITES[direction]}
        alt="Bruno"
        draggable={false}
        style={{
          width: containerSize,
          height: containerSize,
          objectFit: 'contain',
          display: 'block',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}
