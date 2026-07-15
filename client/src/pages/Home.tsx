/**
 * Home Page
 * Design: Brutalist Digital Minimalism - browser-styled portfolio with OS-like interface
 * - Chat window closed by default
 * - INDEX button visible in ALL modes (folders, physics, balloon)
 * - SWITCH NAV moved to bottom-6 (lower)
 * - Random color gradient: solid color block at BOTTOM fading to white at TOP
 * - Color changes on each page load and each mode switch
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useExperience } from '@/contexts/ExperienceContext';
import Desktop, { FOLDER_COLORS, sectionMap as sharedSectionMap } from "@/components/Desktop";
import MobileView from "@/components/MobileView";
import PhysicsBalls from "@/components/PhysicsBalls";
import Window from "@/components/Window";
import { IndexContent } from "@/components/FolderContent";

function ClockDisplay() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const ptTime = new Date(time.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const hours = ptTime.getHours().toString().padStart(2, '0');
  const minutes = ptTime.getMinutes().toString().padStart(2, '0');
  return <span>{hours}:{minutes} PT</span>;
}


// Wave easter egg: each character ripples up then back down sporadically
function WaveName({ text, isBlurred, blurStyle }: { text: string; isBlurred: boolean; blurStyle: string }) {
  const [waveActive, setWaveActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waveCooldownRef = useRef(false);

  const triggerWave = () => {
    if (waveActive || waveCooldownRef.current) return;
    waveCooldownRef.current = true;
    setWaveActive(true);
    setTimeout(() => {
      setWaveActive(false);
      // Cooldown so hover can't spam it
      setTimeout(() => { waveCooldownRef.current = false; }, 1200);
    }, text.length * 80 + 700);
  };

  useEffect(() => {
    // Schedule the next wave at a random interval between 8s and 22s
    const scheduleWave = () => {
      const delay = 8000 + Math.random() * 14000;
      timeoutRef.current = setTimeout(() => {
        triggerWave();
        scheduleWave();
      }, delay);
    };
    scheduleWave();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [text]);

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]"
      style={{ filter: blurStyle, transition: 'filter 0.25s ease', cursor: 'default' }}
      onMouseEnter={triggerWave}
    >
      <h1
        className="text-[14.5px] font-semibold"
        style={{ fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif", letterSpacing: '-0.02em', display: 'inline-flex' }}
      >
        {text.split('').map((char, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              animation: waveActive ? `nameWave 0.6s cubic-bezier(0.23,1,0.32,1) ${i * 80}ms both` : 'none',
              whiteSpace: char === ' ' ? 'pre' : undefined,
            }}
          >
            {char}
          </span>
        ))}
      </h1>
      <style>{`
        @keyframes nameWave {
          0%   { transform: translateY(0); }
          30%  { transform: translateY(-7px); }
          60%  { transform: translateY(2px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const { experience, setExperience } = useExperience();
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const [showIndex, setShowIndex] = useState(false);
  const [folderInitialProject, setFolderInitialProject] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSectionClick = (sectionId: string) => {
    setOpenFolders(prev => {
      if (prev.includes(sectionId)) return prev;
      return [...prev, sectionId];
    });
  };

  const handleCloseFolder = (folderId: string) => {
    setOpenFolders(prev => prev.filter(id => id !== folderId));
  };

  const handleOpenAll = () => {
    const allIds = Object.keys(sectionMap);
    setOpenFolders(allIds);
  };

  const handleCloseAll = () => {
    setOpenFolders([]);
  };

  // Use the shared sectionMap from Desktop so both modes stay in sync
  const sectionMap = sharedSectionMap;

  const toggleExperience = useCallback(() => {
    setExperience(experience === 'folders' ? 'physics' : 'folders');
  }, [experience, setExperience]);

  const hasContentWindowBC = openFolders.filter(id => id !== 'webcam').length > 0 || showIndex;

  const backgroundStyle = {
    background: '#ffffff',
  };

  // Mode A: blur header when any window is open
  const modeAHasOpenWindows = experience === 'folders' && (openFolders.length > 0 || showIndex);
  const modeAHeaderBlur = modeAHasOpenWindows ? 'blur(8px)' : 'none';

  return (
    <div className="min-h-screen flex flex-col relative" style={backgroundStyle}>
      {/* Top header layout - contact info on sides, name in center — desktop only */}
      {!isMobile && (
        <>
          <div className="fixed top-6 left-6 z-[60] text-[14.5px] leading-relaxed" style={{fontFamily:"'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",letterSpacing:'-0.01em',filter:modeAHeaderBlur,transition:'filter 0.25s ease'}}>
            <div className="font-medium">Creative Director @ Meta</div>
            <div><a href="mailto:hello@brunonakano.com" className="hover:underline font-medium">hello@brunonakano.com</a></div>
          </div>
          <WaveName text="(Bruno Nakano)" isBlurred={modeAHasOpenWindows} blurStyle={modeAHeaderBlur} />
          <div className="fixed top-6 right-6 z-[60] text-[14.5px] leading-relaxed text-right" style={{fontFamily:"'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",letterSpacing:'-0.01em',filter:modeAHeaderBlur,transition:'filter 0.25s ease'}}>
            <div>Los Angeles, CA</div>
            <div><ClockDisplay /></div>
          </div>
        </>
      )}

      {/* Click-outside overlay for Mode B when windows open */}
      {experience !== 'folders' && hasContentWindowBC && (
        <div
          className="fixed inset-0 z-[40]"
          onClick={() => { setOpenFolders([]); setShowIndex(false); }}
        />
      )}

      {/* Click-outside overlay for folders mode (no blur) */}
      {experience === 'folders' && (openFolders.length > 0 || showIndex) && (
        <div
          className="fixed inset-0 z-[40]"
          onClick={() => { setOpenFolders([]); setShowIndex(false); }}
        />
      )}

      {/* SWITCH NAV button - desktop only */}
      {!isMobile && (
        <button
          onClick={toggleExperience}
          className="fixed bottom-6 right-6 z-[200] bg-transparent border-0 px-3 py-2 text-[14.5px] font-medium gradient-text hover:bg-black hover:text-white transition-all outline-none focus:outline-none" style={{fontFamily:"'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",letterSpacing:'-0.01em'}}
        >
          SWITCH NAV
        </button>
      )}

      {/* INDEX button - desktop only */}
      {!isMobile && (
        <>
          <button
            onClick={() => setShowIndex(true)}
            className="fixed bottom-6 left-6 z-[200] bg-transparent border-0 px-2 py-1 text-[14.5px] font-medium pointer-events-auto cursor-pointer hover:bg-black hover:text-white transition-colors outline-none focus:outline-none" style={{fontFamily:"'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",letterSpacing:'-0.01em'}}
          >
            INDEX
          </button>
          {showIndex && (
            <Window
              key="index"
              id="index"
              title="INDEX"
              isActive={true}
              onClose={() => setShowIndex(false)}
              onClick={() => {}}
              initialPosition={{ x: Math.max(20, (window.innerWidth - 900) / 2), y: 60 }}
              initialSize={{ width: Math.min(900, window.innerWidth - 40), height: window.innerHeight - 120 }}
              bgColor="#c8c8c8"
              textColor="#000000"
            >
              <IndexContent onProjectClick={(sectionId, projectId) => {
                if (projectId) {
                  setFolderInitialProject(prev => ({ ...prev, [sectionId]: projectId }));
                }
                setShowIndex(false);
                handleSectionClick(sectionId);
              }} />
            </Window>
          )}
        </>
      )}

      {isMobile ? (
        <MobileView />
      ) : experience === 'folders' ? (
        <Desktop gradientColor="#ffffff" />
      ) : experience === 'physics' ? (
        <>
          {/* Blurred background layer — white page + balls */}
          <div
            className="fixed inset-0"
            style={{
              filter: hasContentWindowBC ? 'blur(8px)' : 'none',
              transition: 'filter 0.25s ease',
              zIndex: 1,
              background: '#ffffff',
            }}
          >
            <PhysicsBalls onSectionClick={handleSectionClick} isBlurred={false} />
          </div>
          {openFolders.map((folderId, index) => {
            if (!sectionMap[folderId]) return null;
            const ContentComponent = sectionMap[folderId].component;
            const colors = FOLDER_COLORS[folderId] || { bg: '#ffffff', text: '#000000' };
            return (
              <Window
                key={folderId}
                id={folderId}
                title={sectionMap[folderId].label}
                isActive={index === openFolders.length - 1}
                onClose={() => handleCloseFolder(folderId)}
                onClick={() => {}}
                initialPosition={{ x: 80 + index * 30, y: 80 + index * 30 }}
                bgColor={colors.bg}
                textColor={colors.text}
              >
                <ContentComponent initialExpandedProject={folderInitialProject[folderId]} />
              </Window>
            );
          })}
        </>
      ) : null}
    </div>
  );
}
