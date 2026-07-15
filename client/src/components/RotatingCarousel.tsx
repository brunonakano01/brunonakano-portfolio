/**
 * RotatingCarousel — Mode C
 * Original implementation: 6 project images orbit in a circle around the
 * 3D Memoji face. Mouse controls 3D tilt and eye movement.
 * Carousel pauses on section hover, ABOUT box appears on face hover.
 */
import { useState, useEffect, useRef } from 'react';

interface RotatingCarouselProps {
  onSectionClick: (sectionId: string) => void;
  onOpenAll?: () => void;
  onCloseAll?: () => void;
  openFoldersCount?: number;
}

const sections = [
  {
    id: 'campaignevent',
    name: 'CAMPAIGNS AND EVENTS',
    image: '/assets/carousel-campaign_9bc58fb9_6d7247.gif',
  },
  {
    id: 'social',
    name: 'SOCIAL AND INTERACTIVE',
    image: '/assets/carousel-interactive_aaf35a90_badf1f.gif',
  },
  {
    id: 'branddesign',
    name: 'BRAND DESIGN AND ILLUSTRATION',
    image: '/assets/carousel-brand_c6a65efd_27bedc.gif',
  },
  {
    id: 'pottery',
    name: 'CERAMICS AND FURNITURE',
    image: '/assets/carousel-pottery_a0f1b103_f86f91.png',
  },
];
// Note: 'about' is handled separately via the face click in the carousel (not a carousel section)

export default function RotatingCarousel({ onSectionClick }: RotatingCarouselProps) {
  const [rotation, setRotation] = useState(0);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [headAnimPhase, setHeadAnimPhase] = useState(0);
  const [isHoveringFace, setIsHoveringFace] = useState(false);
  const [faceClicked, setFaceClicked] = useState(false);
  const [isHoveringSection, setIsHoveringSection] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(0.2);
  const intervalRef = useRef<number | null>(null);

  // Head idle animation
  useEffect(() => {
    const headTimer = setInterval(() => {
      setHeadAnimPhase((prev) => (prev + 0.015) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(headTimer);
  }, []);

  useEffect(() => {
    if (!isHoveringSection) {
      intervalRef.current = window.setInterval(() => {
        setRotation((prev) => (prev + rotationSpeed) % 360);
        setRotationSpeed((prevSpeed) => Math.min(prevSpeed + 0.01, 0.2));
      }, 16);
    } else {
      setRotationSpeed(0.05);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isHoveringSection, rotationSpeed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const radius = 220;
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  const mouseXNorm = mousePos.x / window.innerWidth;
  const mouseYNorm = mousePos.y / window.innerHeight;
  const rotateY = (mouseXNorm - 0.5) * 15;
  const rotateX = (mouseYNorm - 0.5) * -15;

  const distanceToFace = Math.sqrt(
    Math.pow(mousePos.x - centerX, 2) + Math.pow(mousePos.y - centerY, 2)
  );
  const maxDistance = Math.sqrt(Math.pow(window.innerWidth / 2, 2) + Math.pow(window.innerHeight / 2, 2));
  const normalizedDistance = Math.min(distanceToFace / maxDistance, 1);
  const eyeScale = 1.1 - (normalizedDistance * 0.2);

  const headIdleX = Math.sin(headAnimPhase) * 3;
  const headIdleY = Math.cos(headAnimPhase * 0.7) * 2;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ perspective: '1200px' }}>
      {/* 3D container for carousel */}
      <div
        className="absolute inset-0 transition-transform duration-150 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          zIndex: 10,
        }}
      >
        {/* Rotating rectangles */}
        {sections.map((section, index) => {
          const angle = (index / sections.length) * 360 + rotation;
          const angleRad = (angle * Math.PI) / 180;
          const x = centerX + radius * Math.cos(angleRad);
          const y = centerY + radius * Math.sin(angleRad);

          return (
            <div
              key={section.id}
              className="absolute cursor-pointer"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)',
                width: '130px',
                height: '87px',
                zIndex: 20,
              }}
              onClick={() => onSectionClick(section.id)}
              onMouseEnter={() => {
                setHoveredSection(section.id);
                setIsHoveringSection(true);
              }}
              onMouseLeave={() => {
                setHoveredSection(null);
                setIsHoveringSection(false);
              }}
            >
              <div className="w-full h-full relative overflow-hidden">
                {section.image && (
                  <img
                    src={section.image}
                    alt={section.name}
                    className="w-full h-full object-cover transition-transform duration-500"
                    style={{ transform: hoveredSection === section.id ? 'scale(1.08)' : 'scale(1)' }}
                  />
                )}
                <div
                  className="absolute inset-0 bg-black transition-opacity duration-300"
                  style={{ opacity: hoveredSection === section.id ? 0.15 : 0 }}
                />
              </div>
            </div>
          );
        })}

        {/* Mouse-following label */}
        {hoveredSection && (
          <div
            className="fixed pointer-events-none z-50"
            style={{
              left: `${mousePos.x + 15}px`,
              top: `${mousePos.y + 15}px`,
            }}
          >
            <div className="bg-white border-2 border-black px-3 py-2">
              <div className="text-[13px] font-semibold whitespace-nowrap" style={{fontFamily:"'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",letterSpacing:'-0.01em'}}>
                {sections.find(s => s.id === hoveredSection)?.name}
              </div>
            </div>
          </div>
        )}

        {/* ABOUT box at mouth - appears when hovering face */}
        {isHoveringFace && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${centerX + headIdleX}px`,
              top: `${centerY + headIdleY + 85}px`,
              transform: 'translate(-50%, 0)',
              zIndex: 100,
            }}
          >
            <div className="bg-white border-2 border-black px-3 py-2">
              <div className="text-[13px] font-semibold whitespace-nowrap" style={{fontFamily:"'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",letterSpacing:'-0.01em'}}>
                About
              </div>
            </div>
          </div>
        )}

        {/* Center dot indicator */}
        <div
          className="absolute w-4 h-4 bg-black rounded-full"
          style={{
            left: `${centerX}px`,
            top: `${centerY}px`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Face with mouse-following eyes in center */}
      <div
        className="absolute cursor-pointer"
        style={{
          left: `${centerX + headIdleX}px`,
          top: `${centerY + headIdleY}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 30,
          perspective: '1000px',
          pointerEvents: 'auto',
        }}
        onMouseEnter={() => setIsHoveringFace(true)}
        onMouseLeave={() => setIsHoveringFace(false)}
        onClick={() => {
          setFaceClicked(true);
          setTimeout(() => setFaceClicked(false), 300);
          onSectionClick('about');
        }}
      >
        <div
          className="relative"
          style={{
            width: '150px',
            height: '150px',
            transform: `rotateY(${(mouseXNorm - 0.5) * 12}deg) rotateX(${(mouseYNorm - 0.5) * -8}deg) translateZ(${Math.abs((mouseXNorm - 0.5) * 10)}px) scale(${isHoveringFace ? (faceClicked ? 0.95 : 1.05) : 1})`,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {/* Face image - base layer */}
          <img
            src="/assets/WTrwHoVZOUppoRAG_5ee17c.png"
            alt="Face"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ zIndex: 2 }}
          />
          {/* Left eye */}
          <div className="absolute" style={{ left: '50px', top: '70px', width: '14px', height: '14px', zIndex: 1 }}>
            <div className="relative w-full h-full">
              <img
                src="/assets/lFEwsmEYeozKMXct_a7db58.png"
                alt="Eye"
                className="absolute"
                style={{
                  width: '14px',
                  height: '14px',
                  left: `${(mouseXNorm - 0.5) * 10}px`,
                  top: `${(mouseYNorm - 0.5) * 6}px`,
                  transform: `scale(${eyeScale})`,
                  transformOrigin: 'center',
                  transition: 'left 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.3s ease-out',
                }}
              />
            </div>
          </div>
          {/* Right eye */}
          <div className="absolute" style={{ left: '90px', top: '70px', width: '14px', height: '14px', zIndex: 1 }}>
            <div className="relative w-full h-full">
              <img
                src="/assets/lFEwsmEYeozKMXct_a7db58.png"
                alt="Eye"
                className="absolute"
                style={{
                  width: '14px',
                  height: '14px',
                  left: `${(mouseXNorm - 0.5) * 10}px`,
                  top: `${(mouseYNorm - 0.5) * 6}px`,
                  transform: `scale(${eyeScale})`,
                  transformOrigin: 'center',
                  transition: 'left 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.3s ease-out',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
