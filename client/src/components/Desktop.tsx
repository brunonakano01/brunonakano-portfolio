/**
 * Desktop Component - Mode A (Folders)
 * Design: Brutalist Digital Minimalism
 * Draggable folder icons on a gradient desktop, opens windows on click
 */
import { useState, useCallback } from 'react';
import DraggableIcon from '@/components/DraggableIcon';
import Window from '@/components/Window';
import EyeCharacter from '@/components/EyeCharacter';
import {
  SocialInteractiveContent,
  BrandDesignContent,
  CampaignEventContent,
  PotteryContent,
  AboutContent,
  IndexContent,
} from '@/components/FolderContent';

interface DesktopProps {
  gradientColor: string;
}

// Per-folder vibrant background colors and matching text color
export const FOLDER_COLORS: Record<string, { bg: string; text: string }> = {
  campaignevent: { bg: '#3ecf4c', text: '#000000' },   // bold green
  social:        { bg: '#bf5fff', text: '#000000' },   // bright purple
  branddesign:   { bg: '#e8f542', text: '#000000' },   // electric yellow
  pottery:       { bg: '#ff4800', text: '#000000' },   // vivid orange
  about:         { bg: '#3ab0ff', text: '#000000' },   // bright sky blue
  index:         { bg: '#c8c8c8', text: '#000000' },   // grey
};

export const sectionMap: Record<string, { label: string; component: React.ComponentType<any> }> = {
  campaignevent: { label: 'Campaigns and Events', component: CampaignEventContent },
  social: { label: 'Social and Interactive', component: SocialInteractiveContent },
  branddesign: { label: 'Brand Design and Illustration', component: BrandDesignContent },
  pottery: { label: 'Ceramics and Furniture', component: PotteryContent },
  about: { label: 'Info', component: AboutContent },
};

// Initial icon positions — scattered across the desktop
function getInitialPositions() {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
  return {
    campaignevent: { x: Math.round(vw * 0.05), y: Math.round(vh * 0.16) },
    social:        { x: Math.round(vw * 0.18), y: Math.round(vh * 0.22) },
    branddesign:   { x: Math.round(vw * 0.12), y: Math.round(vh * 0.38) },
    about:         { x: Math.round(vw * 0.80), y: Math.round(vh * 0.22) },
    pottery:       { x: Math.round(vw * 0.72), y: Math.round(vh * 0.48) },
  };
}

export default function Desktop({ gradientColor }: DesktopProps) {
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showIndex, setShowIndex] = useState(false);
  const [folderInitialProject, setFolderInitialProject] = useState<Record<string, string>>({});
  const handleOpenFolder = useCallback((id: string) => {
    setOpenFolders(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
    setActiveFolder(id);
  }, []);

  const handleCloseFolder = useCallback((id: string) => {
    setOpenFolders(prev => prev.filter(f => f !== id));
    setActiveFolder(prev => (prev === id ? null : prev));
  }, []);

  const handleFolderClick = useCallback((id: string) => {
    if (openFolders.includes(id)) {
      setActiveFolder(id);
    } else {
      handleOpenFolder(id);
    }
  }, [openFolders, handleOpenFolder]);

  const initialPositions = getInitialPositions();

  const hasOpenWindows = openFolders.length > 0 || showIndex;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Click-outside overlay */}
      {hasOpenWindows && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 39 }}
          onClick={() => { setOpenFolders([]); setShowIndex(false); setActiveFolder(null); }}
        />
      )}

      {/* Eye-tracking character — center of desktop, fades out when windows open */}
      <EyeCharacter hasOpenWindows={hasOpenWindows} isBlurred={hasOpenWindows} />

      {/* Draggable folder icons */}
      {Object.entries(sectionMap).map(([id, { label }]) => (
        <DraggableIcon
          key={id}
          id={id}
          label={label}
          initialPosition={initialPositions[id as keyof typeof initialPositions] || { x: 100, y: 100 }}
          onClick={() => handleFolderClick(id)}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          isBlurred={hasOpenWindows}
          bgColor={(FOLDER_COLORS[id] || { bg: 'transparent' }).bg}
        />
      ))}

      {/* Open folder windows */}
      {openFolders.map((folderId, index) => {
        if (!sectionMap[folderId]) return null;
        const ContentComponent = sectionMap[folderId].component;
        const colors = FOLDER_COLORS[folderId] || { bg: '#ffffff', text: '#000000' };
        return (
          <Window
            key={folderId}
            id={folderId}
            title={sectionMap[folderId].label}
            isActive={activeFolder === folderId}
            onClose={() => handleCloseFolder(folderId)}
            onClick={() => setActiveFolder(folderId)}
            initialPosition={{ x: 80 + index * 30, y: 80 + index * 30 }}
            bgColor={colors.bg}
            textColor={colors.text}
          >
            <ContentComponent initialExpandedProject={folderInitialProject[folderId]} />
          </Window>
        );
      })}
    </div>
  );
}
