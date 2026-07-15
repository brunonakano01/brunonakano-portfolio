/**
 * FolderContent Components
 * Design: Brutalist Digital Minimalism - structured content layouts with thick borders
 */

import React, { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import VimeoEmbed, { VIMEO_THUMBS } from './VimeoEmbed';

// AutoplayVideo: plays when visible in viewport, pauses when not
function AutoplayVideo({ src, aspectRatio, videoWidth, poster, style }: { src: string; aspectRatio?: string; videoWidth?: string; poster?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { el.play().catch(() => {}); }
        else { el.pause(); }
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      loop
      muted
      playsInline
      poster={poster}
      style={{ width: videoWidth || 'min(280px, 70vw)', aspectRatio: aspectRatio || '1/1', display: 'block', ...style }}
    />
  );
}

// YouTubePoster: shows a custom thumbnail image; clicking it replaces with the live iframe player
function YouTubePoster({ url, poster }: { url: string; poster?: string }) {
  const [playing, setPlaying] = React.useState(false);
  if (playing || !poster) {
    return (
      <iframe
        src={playing ? (url.includes('?') ? url.replace('?', '?autoplay=1&') : url + '?autoplay=1') : url}
        className="w-full h-full"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="YouTube video"
      />
    );
  }
  return (
    <div
      className="w-full h-full relative cursor-pointer group"
      onClick={() => setPlaying(true)}
      title="Play video"
    >
      <img src={poster} alt="Video thumbnail" className="w-full h-full object-cover" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-1"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </div>
  );
}

// Renders description text, converting [platform]url[/platform] tags into styled CTA links
function renderDescription(text: string, small = false) {
  const parts = text.split(/(\[instagram\].*?\[\/instagram\]|\[threads\].*?\[\/threads\]|\[facebook\].*?\[\/facebook\])/g);
  return parts.map((part, i) => {
    const igMatch = part.match(/\[instagram\](.*?)\[\/instagram\]/);
    const thMatch = part.match(/\[threads\](.*?)\[\/threads\]/);
    const fbMatch = part.match(/\[facebook\](.*?)\[\/facebook\]/);
    const url = igMatch?.[1] || thMatch?.[1] || fbMatch?.[1];
    const label = igMatch ? 'Instagram' : thMatch ? 'Threads' : fbMatch ? 'Facebook' : null;
    if (url && label) {
      return (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--folder-text, #fff)', textDecoration: 'underline', fontWeight: 700, cursor: 'pointer' }}
        >{label}</a>
      );
    }
    // Plain text — preserve newlines
    return <span key={i} style={{ whiteSpace: 'pre-line' }}>{part}</span>;
  });
}

// ─── Media Size Slider ───────────────────────────────────────────────────────
// Continuous draggable range slider. Scale range: 0.4 (min) → 2.0 (max).
// Updates media sizes in real time as the thumb is dragged.
const SCALE_MIN = 0.4;
const SCALE_MAX = 2.0;
const SCALE_DEFAULT = 1.3;
const MEDIA_SCALE_KEY = 'portfolio_media_scale';
const TRACK_W = 120;
const THUMB_SIZE = 12;

function scaleToX(scale: number): number {
  return ((scale - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * (TRACK_W - THUMB_SIZE);
}
function xToScale(x: number): number {
  const ratio = Math.max(0, Math.min(1, x / (TRACK_W - THUMB_SIZE)));
  // Round to 2 decimal places to avoid floating-point noise
  return Math.round((SCALE_MIN + ratio * (SCALE_MAX - SCALE_MIN)) * 100) / 100;
}

function MediaSizeSlider({ scale, onChange }: { scale: number; onChange: (s: number) => void }) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const getLocalX = (e: MouseEvent | TouchEvent) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? (e as TouchEvent).changedTouches[0]?.clientX) : (e as MouseEvent).clientX;
    return clamp(clientX - rect.left - THUMB_SIZE / 2, 0, TRACK_W - THUMB_SIZE);
  };

  const commit = (s: number) => {
    try { localStorage.setItem(MEDIA_SCALE_KEY, String(s)); } catch {}
    onChange(s);
  };

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDragging.current = true;
    // Immediately jump to click position
    const rect = trackRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clamp(clientX - rect.left - THUMB_SIZE / 2, 0, TRACK_W - THUMB_SIZE);
    commit(xToScale(x));

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      commit(xToScale(getLocalX(ev)));
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
  };

  const thumbX = scaleToX(scale);
  const fillPct = (thumbX / (TRACK_W - THUMB_SIZE)) * 100;
  // Show percentage label (100% = default scale of 1.3)
  const pctLabel = `${Math.round((scale / 1.3) * 100)}%`;

  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        marginBottom: 12, marginTop: 4, userSelect: 'none',
      }}
    >
      {/* Label */}
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--folder-text, #000)',
        opacity: 0.5,
        flexShrink: 0,
      }}>Media Size</span>
      {/* Track */}
      <div
        ref={trackRef}
        onMouseDown={onPointerDown}
        onTouchStart={onPointerDown}
        style={{
          position: 'relative',
          width: TRACK_W, height: 2,
          background: 'var(--folder-text, #000)',
          cursor: 'ew-resize',
          flexShrink: 0,
          touchAction: 'none',
        }}
      >
        {/* Fill */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: `${fillPct}%`, height: '100%',
          background: 'var(--folder-text, #000)',
          pointerEvents: 'none',
        }} />
        {/* Thumb */}
        <div style={{
          position: 'absolute',
          top: '50%', left: thumbX,
          width: THUMB_SIZE, height: THUMB_SIZE,
          borderRadius: '50%',
          background: 'var(--folder-text, #000)',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          boxShadow: '0 0 0 2px var(--folder-bg, #fff)',
        }} />
      </div>
      {/* Live percentage label */}
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
        color: 'var(--folder-text, #000)',
        minWidth: 32, textAlign: 'left',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {pctLabel}
      </span>
    </div>
  );
}

/** Read the persisted scale from localStorage, falling back to 1.0 */
function getPersistedScale(): number {
  try {
    const v = localStorage.getItem(MEDIA_SCALE_KEY);
    if (v) {
      const n = parseFloat(v);
      if (!isNaN(n) && n >= SCALE_MIN && n <= SCALE_MAX) return n;
    }
  } catch {}
  return 1.3;
}

/** Scale a CSS min() width string by a multiplier, e.g. 'min(480px, 55vw)' → 'min(288px, 33vw)' */
function scaleWidth(w: string | undefined, scale: number): string {
  if (!w) return `min(${Math.round(480 * scale)}px, ${Math.round(55 * scale)}vw)`;
  // Handle plain px values like '640px'
  const plainPx = w.match(/^(\d+(?:\.\d+)?)px$/);
  if (plainPx) return `${Math.round(parseFloat(plainPx[1]) * scale)}px`;
  // Handle min(Xpx, Yvw)
  const minMatch = w.match(/min\((\d+(?:\.\d+)?)px,\s*(\d+(?:\.\d+)?)vw\)/);
  if (minMatch) {
    const px = Math.round(parseFloat(minMatch[1]) * scale);
    const vw = Math.round(parseFloat(minMatch[2]) * scale);
    return `min(${px}px, ${vw}vw)`;
  }
  return w;
}

/** Base row height in px at scale 1.0 */
const MEDIA_ROW_H = 320;

/** Scale a pixel height by the current media scale multiplier */
function scaleHeight(scale: number): number {
  return Math.round(MEDIA_ROW_H * scale);
}

interface ContentProps {
  activeTags?: string[];
  onTagClick?: (tag: string) => void;
  initialExpandedProject?: string;
  embedded?: boolean;
}

// Prototypes, Digital Experiences and Experiments
export function PrototypesContent({ activeTags = [], onTagClick, initialExpandedProject }: ContentProps) {
  const [expandedProject, setExpandedProject] = useState<string | null>(initialExpandedProject ?? null);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);
  const [hoverImage, setHoverImage] = useState<{ show: boolean; x: number; y: number; projectId?: string }>({ show: false, x: 0, y: 0 });
  const [mediaScale, setMediaScale] = useState<Record<string, number>>(() => new Proxy({} as Record<string, number>, { get: (t, k) => k in t ? t[k as string] : getPersistedScale() }));
  const [carouselIndex, setCarouselIndex] = useState<{ [key: string]: number }>({});
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set());
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // No auto-scroll animation - videos are static with hover effects

  const interactiveProjects = [
    {
      id: 'samsung-diplo',
      title: "(01) Samsung x Diplo [Can't Stop]",
      tagline: "THE MIX THAT ONLY PLAYS WHEN YOU MOVE",
      description: "Introducing \"Can't Stop\" by Grammy-winning DJ/Producer Diplo, an exclusive 30-minute mix with a catch: you have to move to play it. Your phone's GPS and accelerometer detect movement to play the mix, which is composed of new, unreleased content. Run, jump, dance, pogo - the app doesn't discriminate. Just don't stop.",
      agency: 'Agency: R/GA NY',
      production: 'Production: R/GA Studios NY-BA',
      tags: ['Interactive', 'Music', 'Mobile'],
      media: [
        { type: 'video', url: 'https://vimeo.com/217188315', videoWidth: 'min(520px, 60vw)' },
        { type: 'image', url: '/assets/uGdlSKPSGtBQrFuE_9c7bd2.jpg' },
        { type: 'image', url: '/assets/FaGpapXCNhQUaRcm_a30a5c.jpg' },
        { type: 'image', url: '/assets/xXvnNMChIHQzGOdH_b8368a.gif' },
        { type: 'image', url: '/assets/CPXWQSYjyWAXGKdw_7c6969.gif' },
        { type: 'image', url: '/assets/diploFC_1340_c_5652601b_ab8f41.png' },
      ]
    },
    {
      id: 'mcdonalds-emlings',
      title: "(02) McDonald's [Emlings]",
      tagline: "HELPING MCDONALD'S FIND ITS MISSING MAGIC",
      description: "Emlings is a digital toy that brings the Happy Meal to life, reinvigorating the brand for a new generation.",
      agency: 'Agency: Leo Burnett Sydney',
      production: 'Production Company: North Kingdom',
      tags: ['Branding', 'Digital', 'Social'],
      media: [
        { type: 'video', url: 'https://player.vimeo.com/video/334615998?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'image', url: '/assets/SeyKZQNIxVxyJiPq_edd3bb.jpg' },
        { type: 'image', url: '/assets/BmylwDPzFqnMlzuH_ff8dc8.gif' },
        { type: 'image', url: '/assets/iHHNQmahOnbwGonZ_3dcc45.gif' },
        { type: 'image', url: '/assets/eNuJomcvUcIPIuJx_f7a674.gif' },
        { type: 'image', url: '/assets/TNZWkPVBhCIAWaPU_136492.gif' },
        { type: 'image', url: '/assets/QCjxNORjawpCXsbI_f6a4e0.gif' },
      ]
    },
    {
      id: 'samsung-s-drive',
      title: "(03) Samsung [S-Drive]",
      tagline: "REWARDING SAFE DRIVING",
      description: "Samsung S-Drive was created to turn one of the biggest distractions on the road into a life saver.",
      agency: 'Agency: Leo Burnett Sydney',
      production: '',
      tags: ['AI', 'Mobile', 'Automotive'],
      media: [
        { type: 'video', url: 'https://vimeo.com/343710550', videoWidth: 'min(640px, 70vw)' },
        { type: 'video', url: 'https://vimeo.com/219596551', videoWidth: 'min(640px, 70vw)' },
        { type: 'pair', url: '/assets/49424455075641.5d4132e539b75_4c6ca02e_e68217.gif', url2: '/assets/36c4d655075641.5d4135ab84f41_5dd89a8f_2be302.jpg' },
        { type: 'image', url: '/assets/2d5f0255075641.5d4132e58d3c0_ae3590eb_92d0b9.jpeg' },
        { type: 'image', url: '/assets/s-02-2000x1519-1(1)_c9c5863c_43cb49.jpg' },
        { type: 'image', url: '/assets/posters_3d5cb432_e5ada1.jpg' },
        { type: 'image', url: '/assets/ezgif-6-b8629a5cef27_02f09d4c_26c0cb.gif' },
        { type: 'image', url: '/assets/S-Drive-Design-Case-Study1(1)_b5a95fcf_87a0ae.gif' },
      ]
    },
  ];

  const LOVE_METER_IMG = '/assets/FqZUEkFKBDsqgrMJ_f9c04a.gif';
  const WHOOPEE_IMG = '/assets/pZAmffwXWzvtAGVp_58479b.gif';
  const MOOD_CAL_IMG = '/assets/BohndpCczayUhLRz_430deb.webp';
  const INSTAGRAM_UNLOCK_IMG = '/assets/Screenshot2026-03-12at8.53.47PM_a3120d72_78ca51.webp';

  const experiments = [
    {
      id: 'mood-calendar',
      title: '(04) Mood Calendar',
      tagline: 'TRACK YOUR EMOTIONS VISUALLY',
      description: 'A vibe-coding experiment that visualizes your daily mood patterns through generative art.',
      tags: ['Creative Coding', 'Data Viz'],
      hoverImg: MOOD_CAL_IMG,
      media: [
        { type: 'image', url: '/assets/BohndpCczayUhLRz_430deb.webp', maxWidth: 'min(300px, 55vw)' },
        { type: 'image', url: '/assets/eTLpEhXQdCMMsErK_8ab077.png', maxWidth: 'min(260px, 45vw)' },
        { type: 'image', url: '/assets/gehppVuuZNgkbJhJ_3af5bb.png', maxWidth: 'min(260px, 45vw)' },
        { type: 'image', url: '/assets/YYedkQnLKbLlcwVh_da8d43.png', maxWidth: 'min(260px, 45vw)' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
    {
      id: 'love-meter',
      title: '(05) Love-O-Meter',
      tagline: 'HOW MUCH DOES BRUNO LOVE JOCELYN?',
      description: 'A vibe-coded love meter that answers the most important question.',
      tags: ['Fun', 'Personal'],
      hoverImg: LOVE_METER_IMG,
      media: [
        { type: 'image', url: '/assets/FqZUEkFKBDsqgrMJ_f9c04a.gif', maxWidth: 'min(500px, 80vw)' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
    {
      id: 'poster-3d',
      title: '(06) Poster.3D',
      tagline: 'TURN ANY IMAGE INTO A 3D ROTATING ANIMATION',
      description: 'Browser-based tool that takes any static image (JPEG, PNG, or WebP) and instantly transforms it into a 3D rotating animation — rendered in real-time using WebGL (Three.js). No server, no upload to any cloud, no account needed. Everything runs entirely in your browser.',
      tags: ['Creative Coding', 'WebGL', 'Tool'],
      hoverImg: '/assets/pAQzwsyJJllvdawh_80cc7d.gif',
      linkHref: 'https://poster3d-cseabzsj.manus.space/',
      linkText: 'Try it at poster3d-cseabzsj.manus.space',
      media: [
        { type: 'video', url: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663345609769/TbXMAtuGNhKslUEa.mov' },
        { type: 'image', url: '/assets/pAQzwsyJJllvdawh_80cc7d.gif', maxWidth: 'min(600px, 90vw)' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
    {
      id: 'whoopee-cushion',
      title: '(07) The Whoopinator',
      tagline: 'DIGITAL PRANKS REIMAGINED',
      description: 'A playful web experiment bringing classic pranks into the digital age.',
      tags: ['Fun', 'Audio'],
      hoverImg: WHOOPEE_IMG,
      media: [
        { type: 'image', url: '/assets/pZAmffwXWzvtAGVp_58479b.gif', maxWidth: 'min(600px, 90vw)' },
      ] as { type: string; url: string; [key: string]: any }[]
    },

  ];

  const toggleProject = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  return (
    <div className="p-6 h-full overflow-y-auto" style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}>
      {/* Interactive Experiences Section */}
      <h2 style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4, color: 'var(--folder-text, #000000)' }}>Interactive</h2>
      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.18)', marginBottom: 8, paddingBottom: 0 }}></div>
      <div>
        {interactiveProjects.map((project) => (
          <div key={project.id}>
            <button
              onClick={() => toggleProject(project.id)}
              onMouseEnter={() => (project.id === 'samsung-diplo' || project.id === 'mcdonalds-emlings' || project.id === 'samsung-s-drive') && setHoverImage({ show: true, x: 0, y: 0, projectId: project.id })}
              onMouseLeave={() => (project.id === 'samsung-diplo' || project.id === 'mcdonalds-emlings' || project.id === 'samsung-s-drive') && setHoverImage({ show: false, x: 0, y: 0 })}
              onMouseMove={(e) => {
                if (project.id === 'samsung-diplo' || project.id === 'mcdonalds-emlings' || project.id === 'samsung-s-drive') {
                  setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id });
                }
              }}
              className="w-full text-left py-1 flex items-baseline group relative outline-none focus:outline-none"
              
            >
              <span className={`text-[12.5px] font-normal uppercase transition-colors flex-shrink-0 ${
                expandedProject === project.id 
                  ? 'bg-[var(--folder-text,#000000)] text-[var(--folder-bg,#ffffff)] px-1' 
                  : 'group-hover:bg-[var(--folder-text,#000000)] group-hover:text-[var(--folder-bg,#ffffff)] group-hover:px-1'
              }`}>
                {project.title.replace(/^\(\d+\)\s*/, '')}
              </span>
              <span className="flex-1 border-b-[2px] border-dotted border-[currentColor] mx-2"></span>
              <span className="text-[12.5px] font-normal uppercase flex-shrink-0">
                {project.title.match(/^\(\d+\)/)?.[0] || ''}
              </span>
            </button>
            
            {expandedProject === project.id && (
              <div className="pb-6" style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}>
                <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--folder-text, #000000)' }}>{project.tagline}</p>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--folder-text, #000000)', marginBottom: 16 }}>{project.description}</p>
                {((project as any).agency || (project as any).production) && (
                  <p className="text-[10.5px] uppercase mb-6 opacity-70 tracking-wide">
                    {(project as any).agency && <span>[{(project as any).agency}]</span>}
                    {(project as any).agency && (project as any).production && ' '}
                    {(project as any).production && <span>[{(project as any).production}]</span>}
                  </p>
                )}

                {/* Flat Carousel with Arrow Navigation */}
                {project.media.length > 0 && (() => {
                  const sc = mediaScale[project.id] ?? 1.3;
                  return (
                    <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--folder-bg, #000000)', paddingBottom: 8, marginBottom: 4 }}>
                      <MediaSizeSlider scale={sc} onChange={s => setMediaScale(prev => ({ ...prev, [project.id]: s }))} />
                      {/* Horizontal scroll row */}
                      <div className="media-row-scroll" style={{ display: 'flex', flexWrap: 'nowrap', gap: '12px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'auto', scrollbarColor: 'rgba(0,0,0,0.5) rgba(0,0,0,0.15)', alignItems: 'stretch', marginTop: '8px', height: `${scaleHeight(sc) + 36}px` }}>
                          {project.media.map((item, idx) => {
                            const videoId = item.url ? `${project.id}-${idx}` : '';
                            const rowH = scaleHeight(sc);
                            const ar = (item as any).aspectRatio || '16/9';
                            return (
                            <div key={idx} className="flex flex-col gap-2" style={{ flexShrink: 0, height: rowH + 36 }}>
                              <div
                                className="relative"
                                style={{ 
                                  height: rowH,
                                  width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`,
                                  transition: 'height 0.2s ease, width 0.2s ease',
                                  flexShrink: 0
                                }}
                              >
                                {item.url ? (
                                  <>
                                    {item.type === 'video' ? (
                                      <VimeoEmbed url={item.url} aspectRatio={(item as any).aspectRatio || '16/9'} videoWidth={(item as any).videoWidth} className="w-full h-full" />
                                    ) : (
                                      <img
                                        src={item.url}
                                        alt="Project media"
                                        className="w-full h-full object-contain animate-fade-in"
                                        onLoad={() => {
                                          setLoadedVideos(prev => new Set(prev).add(videoId));
                                        }}
                                      />
                                    )}
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-xs font-bold" style={{ color: '#000000' }}>
                                      {'placeholder' in item ? String(item.placeholder) : 'MEDIA HERE'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {item.url && (
                                <button
                                  onClick={() => {
                                    if (item.type === 'video') {
                                      if (/\.(mp4|mov|webm)$/i.test(item.url)) {
                                        setModalVideoUrl(item.url);
                                      } else {
                                        const videoId = item.url.split('/').pop()?.split('?')[0];
                                        setModalVideoUrl(`https://player.vimeo.com/video/${videoId}?autoplay=1`);
                                      }
                                    } else {
                                      setModalVideoUrl(item.url);
                                    }
                                  }}
                                  className="text-[9px] font-bold uppercase tracking-[0.08em] hover:underline cursor-pointer"
                                >
                                  [Enlarge]
                                </button>
                              )}
                            </div>
                          );
                          })}
                        </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Experiments Section */}
      <h2 style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4, marginTop: 32, color: 'var(--folder-text, #000000)' }}>Experiments [Vibe-Coding]</h2>
      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.18)', marginBottom: 8, paddingBottom: 0 }}></div>
      <div>
        {experiments.map((project) => (
          <div key={project.id}>
            <button
              onClick={() => toggleProject(project.id)}
              onMouseEnter={(e) => project.hoverImg && setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id })}
              onMouseLeave={() => setHoverImage({ show: false, x: 0, y: 0 })}
              onMouseMove={(e) => project.hoverImg && setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id })}
              className="w-full text-left py-1 flex items-baseline group relative outline-none focus:outline-none"
              
            >
              <span className={`text-[12.5px] font-normal uppercase transition-colors flex-shrink-0 ${
                expandedProject === project.id 
                  ? 'bg-[var(--folder-text,#000000)] text-[var(--folder-bg,#ffffff)] px-1' 
                  : 'group-hover:bg-[var(--folder-text,#000000)] group-hover:text-[var(--folder-bg,#ffffff)] group-hover:px-1'
              }`}>
                {project.title.replace(/^\(\d+\)\s*/, '')}
              </span>
              <span className="flex-1 border-b-[2px] border-dotted border-[currentColor] mx-2"></span>
              <span className="text-[12.5px] font-normal uppercase flex-shrink-0">
                {project.title.match(/^\(\d+\)/)?.[0] || ''}
              </span>
            </button>
            
            {expandedProject === project.id && (
              <div className="pb-6" style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}>
                <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--folder-text, #000000)' }}>{project.tagline}</p>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--folder-text, #000000)', marginBottom: 16 }}>{project.description}</p>
                {((project as any).linkHref || (project as any).linkHref2) && (
                  <p style={{ fontSize: 14.5, lineHeight: 1.65, marginBottom: 16 }}>
                    {(project as any).linkHref && (
                      <a href={(project as any).linkHref} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, textDecoration: 'underline', marginRight: 16 }}>
                        {(project as any).linkText || (project as any).linkHref}
                      </a>
                    )}
                    {(project as any).linkHref2 && (
                      <a href={(project as any).linkHref2} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, textDecoration: 'underline' }}>
                        {(project as any).linkText2 || (project as any).linkHref2}
                      </a>
                    )}
                  </p>
                )}
                {((project as any).agency || (project as any).production) && (
                  <p className="text-[10.5px] uppercase mb-6 opacity-70 tracking-wide">
                    {(project as any).agency && <span>[{(project as any).agency}]</span>}
                    {(project as any).agency && (project as any).production && ' '}
                    {(project as any).production && <span>[{(project as any).production}]</span>}
                  </p>
                )}
                {(project as any).media && (project as any).media.length > 0 && (() => {
                  const sc = mediaScale[project.id] ?? 1.3;
                  const rowH = scaleHeight(sc);
                  return (
                    <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--folder-bg, #000000)', paddingBottom: 8, marginBottom: 4 }}>
                      <MediaSizeSlider scale={sc} onChange={s => setMediaScale(prev => ({ ...prev, [project.id]: s }))} />
                      <div className="media-row-scroll" style={{ display: 'flex', flexWrap: 'nowrap', gap: '12px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'auto', scrollbarColor: 'rgba(0,0,0,0.5) rgba(0,0,0,0.15)', alignItems: 'stretch', marginTop: '16px', height: `${rowH + 36}px` }}>
                        {(project as any).media.map((item: any, idx: number) => {
                          const ar = item.aspectRatio || '1/1';
                          return (
                            <div key={idx} className="flex flex-col gap-2" style={{ flexShrink: 0, height: rowH + 36 }}>
                              {(item.type === 'mp4' || item.type === 'mov') ? (
                                <video
                                  src={item.url}
                                  loop muted playsInline
                                  style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', objectFit: 'contain', transition: 'height 0.2s ease, width 0.2s ease' }}
                                />
                              ) : item.type === 'image' ? (
                                <img src={item.url} alt="" style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain', display: 'block', transition: 'height 0.2s ease' }} />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Video Modal Overlay */}
      {modalVideoUrl && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
          onClick={() => setModalVideoUrl(null)}
        >
          <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
            {modalVideoUrl.includes('vimeo.com') ? (
              <div style={{ width: 'min(90vw, 1200px)', aspectRatio: '16/9' }}>
                <iframe src={modalVideoUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              </div>
            ) : /\.(mp4|mov|webm)$/i.test(modalVideoUrl) ? (
              <video src={modalVideoUrl} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block' }} />
            ) : (
              <img src={modalVideoUrl} alt="Enlarged media" style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block', objectFit: 'contain' }} />
            )}
            <button
              onClick={() => setModalVideoUrl(null)}
              style={{ position: 'absolute', top: '8px', right: '10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: '11px', fontWeight: '700', fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif", letterSpacing: '0.08em', cursor: 'pointer', zIndex: 10000, padding: '2px 0', lineHeight: 1 }}
              title="Close"
            >[CLOSE]</button>
          </div>
        </div>
      )}

      {/* Mouse-following hover image */}
      {hoverImage.show && (() => {
        const experimentHoverImg = experiments.find(e => e.id === hoverImage.projectId)?.hoverImg;
        const interactiveHoverImg = hoverImage.projectId === 'mcdonalds-emlings'
          ? '/assets/TNZWkPVBhCIAWaPU_136492.gif'
          : hoverImage.projectId === 'samsung-s-drive'
          ? '/assets/49424455075641.5d4132e539b75_4c6ca02e_e68217.gif'
          : '/assets/LnEmDtMqVIVPRBLC_f3aaf0.gif';
        const mediaSrc = experimentHoverImg || interactiveHoverImg;
        const isExperiment = !!experimentHoverImg;
        const isVideo = mediaSrc.endsWith('.mov') || mediaSrc.endsWith('.mp4');
        return (
          <div
            className="fixed pointer-events-none z-50"
            style={{
              left: `${hoverImage.x + 20}px`,
              top: `${hoverImage.y + 20}px`,
              transform: 'translate(0, 0)'
            }}
          >
            {isVideo ? (
              <video
                src={mediaSrc}
                autoPlay
                loop
                muted
                playsInline
                className="w-[240px] h-auto"
              />
            ) : (
              <img
                src={mediaSrc}
                alt="Project preview"
                className="w-[240px] h-auto"
              />
            )}
          </div>
        );
      })()}
    </div>
  );
}

// Social and PR
export 
// Instagram embed component — uses clean iframe /embed/ endpoint (no header/caption UI)
function InstagramEmbed({ url, height }: { url: string; height?: number }) {
  // Extract reel/post ID from URL and build clean embed URL
  const embedUrl = React.useMemo(() => {
    const m = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    if (!m) return url;
    return `https://www.instagram.com/reel/${m[1]}/embed/`;
  }, [url]);
  const h = height || 480;
  // 9:16 reel ratio → width = h * 9/16
  const w = Math.round(h * 9 / 16);
  return (
    <div style={{ flexShrink: 0, height: h, width: w, overflow: 'hidden', background: '#000' }}>
      <iframe
        src={embedUrl}
        width={w}
        height={h}
        frameBorder="0"
        scrolling="no"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        style={{ display: 'block', border: 'none', width: w, height: h }}
      />
    </div>
  );
}

export function SocialContent({ activeTags = [], onTagClick, initialExpandedProject }: ContentProps) {
  const [expandedProject, setExpandedProject] = useState<string | null>(initialExpandedProject ?? null);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set());
  const [hoverImage, setHoverImage] = useState<{ show: boolean; x: number; y: number; projectId?: string }>({ show: false, x: 0, y: 0 });
  const [mediaScale, setMediaScale] = useState<Record<string, number>>(() => new Proxy({} as Record<string, number>, { get: (t, k) => k in t ? t[k as string] : getPersistedScale() }));
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const toggleProject = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  const projects = [
    {
      id: 'social-01',
      title: '(01) @Zuck | CEO Communications',
      tagline: "Reimagining Mark's social presence",
      description: 'In 2023, Mark Zuckerberg set out to move away from an overly corporate social presence and show up in a more human, culturally relevant way. I was part of the small team brought in to help shape that shift.\n\nOur approach is to turn product launches, company updates, and complex technology into stories that people genuinely want to watch, share, and talk about. Rather than relying on traditional marketing, we make Mark feel more like a creator and the products feel useful, relatable, and part of everyday life through social content, live events, and creator collaborations.',
      tags: ['Social', 'PR'],
      hoverImg: '/assets/download(8)_c34ba657_c19a7e.jpeg',
      media: [
        { type: 'mp4', url: '/assets/DLuvQ5UR0n5_1bf3f280_9ff7f4.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/DLsv5Toh44g_377535e8_499053.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/C27qtysxAdE_9c4f91eb_193087.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/DaAu0cVxhzM_14f9306f_1e916c.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/DGoDxw5PvlH_6b418404_04bfc8.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/DCRySOxvdz6_2095ee2a_2b3d23.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/C9xxBFYyF2X_5280b584_bd90b9.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/C9AbmIYp3Js_6d8470ae_7867c0.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/DDpSa0DPvrW_341fa4ff_fe8573.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
      ] as { type: string; url: string; videoWidth?: string; aspectRatio?: string }[]
    },
    {
      id: 'social-02',
      title: '(02) Facebook (I Wanna Rock)',
      tagline: 'WHATEVER YOU ROCK, THERE\'S A FACEBOOK GROUP FOR YOU',
      description: 'This campaign seeks to show the diversity of Facebook Groups through the lens of Rock. Whether you like to paint on rocks, collect rock crystals or rock out with 80\'s rock stars — there\'s a Facebook group for you.',
      agency: 'Agency: Meta Creative X',
      production: 'Production Company: Iconoclast',
      tags: ['Social', 'Facebook'],
      hoverImg: '/assets/ezgif-6-525ea5da065d(1)_4b841a17_9727e5.gif',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/435655934?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/435655396?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/435655053?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/435654761?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'image', url: '/assets/mood-2000x1251_5c73fc1f_486eb6.jpg' },
      ] as { type: string; url: string; aspectRatio?: string }[]
    },
    {
      id: 'social-03',
      title: '(03) Facebook (House of Horrors)',
      tagline: 'HALLOWEEN TIPS FROM HALLOWEEN EXPERTS',
      description: 'With Halloween being one of the biggest and busiest moments on the platform, the community is always eager for tips and tricks. So we thought who better to give Halloween advice and inspiration, than Facebook "Halloween" Groups?\n\nWe brought together Halloween themed Groups, and under one roof, to share their tips, tricks and insights from the Wonderful House of Horrors.',
      agency: 'Agency: Meta Creative X',
      production: 'Production Company: Scholar',
      tags: ['Social', 'Facebook'],
      hoverImg: '/assets/ezgif-80d9ca958b65d964_9784c73e_637a99.gif',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/371704647?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/371704689?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/371744962?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/371704672?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'image', url: '/assets/jjh-copy-1-2000x2501_2b1bad90_ca8dd1.jpg' },
        { type: 'image', url: '/assets/fb_halloween_hauntedhouse_interior_v1_001-1535x1920(1)_d20c9b0a_4ec222.jpg' },
        { type: 'image', url: '/assets/jjh-2000x2501(1)_c3875392_c3150d.jpg' },
        { type: 'image', url: '/assets/int_dining_food-1920x1500_e9071cea_a2b4df.jpg' },
        { type: 'image', url: '/assets/int_dining_table_set-1920x1500_5bea1b1c_daa705.jpg' },
        { type: 'image', url: '/assets/int_lab_vials-1920x1500_a7cd8d42_4652bf.jpg' },
        { type: 'image', url: '/assets/int_lab_tank_cabinet-1920x1500_1919cd0c_9cee13.jpg' },
        { type: 'image', url: '/assets/int_attic_stairs_detail-1920x1500_cca3aae6_322351.jpg' },
        { type: 'image', url: '/assets/int_attic_lights-1920x1500_c7724193_12fea1.jpg' },
      ] as { type: string; url: string; aspectRatio?: string }[]
    },

    {
      id: 'facebook-mindfull',
      title: '(04) Facebook (Mindfull)',
      tagline: 'FIND YOUR CALM AND FOCUS',
      description: 'The arrival of COVID19 has created a heightened amount of fear, stress and anxiety for everyone. Increasingly, people are looking to their community for help and support as we continue to weather this storm together. In response, we felt it was important to create a content series about well-being and mental health to help our community get through the pressures of being inside and at home.',
      agency: 'Agency: Meta Creative X',
      production: 'Production Company: Buck',
      tags: ['Social', 'Facebook'],
      hoverImg: '/assets/ezgif-6-9da134f664ea(1)_bb4e7901_2abe3f.gif',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/429384060?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/432946376?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/429384778?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/432946669?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/432945889?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/429385150?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/432948234?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'image', url: '/assets/everything-2000x1235_b21af245_3cb61b.png', maxWidth: '480px' },
      ] as { type: string; url: string; aspectRatio?: string }[]
    },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto relative" style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}>
      {projects.map((project) => (
        <div key={project.id}>
          <button
            onClick={() => toggleProject(project.id)}
            onMouseEnter={(e) => project.hoverImg && setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id })}
            onMouseLeave={() => setHoverImage({ show: false, x: 0, y: 0 })}
            onMouseMove={(e) => project.hoverImg && setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id })}
            className="w-full text-left py-1 flex items-baseline group relative outline-none focus:outline-none"
            
          >
            <span className={`text-[12.5px] font-normal uppercase transition-colors flex-shrink-0 ${
              expandedProject === project.id
                ? 'bg-[var(--folder-text,#000000)] text-[var(--folder-bg,#ffffff)] px-1'
                : 'group-hover:bg-[var(--folder-text,#000000)] group-hover:text-[var(--folder-bg,#ffffff)] group-hover:px-1'
            }`}>
              {project.title.replace(/^\(\d+\)\s*/, '')}
            </span>
            <span className="flex-1 border-b-[2px] border-dotted border-[currentColor] mx-2"></span>
            <span className="text-[12.5px] font-normal uppercase flex-shrink-0">
              {project.title.match(/^\(\d+\)/)?.[0] || ''}
            </span>
          </button>
          {expandedProject === project.id && (
            <div className="pb-6" style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}>
              <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--folder-text, #000000)' }}>{project.tagline}</p>
              <div style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--folder-text, #000000)", marginBottom: 16 }}>{renderDescription(project.description)}</div>
              {((project as any).agency || (project as any).production) && (
                <p className="text-[10.5px] uppercase mb-6 opacity-70 tracking-wide">
                  {(project as any).agency && <span>[{(project as any).agency}]</span>}
                  {(project as any).agency && (project as any).production && ' '}
                  {(project as any).production && <span>[{(project as any).production}]</span>}
                </p>
              )}
              {project.media.length > 0 ? (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--folder-bg, #000000)', paddingBottom: 8, marginBottom: 4 }}>
                  <MediaSizeSlider scale={mediaScale[project.id] ?? 1.3} onChange={s => setMediaScale(prev => ({ ...prev, [project.id]: s }))} />
                  <div className="media-row-scroll" style={{ display: 'flex', flexWrap: 'nowrap', gap: '12px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'auto', scrollbarColor: 'rgba(0,0,0,0.5) rgba(0,0,0,0.15)', alignItems: 'stretch', marginTop: '8px', height: `${scaleHeight(mediaScale[project.id] ?? 1.3) + 36}px` }}>
                    {(() => { const sc = mediaScale[project.id] ?? 1.3; const rowH = scaleHeight(sc); return project.media.map((item, idx) => {
                      const vid = `${project.id}-${idx}`;
                      const isImage = item.type === 'image';
                      const isPair = item.type === 'pair';
                      const ar = (item as any).aspectRatio || '16/9';
                      return (
                        <div key={idx} className="flex flex-col gap-2" style={{ flexShrink: 0, height: rowH + 36 }}>
                          {isPair ? (
                            <div style={{ display: 'flex', gap: '4px', height: rowH, flexShrink: 0 }}>
                              <img src={item.url} alt="" className="animate-fade-in block" style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain' }} />
                              <img src={(item as any).url2} alt="" className="animate-fade-in block" style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain' }} />
                            </div>
                          ) : item.type === 'instagram' ? (
                            <InstagramEmbed url={item.url} height={rowH} />
                          ) : isImage ? (
                            <img
                              src={item.url}
                              alt=""
                              className="animate-fade-in block"
                              style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain', transition: 'height 0.2s ease' }}
                              onLoad={() => setLoadedVideos(prev => new Set(prev).add(vid))}
                            />
                          ) : (
                            <>
                              {item.type === 'mp4' ? (
                                <video src={item.url} poster={(item as any).poster} className="animate-fade-in" controls playsInline onLoadedData={() => setLoadedVideos(prev => new Set(prev).add(vid))} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }} />
                              ) : (
                                (item as any).blackBg ? (
                                  <div style={{ height: rowH, width: `calc(${rowH}px * (16 / 9))`, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }}>
                                    <VimeoEmbed url={item.url} aspectRatio={ar} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0 }} />
                                  </div>
                                ) : (
                                  <VimeoEmbed url={item.url} aspectRatio={ar} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }} />
                                )
                              )}
                            </>
                          )}
                          <button onClick={() => setModalVideoUrl(isPair ? item.url : isImage ? item.url : item.type === 'video' ? (/\.(mp4|mov|webm)$/i.test(item.url) ? item.url : `https://player.vimeo.com/video/${item.url.split('/').pop()?.split('?')[0]}?autoplay=1`) : (/player\.vimeo\.com/.test(item.url) ? item.url.replace(/\?.*$/, '') + '?autoplay=1&badge=0&autopause=0&player_id=0&app_id=58479' : item.url))} className="text-[9px] font-bold uppercase tracking-[0.08em] hover:underline cursor-pointer">[Enlarge]</button>
                        </div>
                      );
                    }); })()}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ))}
      {modalVideoUrl && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
          onClick={() => setModalVideoUrl(null)}
        >
          <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
            {modalVideoUrl.includes('vimeo.com') ? (
              <div style={{ width: 'min(90vw, 1200px)', aspectRatio: '16/9' }}>
                <iframe src={modalVideoUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              </div>
            ) : /\.(mp4|mov|webm)$/i.test(modalVideoUrl) ? (
              <video src={modalVideoUrl} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block' }} />
            ) : (
              <img src={modalVideoUrl} alt="Enlarged media" style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block', objectFit: 'contain' }} />
            )}
            <button
              onClick={() => setModalVideoUrl(null)}
              style={{ position: 'absolute', top: '8px', right: '10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: '11px', fontWeight: '700', fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif", letterSpacing: '0.08em', cursor: 'pointer', zIndex: 10000, padding: '2px 0', lineHeight: 1 }}
              title="Close"
            >[CLOSE]</button>
          </div>
        </div>
      )}
      {hoverImage.show && (
        <div className="fixed pointer-events-none z-50" style={{ left: `${hoverImage.x + 20}px`, top: `${hoverImage.y + 20}px` }}>
          <img src={projects.find(p => p.id === hoverImage.projectId)?.hoverImg || ''} alt="" className="w-[240px] h-auto" />
        </div>
      )}
    </div>
  );
}

// Merged Social + Interactive content
export function SocialInteractiveContent({ activeTags = [], onTagClick, initialExpandedProject }: ContentProps) {
  const [expandedProject, setExpandedProject] = useState<string | null>(initialExpandedProject ?? null);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set());
  const [hoverImage, setHoverImage] = useState<{ show: boolean; x: number; y: number; projectId?: string }>({ show: false, x: 0, y: 0 });
  const [mediaScale, setMediaScale] = useState<Record<string, number>>(() => new Proxy({} as Record<string, number>, { get: (t, k) => k in t ? t[k as string] : getPersistedScale() }));
  const [carouselIndex, setCarouselIndex] = useState<{ [key: string]: number }>({});
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const toggleProject = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  const socialProjects = [
    {
      id: 'social-01',
      title: '(01) @Zuck | CEO Communications',
      tagline: "Reimagining Mark's social presence",
      description: "In 2023, Mark Zuckerberg set out to move away from an overly corporate social presence and show up in a more human, culturally relevant way. I was part of the small team brought in to help shape that shift.\n\nOur approach is to turn product launches, company updates, and complex technology into stories that people genuinely want to watch, share, and talk about. Rather than relying on traditional marketing, we make Mark feel more like a creator and the products feel useful, relatable, and part of everyday life through social content, live events, and creator collaborations.",
      tags: ['Social', 'PR'],
      hoverImg: '/assets/download(8)_c34ba657_c19a7e.jpeg',
      media: [
        { type: 'mp4', url: '/assets/DLuvQ5UR0n5_1bf3f280_9ff7f4.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/DLsv5Toh44g_377535e8_499053.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/C27qtysxAdE_9c4f91eb_193087.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/DaAu0cVxhzM_14f9306f_1e916c.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/DGoDxw5PvlH_6b418404_04bfc8.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/DCRySOxvdz6_2095ee2a_2b3d23.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/C9xxBFYyF2X_5280b584_bd90b9.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/C9AbmIYp3Js_6d8470ae_7867c0.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'mp4', url: '/assets/DDpSa0DPvrW_341fa4ff_fe8573.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
      ] as { type: string; url: string; videoWidth?: string; aspectRatio?: string }[]
    },
    {
      id: 'social-02',
      title: '(02) Facebook (I Wanna Rock)',
      tagline: "WHATEVER YOU ROCK, THERE'S A FACEBOOK GROUP FOR YOU",
      description: "This campaign seeks to show the diversity of Facebook Groups through the lens of Rock. Whether you like to paint on rocks, collect rock crystals or rock out with 80's rock stars — there's a Facebook group for you.",
      agency: 'Agency: Meta Creative X',
      production: 'Production Company: Iconoclast',
      tags: ['Social', 'Facebook'],
      hoverImg: '/assets/ezgif-6-525ea5da065d(1)_4b841a17_9727e5.gif',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/435655934?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/435655396?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/435655053?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/435654761?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'image', url: '/assets/mood-2000x1251_5c73fc1f_486eb6.jpg' },
      ] as { type: string; url: string; aspectRatio?: string }[]
    },
    {
      id: 'social-03',
      title: '(03) Facebook (House of Horrors)',
      tagline: 'HALLOWEEN TIPS FROM HALLOWEEN EXPERTS',
      description: "With Halloween being one of the biggest and busiest moments on the platform, the community is always eager for tips and tricks. So we thought who better to give Halloween advice and inspiration, than Facebook \"Halloween\" Groups?\n\nWe brought together Halloween themed Groups, and under one roof, to share their tips, tricks and insights from the Wonderful House of Horrors.",
      agency: 'Agency: Meta Creative X',
      production: 'Production Company: Scholar',
      tags: ['Social', 'Facebook'],
      hoverImg: '/assets/ezgif-80d9ca958b65d964_9784c73e_637a99.gif',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/371704647?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/371704689?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/371744962?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/371704672?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'image', url: '/assets/jjh-copy-1-2000x2501_2b1bad90_ca8dd1.jpg' },
        { type: 'image', url: '/assets/fb_halloween_hauntedhouse_interior_v1_001-1535x1920(1)_d20c9b0a_4ec222.jpg' },
        { type: 'image', url: '/assets/jjh-2000x2501(1)_c3875392_c3150d.jpg' },
        { type: 'image', url: '/assets/int_dining_food-1920x1500_e9071cea_a2b4df.jpg' },
        { type: 'image', url: '/assets/int_dining_table_set-1920x1500_5bea1b1c_daa705.jpg' },
        { type: 'image', url: '/assets/int_lab_vials-1920x1500_a7cd8d42_4652bf.jpg' },
        { type: 'image', url: '/assets/int_lab_tank_cabinet-1920x1500_1919cd0c_9cee13.jpg' },
        { type: 'image', url: '/assets/int_attic_stairs_detail-1920x1500_cca3aae6_322351.jpg' },
        { type: 'image', url: '/assets/int_attic_lights-1920x1500_c7724193_12fea1.jpg' },
      ] as { type: string; url: string; aspectRatio?: string }[]
    },
    {
      id: 'facebook-mindfull',
      title: '(04) Facebook (Mindfull)',
      tagline: 'FIND YOUR CALM AND FOCUS',
      description: 'The arrival of COVID19 has created a heightened amount of fear, stress and anxiety for everyone. Increasingly, people are looking to their community for help and support as we continue to weather this storm together. In response, we felt it was important to create a content series about well-being and mental health to help our community get through the pressures of being inside and at home.',
      agency: 'Agency: Meta Creative X',
      production: 'Production Company: Buck',
      tags: ['Social', 'Facebook'],
      hoverImg: '/assets/ezgif-6-9da134f664ea(1)_bb4e7901_2abe3f.gif',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/429384060?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/432946376?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/429384778?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/432946669?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/432945889?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/429385150?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/432948234?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/5' },
        { type: 'image', url: '/assets/everything-2000x1235_b21af245_3cb61b.png', maxWidth: '480px' },
      ] as { type: string; url: string; aspectRatio?: string }[]
    },
  ];

  const interactiveProjects = [
    {
      id: 'samsung-diplo',
      title: "(05) Samsung x Diplo [Can't Stop]",
      tagline: "THE MIX THAT ONLY PLAYS WHEN YOU MOVE",
      description: "Introducing \"Can't Stop\" by Grammy-winning DJ/Producer Diplo, an exclusive 30-minute mix with a catch: you have to move to play it. Your phone's GPS and accelerometer detect movement to play the mix, which is composed of new, unreleased content. Run, jump, dance, pogo - the app doesn't discriminate. Just don't stop.",
      agency: 'Agency: R/GA NY',
      production: 'Production: R/GA Studios NY-BA',
      tags: ['Interactive', 'Music', 'Mobile'],
      hoverImg: '/assets/xXvnNMChIHQzGOdH_b8368a.gif',
      media: [
        { type: 'video', url: 'https://vimeo.com/217188315', videoWidth: 'min(520px, 60vw)' },
        { type: 'image', url: '/assets/uGdlSKPSGtBQrFuE_9c7bd2.jpg' },
        { type: 'image', url: '/assets/FaGpapXCNhQUaRcm_a30a5c.jpg' },
        { type: 'image', url: '/assets/xXvnNMChIHQzGOdH_b8368a.gif' },
        { type: 'image', url: '/assets/CPXWQSYjyWAXGKdw_7c6969.gif' },
        { type: 'image', url: '/assets/diploFC_1340_c_5652601b_ab8f41.png' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
    {
      id: 'mcdonalds-emlings',
      title: "(06) McDonald's [Emlings]",
      tagline: "HELPING MCDONALD'S FIND ITS MISSING MAGIC",
      description: "Emlings is a digital toy that brings the Happy Meal to life, reinvigorating the brand for a new generation.",
      agency: 'Agency: Leo Burnett Sydney',
      production: 'Production Company: North Kingdom',
      tags: ['Branding', 'Digital', 'Social'],
      hoverImg: '/assets/TNZWkPVBhCIAWaPU_136492.gif',
      media: [
        { type: 'video', url: 'https://player.vimeo.com/video/334615998?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'image', url: '/assets/SeyKZQNIxVxyJiPq_edd3bb.jpg' },
        { type: 'image', url: '/assets/BmylwDPzFqnMlzuH_ff8dc8.gif' },
        { type: 'image', url: '/assets/iHHNQmahOnbwGonZ_3dcc45.gif' },
        { type: 'image', url: '/assets/eNuJomcvUcIPIuJx_f7a674.gif' },
        { type: 'image', url: '/assets/TNZWkPVBhCIAWaPU_136492.gif' },
        { type: 'image', url: '/assets/QCjxNORjawpCXsbI_f6a4e0.gif' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
    {
      id: 'samsung-s-drive',
      title: '(07) Samsung [S-Drive]',
      tagline: 'REWARDING SAFE DRIVING',
      description: 'Samsung S-Drive was created to turn one of the biggest distractions on the road into a life saver.',
      agency: 'Agency: Leo Burnett Sydney',
      production: '',
      tags: ['AI', 'Mobile', 'Automotive'],
      hoverImg: '/assets/49424455075641.5d4132e539b75_4c6ca02e_e68217.gif',
      media: [
        { type: 'video', url: 'https://vimeo.com/343710550', videoWidth: 'min(640px, 70vw)' },
        { type: 'video', url: 'https://vimeo.com/219596551', videoWidth: 'min(640px, 70vw)' },
        { type: 'pair', url: '/assets/49424455075641.5d4132e539b75_4c6ca02e_e68217.gif', url2: '/assets/36c4d655075641.5d4135ab84f41_5dd89a8f_2be302.jpg' },
        { type: 'image', url: '/assets/2d5f0255075641.5d4132e58d3c0_ae3590eb_92d0b9.jpeg' },
        { type: 'image', url: '/assets/s-02-2000x1519-1(1)_c9c5863c_43cb49.jpg' },
        { type: 'image', url: '/assets/posters_3d5cb432_e5ada1.jpg' },
        { type: 'image', url: '/assets/ezgif-6-b8629a5cef27_02f09d4c_26c0cb.gif' },
        { type: 'image', url: '/assets/S-Drive-Design-Case-Study1(1)_b5a95fcf_87a0ae.gif' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
  ];

  const allProjects = [...socialProjects, ...interactiveProjects];

  const SectionDivider = ({ label }: { label: string }) => (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4, color: 'var(--folder-text, #000000)' }}>{label}</div>
      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.18)', marginBottom: 8, paddingBottom: 0 }}></div>
    </div>
  );

  const renderProjectRow = (project: typeof allProjects[0]) => (
    <div key={project.id}>
      <button
        onClick={() => toggleProject(project.id)}
        onMouseEnter={(e) => (project as any).hoverImg && setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id })}
        onMouseLeave={() => setHoverImage({ show: false, x: 0, y: 0 })}
        onMouseMove={(e) => (project as any).hoverImg && setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id })}
        className="w-full text-left py-1 flex items-baseline group relative outline-none focus:outline-none"
        
      >
        <span className={`text-[12.5px] font-normal uppercase transition-colors flex-shrink-0 ${
          expandedProject === project.id
            ? 'bg-[var(--folder-text,#000000)] text-[var(--folder-bg,#ffffff)] px-1'
            : 'group-hover:bg-[var(--folder-text,#000000)] group-hover:text-[var(--folder-bg,#ffffff)] group-hover:px-1'
        }`}>
          {project.title.replace(/^\(\d+\)\s*/, '')}
        </span>
        <span className="flex-1 border-b-[2px] border-dotted border-[currentColor] mx-2"></span>
        <span className="text-[12.5px] font-normal uppercase flex-shrink-0">
          {project.title.match(/^\(\d+\)/)?.[0] || ''}
        </span>
      </button>
      {expandedProject === project.id && (
        <div className="pb-6" style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}>
          <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--folder-text, #000000)' }}>{project.tagline}</p>
          <div style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--folder-text, #000000)', marginBottom: 16 }}>{renderDescription(project.description)}</div>
          {((project as any).agency || (project as any).production) && (
            <p className="text-[10.5px] uppercase mb-6 opacity-70 tracking-wide">
              {(project as any).agency && <span>[{(project as any).agency}]</span>}
              {(project as any).agency && (project as any).production && ' '}
              {(project as any).production && <span>[{(project as any).production}]</span>}
            </p>
          )}
          {(project as any).linkHref && (
            <p style={{ fontSize: 14.5, lineHeight: 1.65, marginBottom: 16 }}><a href={(project as any).linkHref} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, textDecoration: 'underline' }}>{(project as any).linkText || (project as any).linkHref}</a></p>
          )}
          {project.media.length > 0 && (
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--folder-bg, #000000)', paddingBottom: 8, marginBottom: 4 }}>
              <MediaSizeSlider scale={mediaScale[project.id] ?? 1.3} onChange={s => setMediaScale(prev => ({ ...prev, [project.id]: s }))} />
              <div className="media-row-scroll" style={{ display: 'flex', flexWrap: 'nowrap', gap: '12px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'auto', scrollbarColor: 'rgba(0,0,0,0.5) rgba(0,0,0,0.15)', alignItems: 'stretch', marginTop: '8px', height: `${scaleHeight(mediaScale[project.id] ?? 1.3) + 36}px` }}>
                {(() => { const sc = mediaScale[project.id] ?? 1.3; const rowH = scaleHeight(sc); return project.media.map((item, idx) => {
                  const vid = `${project.id}-${idx}`;
                  const isImage = item.type === 'image';
                  const isPair = item.type === 'pair';
                  const ar = (item as any).aspectRatio || '16/9';
                  return (
                    <div key={idx} className="flex flex-col gap-2" style={{ flexShrink: 0, height: rowH + 36 }}>
                      {isPair ? (
                        <div style={{ display: 'flex', gap: '4px', height: rowH, flexShrink: 0 }}>
                          <img src={item.url} alt="" className="animate-fade-in block" style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain' }} />
                          <img src={(item as any).url2} alt="" className="animate-fade-in block" style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain' }} />
                        </div>
                      ) : item.type === 'instagram' ? (
                        <InstagramEmbed url={item.url} height={rowH} />
                      ) : isImage ? (
                        <img
                          src={item.url}
                          alt=""
                          className="animate-fade-in block"
                          style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain', transition: 'height 0.2s ease' }}
                          onLoad={() => setLoadedVideos(prev => new Set(prev).add(vid))}
                        />
                      ) : (
                        <>
                          {item.type === 'mp4' ? (
                            <video src={item.url} poster={(item as any).poster} className="animate-fade-in" controls playsInline onLoadedData={() => setLoadedVideos(prev => new Set(prev).add(vid))} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }} />
                          ) : (
                            (item as any).blackBg ? (
                              <div style={{ height: rowH, width: `calc(${rowH}px * (16 / 9))`, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }}>
                                <VimeoEmbed url={item.url} aspectRatio={ar} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0 }} />
                              </div>
                            ) : (
                              <VimeoEmbed url={item.url} aspectRatio={ar} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }} />
                            )
                          )}
                        </>
                      )}
                      <button onClick={() => setModalVideoUrl(isPair ? item.url : isImage ? item.url : item.type === 'video' ? (/\.(mp4|mov|webm)$/i.test(item.url) ? item.url : `https://player.vimeo.com/video/${item.url.split('/').pop()?.split('?')[0]}?autoplay=1`) : (/player\.vimeo\.com/.test(item.url) ? item.url.replace(/\?.*$/, '') + '?autoplay=1&badge=0&autopause=0&player_id=0&app_id=58479' : item.url))} className="text-[9px] font-bold uppercase tracking-[0.08em] hover:underline cursor-pointer">[Enlarge]</button>
                    </div>
                  );
                }); })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 h-full overflow-y-auto relative" style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}>
      <SectionDivider label="Social" />
      {socialProjects.map(renderProjectRow)}
      <SectionDivider label="Interactive" />
      {interactiveProjects.map(renderProjectRow)}
      {modalVideoUrl && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
          onClick={() => setModalVideoUrl(null)}
        >
          <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
            {modalVideoUrl.includes('vimeo.com') ? (
              <div style={{ width: 'min(90vw, 1200px)', aspectRatio: '16/9' }}>
                <iframe src={modalVideoUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              </div>
            ) : /\.(mp4|mov|webm)$/i.test(modalVideoUrl) ? (
              <video src={modalVideoUrl} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block' }} />
            ) : (
              <img src={modalVideoUrl} alt="Enlarged media" style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block', objectFit: 'contain' }} />
            )}
            <button
              onClick={() => setModalVideoUrl(null)}
              style={{ position: 'absolute', top: '8px', right: '10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: '11px', fontWeight: '700', fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif", letterSpacing: '0.08em', cursor: 'pointer', zIndex: 10000, padding: '2px 0', lineHeight: 1 }}
              title="Close"
            >[CLOSE]</button>
          </div>
        </div>
      )}
      {hoverImage.show && (
        <div className="fixed pointer-events-none z-50" style={{ left: `${hoverImage.x + 20}px`, top: `${hoverImage.y + 20}px` }}>
          <img src={(allProjects.find(p => p.id === hoverImage.projectId) as any)?.hoverImg || ''} alt="" className="w-[240px] h-auto" />
        </div>
      )}
    </div>
  );
}

// Shared image lists — used by both the content components and the INDEX carousel
export const DESIGN_IMAGES: string[] = [
  '/assets/GKOKBBEWJWOgIKmz_254480.jpg',
  '/assets/cZcqAGSLyHGmMNHg_39d519.jpg',
  '/assets/DdGJGfqxUWJTHCvJ_8a7d89.jpg',
  '/assets/FyqHMqmvjjxhqjPy_6ec719.jpg',
  '/assets/TfvUmqLWOOlhEAjb_422e6a.jpg',
  '/assets/nqTQwxGwGYLVJlON_ec5cc6.jpg',
  '/assets/BbTEqojjjMwOmlrL_be3515.jpg',
  '/assets/YHDCxKvJYJPpCLqe_a94287.jpg',
  '/assets/iqYBonZqmWxPRXeK_76d823.jpg',
  '/assets/RoGZHllrZKhhPmSx_cc3898.jpg',
  '/assets/ikAEFvAhwNtlZcUf_4f6fa8.jpeg',
  '/assets/HRfADZuRkpVAIRGF_ff6b54.jpg',
  '/assets/xYjFuxxSfaVexjhu_dd5116.jpg',
  '/assets/jWVmacDwViOFVnxz_e2408a.jpg',
  '/assets/qcZpOlDZLQWvFJnn_438e71.jpg',
  '/assets/ylxlgfUwjglHIWKx_385ef2.jpg',
  '/assets/mHYCQEIhOwEJJpDX_e5b9d5.jpg',
  '/assets/pyILPYBNnXORNCvT_5c2661.jpg',
  '/assets/BaENksRKniPOriHn_6b1482.jpg',
  '/assets/lYHYUpYCrcJIZtnJ_f62e51.jpg',
  '/assets/SbhaBiaNdqDpeSkX_ee5d89.jpg',
  '/assets/DyQZWqbNeMUFxnql_3c000f.jpg',
  '/assets/EjYehCMBdEQIISbw_e21184.jpg',
  '/assets/sZieRfucMNfLovHe_47f23f.jpg',
  '/assets/oYkNTsngBDsfIDxJ_568185.jpg',
  '/assets/vAlWXNZMuZUgZUDK_d90ab9.png',
  '/assets/raCCxjgejvWNkygi_7a20d2.jpg',
  '/assets/QwUNGkfWmZnbjzHE_0e1b6b.jpg',
  '/assets/blGqQqSbJZykJATN_a7a062.jpg',
  '/assets/dTVTvaBJUkupfEca_560d70.jpg',
  '/assets/VdrQzKcjgmKUQWrJ_a6d2de.jpg',
  '/assets/PKpRbGZalSdjpDhV_ec3320.jpg',
  '/assets/PjXYupTrGcMYIpav_5ecd96.jpg',
  '/assets/IELgILuOprsxNGEo_4dc23c.jpg',
  '/assets/JolHiwkJPGeyUKEf_43787b.jpg',
  '/assets/OVjPGatNixMKTYkH_4d3ac5.jpg',
  '/assets/dOiFgqyjhmKFNQpt_cb1ed6.png',
  '/assets/esmAKHGtUYkvULqj_6b4efa.jpg',
  '/assets/DKGnTbLeIrXkpTuN_ad3e40.jpg',
  '/assets/KCuqdrPubDFsBPgb_ca4a84.jpg',
  '/assets/WeIwaIsaFJGhHxcH_522c98.jpg',
];

export const POTTERY_IMAGES: string[] = [
  '/assets/KODAK-200-5-of-38_c1176a.jpg',
  '/assets/03_deb729.JPG',
  '/assets/Snapinsta.app_367361112_794386825749845_3041882079062117529_n_1080_40323e.jpg',
  '/assets/DSC08677_b64cc5.jpg',
  '/assets/Snapinsta.app_367037634_756500866249869_6481214663538332849_n_1080_8800ee.jpg',
  '/assets/Made-this-wooden-chair-with-Marcio--a-craftsman-based-in-Paraty--Rio-de-Janeiro.-For-generations-3_d7d8cf.jpg',
  '/assets/mezcal_3d54db.jpg',
  '/assets/Snapinsta.app_407575311_1093064738276849_3352866088452037380_n_1080_6b3c26.jpg',
  '/assets/studiomano05-1_c55278.jpg',
  '/assets/website_0006_Layer-135_512e69.jpg',
  '/assets/tile02low_0c54a1.jpg',
  '/assets/website_0005_Layer-133_e7a392.jpg',
  '/assets/website_0006_Group-1_0aca53.jpg',
  '/assets/toro01_adf808.jpg',
  '/assets/Snapinsta.app_397128198_2699441313565605_7136852584015873761_n_1080_a88cd3.jpg',
  '/assets/4x5_01_9b6bd1.jpg',
  '/assets/IMG_02332_db9674.jpg',
  '/assets/tile-copy_483ba6.jpg',
  '/assets/LADW_0004_Group-3-copy_362c4f.jpg',
  '/assets/This-is-America_Studio-Mano_The-Climate-Refugees_Credit-Jonathan-Hokklo-copy_0d54a9.jpeg',
  '/assets/Made-this-wooden-chair-with-Marcio--a-craftsman-based-in-Paraty--Rio-de-Janeiro.-For-generations-2_afe74a.jpg',
  '/assets/tile03low_8bfd55.jpg',
  '/assets/Made-this-wooden-chair-with-Marcio--a-craftsman-based-in-Paraty--Rio-de-Janeiro.-For-generations-1_a02ae4.jpg',
  '/assets/promez_c751f1.jpg',
  '/assets/oncapintada_298c3b.jpg',
  '/assets/DSCF0333-copy_163b86.jpg',
  '/assets/toro03_f98fae.jpg',
  '/assets/Snapinsta.app_396567091_873442487563577_4738128618748587376_n_1080_693e7a.jpg',
];

// Design and Illustration
export function DesignContent({ activeTags = [], onTagClick }: ContentProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const columnRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  // Randomize images on mount
  const [shuffledImages] = useState(() => {
    const imageArray = [
    '/assets/GKOKBBEWJWOgIKmz_254480.jpg',
    '/assets/cZcqAGSLyHGmMNHg_39d519.jpg',
    '/assets/DdGJGfqxUWJTHCvJ_8a7d89.jpg',
    '/assets/FyqHMqmvjjxhqjPy_6ec719.jpg',
    '/assets/TfvUmqLWOOlhEAjb_422e6a.jpg',
    '/assets/nqTQwxGwGYLVJlON_ec5cc6.jpg',
    '/assets/BbTEqojjjMwOmlrL_be3515.jpg',
    '/assets/YHDCxKvJYJPpCLqe_a94287.jpg',
    '/assets/iqYBonZqmWxPRXeK_76d823.jpg',
    '/assets/RoGZHllrZKhhPmSx_cc3898.jpg',
    '/assets/ikAEFvAhwNtlZcUf_4f6fa8.jpeg',
    '/assets/HRfADZuRkpVAIRGF_ff6b54.jpg',
    '/assets/xYjFuxxSfaVexjhu_dd5116.jpg',
    '/assets/jWVmacDwViOFVnxz_e2408a.jpg',
    '/assets/qcZpOlDZLQWvFJnn_438e71.jpg',
    '/assets/ylxlgfUwjglHIWKx_385ef2.jpg',
    '/assets/mHYCQEIhOwEJJpDX_e5b9d5.jpg',
    '/assets/pyILPYBNnXORNCvT_5c2661.jpg',
    '/assets/BaENksRKniPOriHn_6b1482.jpg',
    '/assets/lYHYUpYCrcJIZtnJ_f62e51.jpg',
    '/assets/SbhaBiaNdqDpeSkX_ee5d89.jpg',
    '/assets/DyQZWqbNeMUFxnql_3c000f.jpg',
    '/assets/EjYehCMBdEQIISbw_e21184.jpg',
    '/assets/sZieRfucMNfLovHe_47f23f.jpg',
    '/assets/oYkNTsngBDsfIDxJ_568185.jpg',
    '/assets/vAlWXNZMuZUgZUDK_d90ab9.png',
    '/assets/raCCxjgejvWNkygi_7a20d2.jpg',
    '/assets/QwUNGkfWmZnbjzHE_0e1b6b.jpg',
    '/assets/blGqQqSbJZykJATN_a7a062.jpg',
    '/assets/dTVTvaBJUkupfEca_560d70.jpg',
    '/assets/VdrQzKcjgmKUQWrJ_a6d2de.jpg',
    '/assets/PKpRbGZalSdjpDhV_ec3320.jpg',
    '/assets/PjXYupTrGcMYIpav_5ecd96.jpg',
    '/assets/IELgILuOprsxNGEo_4dc23c.jpg',
    '/assets/JolHiwkJPGeyUKEf_43787b.jpg',
    '/assets/OVjPGatNixMKTYkH_4d3ac5.jpg',
    '/assets/dOiFgqyjhmKFNQpt_cb1ed6.png',
    '/assets/esmAKHGtUYkvULqj_6b4efa.jpg',
    '/assets/DKGnTbLeIrXkpTuN_ad3e40.jpg',
    '/assets/KCuqdrPubDFsBPgb_ca4a84.jpg',
    '/assets/WeIwaIsaFJGhHxcH_522c98.jpg',
    '/assets/fiat-chairs_5fb3036e_aea2fa.webp',
    '/assets/fiat-horses_1a3491f3_1c3b91.webp',
    '/assets/fiat-heart_d576c1f0_95595d.webp',
    '/assets/fiat-bed_843649c4_d79070.webp',
    '/assets/fiat-apple_ce55ab8b_c87f68.webp',
    ];
    // Fisher-Yates shuffle
    for (let i = imageArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [imageArray[i], imageArray[j]] = [imageArray[j], imageArray[i]];
    }
    return imageArray;
  });

  // Auto-scroll columns continuously
  useEffect(() => {
    const scrollSpeeds = [0.3, -0.4, 0.35]; // Different speeds, opposite directions
    const intervals: NodeJS.Timeout[] = [];

    columnRefs.forEach((ref, colIdx) => {
      if (ref.current) {
        const interval = setInterval(() => {
          if (ref.current) {
            ref.current.scrollTop += scrollSpeeds[colIdx];
            // Loop back to top/bottom
            if (scrollSpeeds[colIdx] > 0 && ref.current.scrollTop >= ref.current.scrollHeight - ref.current.clientHeight) {
              ref.current.scrollTop = 0;
            } else if (scrollSpeeds[colIdx] < 0 && ref.current.scrollTop <= 0) {
              ref.current.scrollTop = ref.current.scrollHeight;
            }
          }
        }, 16); // ~60fps
        intervals.push(interval);
      }
    });

    return () => intervals.forEach(clearInterval);
  }, []);

  const images = shuffledImages;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--folder-bg, #000000)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flex: 1, gap: '12px', padding: '12px', overflow: 'hidden' }}>
        {[0, 1, 2].map((colIdx) => (
          <div
            key={colIdx}
            ref={columnRefs[colIdx]}
            style={{
              flex: 1,
              overflowY: 'scroll',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {[...images.filter((_, idx) => idx % 3 === colIdx), ...images.filter((_, idx) => idx % 3 === colIdx)].map((img, imgIdx) => (
              <img
                key={imgIdx}
                src={img}
                alt={`Design ${imgIdx + 1}`}
                onClick={() => setSelectedImage(img)}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
          onClick={() => setSelectedImage(null)}
        >
          <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt="Full size"
              style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block', objectFit: 'contain' }}
            />
            <button
              onClick={() => setSelectedImage(null)}
              style={{ position: 'absolute', top: '8px', right: '10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: '11px', fontWeight: '700', fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif", letterSpacing: '0.08em', cursor: 'pointer', zIndex: 10000, padding: '2px 0', lineHeight: 1 }}
              title="Close"
            >[CLOSE]</button>
          </div>
        </div>
      )}
    </div>
  );
}



// Campaign
export function CampaignContent({ activeTags = [], onTagClick, initialExpandedProject, embedded }: ContentProps) {
  const [expandedProject, setExpandedProject] = useState<string | null>(initialExpandedProject ?? null);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set());
  const [hoverImage, setHoverImage] = useState<{ show: boolean; x: number; y: number; projectId?: string }>({ show: false, x: 0, y: 0 });
  const [mediaScale, setMediaScale] = useState<Record<string, number>>(() => new Proxy({} as Record<string, number>, { get: (t, k) => k in t ? t[k as string] : getPersistedScale() }));
  const [carouselIndex, setCarouselIndex] = useState<{ [key: string]: number }>({});
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const toggleProject = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  const campaigns = [
    {
      id: 'libero-football',
      title: '(01) Libero Magazine [Football Analogies]',
      tagline: 'A CAMPAIGN WHERE WOMEN EXPLAIN TO MEN EVERY DAY SITUATIONS THROUGH FOOTBALL ANALOGIES',
      description: '"If they explain it to you with football, you get it" is the concept created by the agency to put across the message that Líbero is not just a football magazine, but also one that uses the world\'s most popular sport to talk about other topics such as culture, art and style, among others.',
      agency: 'Agency: Lola Madrid',
      production: 'Production Company: Blur',
      tags: ['Campaign', 'Film', 'Football'],
      hoverImg: '/assets/football-analogies-libero-magazine-1_0f1359f7_e476e8.gif',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/1170568733?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/1170568802?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/1170568786?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/1170568766?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'image', url: '/assets/screen-shot-2018-05-17-at-10.46.07-pm-copy-2000x1707_d3076bcf_e7d971.jpg' },
      ]
    },
    {
      id: 'levis-vote',
      title: "(03) Levi's [Use Your Vote]",
      tagline: 'VOTING LOOKS GOOD ON EVERYONE',
      description: "We mashed up what feels like a National Geographic documentary with a music video to remind Americans that voting isn't just a chore, but a powerful form of self-expression.\n\nBut we didn't just make a film. We also turned stores into registration centers, made custom clothes, got employers to give employees time off to vote, and a whole bunch more—all to actually make a difference and get people to express themselves on election day.",
      agency: 'Agency: FCB West',
      production: 'Production Company: Radical Media',
      tags: ['Campaign', 'Social Impact', 'Brand'],
      hoverImg: '/assets/iNGsyYpiapxyHSKi_7dcdf9.webp',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/1170893097?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/306292196?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'image', url: '/assets/tweet_snoop_vote_7ca632a8_58a301.jpg' },
        { type: 'image', url: '/assets/p01-1158x1637_cb835cf8_c3097e.jpg' },
        { type: 'image', url: '/assets/p02-1158x1637_dfe756f3_a40248.jpg', maxWidth: '320px' },
        { type: 'image', url: '/assets/p05-1158x1637_faed9496_6ed0af.jpg', maxWidth: '320px' },
        { type: 'image', url: '/assets/p07-1158x1637_2f0314d4_c98e9e.jpg', maxWidth: '320px' },
        { type: 'image', url: '/assets/mooood_dbed463e_ce40f7.jpg', maxWidth: '320px' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
    {
      id: 'samsung-unbox',
      title: '(04) Samsung [Unbox your Phone]',
      tagline: 'S8 LAUNCH CAMPAIGN',
      description: "The new Galaxy S8 has the world's first Infinity Screen – an expansive display that stretches all the way to the edges of the device and makes everything feel more immersive.\n\nTo capture this feeling, the launch campaign features a series of tranquil nature scenes that begin within the confines of a traditional phone screen, but then break free from these barriers",
      agency: 'Agency: R/GA NY',
      production: 'Production Company: Radical Media',
      vfx: 'VFX: The Mill',
      tags: ['Campaign', 'Product', 'Digital'],
      hoverImg: '/assets/ezgif-6-93a9b73094d5(1)_cb611700_3daf54.gif',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/217187282?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'image', url: '/assets/aaaa-2000x1380_8746a43f_923f01bb_31270b.jpg' },
        { type: 'image', url: '/assets/KV-MOTORCYCLE-0328_a4c47c47_6271ef96_05ffe1.jpg' },
        { type: 'image', url: '/assets/image-asset-3_9dc34a40_e0aa9950_d21ae2.jpeg' },
        { type: 'image', url: '/assets/image-asset_8ae1229d_6e73e1c2_b39b59.png' },
        { type: 'image', url: '/assets/image-asset-2_250d46ed_7d35df2e_7a37b7.jpeg' },
      ] as { type: string; url: string; videoWidth?: string; aspectRatio?: string }[]
    },
    {
      id: 'wwf-just',
      title: '(04) WWF [Just*]',
      tagline: 'WHAT YOU NEED, NATURALLY',
      description: 'just* is a WWF initiative created to show that there are often simple and natural alternatives to many of the products we use every day - products that require packaging that uses up resources and often end up as landfill.\n\nA few simple steps are all it takes to make small changes that, when done by many, can help create a cleaner and more sustainable future.',
      agency: 'Agency: Leo Burnett Sydney',
      production: 'Production Company: Rapid Films',
      tags: ['Campaign', 'Film', 'Sustainability'],
      hoverImg: '/assets/Screenshot2026-03-14at7.25.46PM_d7268fba_fcbf94.webp',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/286728221?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/286728178?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/286728142?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/286728073?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/286727955?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/286727917?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/286727866?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/286727786?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/286727709?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/286727673?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/286727603?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/286727384?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'image', url: '/assets/ezgif-6-adf1265cdcd1_838c0a00_71af2a.gif' },
      ]
    },
    {
      id: 'facebook-real-story',
      title: '(05) Facebook (A Real Facebook Story)',
      tagline: 'REAL STORIES. TOLD AUTHENTICALLY 👩🏽🧑🏼‍🦱🧓🏻👱🏾‍♀️',
      description: 'From the seemingly small, to the powerfully poignant, everyone has a Facebook Story. As we uncovered them, we found stories of life, stories of healing, stories of love, and stories of progress. But always stories centered around community and how others help you go further.',
      agency: 'Agency: Meta Creative X',
      production: 'Production Company: Park Pictures',
      tags: ['Campaign', 'Facebook'],
      hoverImg: '/assets/akosua_b00f2ded_f665c6.gif',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/1170574311?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/1170574267?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/1170574333?badge=0&autopause=0&player_id=0&app_id=58479' },
      ]
    },
    {
      id: 'facebook-eoy',
      title: "(06) Facebook [End of the Year]",
      tagline: "A YEAR TO REMEMBER, AND A YEAR TO FORGET",
      description: "At the end of 2020, we created a film that showed how we will never forget the ways people showed up for each other and their communities throughout the year, helping us find comfort in discomfort and strength in one another.",
      agency: "In-House Agency: Meta Creative X",
      production: "Production Company: Stink LA",
      tags: ['Campaign', 'Social', 'Video'],
      hoverImg: '/assets/11111_ac2b5ad0_142d6a.jpg',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/508194471?badge=0&autopause=0&player_id=0&app_id=58479' },
        { type: 'image', url: '/assets/Adweek-01_1340_c_b06a9bd0_789be3.jpg' },
        { type: 'image', url: '/assets/Adweek-02_1340_c_d5b3494c_0210f6.jpg' },
        { type: 'image', url: '/assets/Adweek-03_1340_c_d840ea73_43f851.jpg' },
        { type: 'image', url: '/assets/Adweek-04_1340_c_cf29b955_bf4685.jpg' },
        { type: 'image', url: '/assets/Adweek-05_1340_c_d6f710bc_2b67af.jpg' },
        { type: 'image', url: '/assets/Hivemind_new_1000_9ec57d71_285a24.jpg' },
      ]
    }
    
  ];

  const scrollCarousel = (projectId: string, dir: number) => {
    const ref = carouselRefs.current[projectId];
    if (ref) ref.scrollBy({ left: dir * 340, behavior: 'smooth' });
  };

  return (
    <div className={embedded ? 'relative' : 'px-6 py-4 h-full overflow-y-auto relative'}
      style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}
      onMouseMove={(e) => setHoverImage(prev => prev.show ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
    >
      {campaigns.map((project) => (
        <div key={project.id}>
          <button
            onClick={() => toggleProject(project.id)}
            onMouseEnter={(e) => (project as any).hoverImg && setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id })}
            onMouseLeave={() => setHoverImage({ show: false, x: 0, y: 0 })}
            onMouseMove={(e) => (project as any).hoverImg && setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id })}
            className="w-full text-left py-1 flex items-baseline group relative outline-none focus:outline-none"
            
          >
            <span className={`text-[12.5px] font-normal uppercase transition-colors flex-shrink-0 ${
              expandedProject === project.id
                ? 'bg-[var(--folder-text,#000000)] text-[var(--folder-bg,#ffffff)] px-1'
                : 'group-hover:bg-[var(--folder-text,#000000)] group-hover:text-[var(--folder-bg,#ffffff)] group-hover:px-1'
            }`}>
              {project.title.replace(/^\(\d+\)\s*/, '')}
            </span>
            <span className="flex-1 border-b-[2px] border-dotted border-[currentColor] mx-2"></span>
            <span className="text-[12.5px] font-normal uppercase flex-shrink-0">
              {project.title.match(/^\(\d+\)/)?.[0] || ''}
            </span>
          </button>

          {expandedProject === project.id && (
            <div className="pb-6" style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}>
              <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--folder-text, #000000)' }}>{project.tagline}</p>
              <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--folder-text, #000000)', marginBottom: 16 }}>{project.description}</p>
              {((project as any).agency || (project as any).production || (project as any).vfx) && (
                <p className="text-[10.5px] uppercase mb-6 opacity-70 tracking-wide">
                  {(project as any).agency && <span>[{(project as any).agency}]</span>}
                  {(project as any).agency && (project as any).production && ' '}
                  {(project as any).production && <span>[{(project as any).production}]</span>}
                  {(project as any).vfx && ((project as any).agency || (project as any).production) && ' '}
                  {(project as any).vfx && <span>[{(project as any).vfx}]</span>}
                </p>
              )}
              {project.media.length > 0 ? (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--folder-bg, #000000)', paddingBottom: 8, marginBottom: 4 }}>
                  <MediaSizeSlider scale={mediaScale[project.id] ?? 1.3} onChange={s => setMediaScale(prev => ({ ...prev, [project.id]: s }))} />
                  <div className="media-row-scroll" style={{ display: 'flex', flexWrap: 'nowrap', gap: '12px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'auto', scrollbarColor: 'rgba(0,0,0,0.5) rgba(0,0,0,0.15)', alignItems: 'stretch', marginTop: '8px', height: `${scaleHeight(mediaScale[project.id] ?? 1.3) + 36}px` }}>
                    {(() => { const sc = mediaScale[project.id] ?? 1.3; const rowH = scaleHeight(sc); return project.media.map((item: any, idx: number) => {
                      const vid = `${project.id}-${idx}`;
                      const isImage = item.type === 'image';
                      const isPair = item.type === 'pair';
                      const ar = (item as any).aspectRatio || '16/9';
                      return (
                        <div key={idx} className="flex flex-col gap-2" style={{ flexShrink: 0, height: rowH + 36 }}>
                          {isPair ? (
                            <div style={{ display: 'flex', gap: '4px', height: rowH, flexShrink: 0 }}>
                              <img src={item.url} alt="" className="animate-fade-in block" style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain' }} />
                              <img src={(item as any).url2} alt="" className="animate-fade-in block" style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain' }} />
                            </div>
                          ) : isImage ? (
                            <img
                              src={item.url}
                              alt=""
                              className="animate-fade-in block"
                              style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain', transition: 'height 0.2s ease' }}
                              onLoad={() => setLoadedVideos(prev => new Set(prev).add(vid))}
                            />
                          ) : item.type === 'mp4' ? (
                            <video src={item.url} poster={(item as any).poster} className="animate-fade-in" controls playsInline onLoadedData={() => setLoadedVideos(prev => new Set(prev).add(vid))} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }} />
                          ) : item.type === 'vimeo' ? (
                            (item as any).blackBg ? (
                              <div style={{ height: rowH, width: `calc(${rowH}px * (16 / 9))`, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }}>
                                <VimeoEmbed url={item.url} aspectRatio={ar} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0 }} />
                              </div>
                            ) : (
                              <VimeoEmbed url={item.url} aspectRatio={ar} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }} />
                            )
                          ) : null}
                          <button onClick={() => {
                            if (item.type === 'vimeo') {
                              const videoId = item.url.match(/\/video\/(\d+)/)?.[1];
                              setModalVideoUrl(videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1&badge=0&autopause=0&player_id=0&app_id=58479` : item.url);
                            } else {
                              setModalVideoUrl(item.url);
                            }
                          }} className="text-[9px] font-bold uppercase tracking-[0.08em] hover:underline cursor-pointer">[Enlarge]</button>
                        </div>
                      );
                    }); })()}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ))}

      {/* Enlarge modal */}
      {modalVideoUrl && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
          onClick={() => setModalVideoUrl(null)}
        >
          <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
            {modalVideoUrl.includes('vimeo') ? (
              <div style={{ width: 'min(90vw, 1200px)', aspectRatio: '16/9' }}>
                <iframe src={modalVideoUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              </div>
            ) : /\.(mp4|mov|webm)$/i.test(modalVideoUrl) ? (
              <video src={modalVideoUrl} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block' }} />
            ) : (
              <img src={modalVideoUrl} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block', objectFit: 'contain' }} />
            )}
            <button
              onClick={() => setModalVideoUrl(null)}
              style={{ position: 'absolute', top: '8px', right: '10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: '11px', fontWeight: '700', fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif", letterSpacing: '0.08em', cursor: 'pointer', zIndex: 10000, padding: '2px 0', lineHeight: 1 }}
              title="Close"
            >[CLOSE]</button>
          </div>
        </div>
      )}

      {/* Mouse-following hover image */}
      {hoverImage.show && (
        <div
          className="fixed pointer-events-none z-50"
          style={{ left: `${hoverImage.x + 20}px`, top: `${hoverImage.y + 20}px` }}
        >
          <img
            src={campaigns.find(c => c.id === hoverImage.projectId)?.hoverImg || ''}
            alt=""
            className="w-[240px] h-auto"
          />
        </div>
      )}
    </div>
  );
}

// Brand and Identity
export function BrandContent({ activeTags = [], onTagClick, initialExpandedProject, embedded }: ContentProps) {
  const [expandedProject, setExpandedProject] = useState<string | null>(initialExpandedProject ?? null);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set());
  const [hoverImage, setHoverImage] = useState<{ show: boolean; x: number; y: number; projectId?: string }>({ show: false, x: 0, y: 0 });
  const [mediaScale, setMediaScale] = useState<Record<string, number>>(() => new Proxy({} as Record<string, number>, { get: (t, k) => k in t ? t[k as string] : getPersistedScale() }));
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const toggleProject = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  const brandProjects = [
    {
      id: 'wwf-just-brand',
      title: '(01) WWF [Just*]',
      tagline: 'PACKAGING DESIGNED TO ELIMINATE PACKAGING',
      description: "Everyday we buy millions of household products that are essentially chemicals in plastic bottles. And every one of them puts more pressure on our already fragile environment.\n\nSo we got rid of the plastic and the chemicals by creating a range of natural, alternative products for WWF called just*. Each was 100% natural and packaged using recyclable and biodegradable materials.",
      italic: '"Using packaging to change perception our product design reflected the simple, natural and organic nature of our idea and educated people on how to make the switch to a more sustainable alternative."',
      linkText: "Click here to read the One Show's article about just*.",
      linkHref: 'http://www.oneclub.org/articles/-view/just',
      agency: 'Agency: Leo Burnett Sydney',
      production: '',
      tags: ['Brand', 'Identity', 'Sustainability'],
      hoverImg: '/assets/CFPgqAIsIykasLty_95c969.jpg',
      media: [
        { type: 'image', url: '/assets/oLbmjUPUMWJrGWMO_ea0fb0.jpg', maxWidth: '640px' },
        { type: 'image', url: '/assets/CFPgqAIsIykasLty_95c969.jpg', maxWidth: '500px' },
        { type: 'image', url: '/assets/YvnarBzOvYueLGuU_f6a1bb.gif', maxWidth: '500px' },
        { type: 'image', url: '/assets/QKNljSyKJUUDdcNW_73c0b4.gif', maxWidth: '500px' },
        { type: 'image', url: '/assets/yQgxQEFMfbaJXknc_07226c.jpg', maxWidth: '500px' },
        { type: 'image', url: '/assets/ucPOkqJsCaxnZUMU_ab1619.jpg', maxWidth: '500px' },
        { type: 'image', url: '/assets/rmaoShGYBzogksqG_b451fc.jpg', maxWidth: '500px' },
        { type: 'image', url: '/assets/ogNzsSdcHxamGKja_ff51fb.jpg', maxWidth: '500px' },
        { type: 'image', url: '/assets/mMsoyexyObTDkdTl_03d63c.jpg', maxWidth: '500px' },
        { type: 'image', url: '/assets/tAvomcXyyvCSjbYG_8b8e94.gif', maxWidth: '500px' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
    {
      id: 'studio-mano',
      title: '(02) Studio Mano',
      tagline: 'A Brand Identity Shaped by Hand',
      description: 'The Studio Mano identity follows the same philosophy as the work itself. If every ceramic piece is made by hand, the brand should be too. The identity is built from handmade elements and the ceramics themselves, using illustrations, stamps, organic forms, and details taken directly from the pieces. The goal was to create a visual identity that feels like another handmade object: tactile, imperfect, and human, carrying the same sense of craft as the ceramics.',
      linkText: 'studio-mano.co',
      linkHref: 'https://studio-mano.co',
      linkText2: '@studiomanoceramics',
      linkHref2: 'https://instagram.com/studiomanoceramics',
      agency: '',
      production: '',
      tags: ['Brand', 'Identity', 'Studio'],
      hoverImg: '/assets/sm_hero_259b04ff_e7fea7.webp',
      media: [
        { type: 'image', url: '/assets/sm_hero_259b04ff_e7fea7.webp', maxWidth: '640px' },
        { type: 'image', url: '/assets/sm_logo_textured_7e57ffe3_c3349b.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/studio-mano-boyle-heights_85b52403_2f169e.png', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_aditions_poster_9cdaa088_5ba410.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_aditions_invite_142f4822_dee3bb.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_aditions_event_4a0bbb36_f7ece1.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_brand1_178fafd8_bcc46f.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_sketch1_1bc3a315_ef17ab.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_ceramics_vid_5353fdc9_47cc5b.gif', maxWidth: '280px' },
        { type: 'image', url: '/assets/tile03low_182e1d0a_ac7aa8.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_tile_board_cdf07676_a5a676.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_tiles_colorful_063d8cf7_472bc9.webp', maxWidth: '420px' },
        { type: 'image', url: '/assets/1PROFESORMEZCAL_a37de453_a67d69.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/promezcal_0000_Layer-4_9205ebdc_b82554.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/22PROFESORMEZCAL_a72be719_018add.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/PROMEZ_0007_Layer-14_39c6fbf6_29092b.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_brand2_b4f09427_fbf1a9.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_ladesignweek_aab544cb_0827dc.gif', maxWidth: '224px' },
        { type: 'image', url: '/assets/sm_milan_6aac2bc2_16b75a.jpg', maxWidth: '420px' },
        { type: 'mp4', url: '/assets/05310CA5_cropped_4x5_d307a1db_ab1f87.mp4', aspectRatio: '4/5', videoWidth: '224px', poster: '/assets/05310CA5_poster_b4c03dfa_80db83.jpg' },
        { type: 'image', url: '/assets/sm_riso_print_8232f2c8_8a6aab.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_drop3_1a517719_4f2b59.gif', maxWidth: '280px' },
        { type: 'image', url: '/assets/sm_riso1_6711957d_cac1f2.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_riso2_9538d84e_311f56.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_ceramics1_d62a8037_276788.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_ceramics2_743df90d_6e78eb.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_flask_f9985e42_12c54a.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_drop2_6ab62b2d_bd7cfe.gif', maxWidth: '280px' },
        { type: 'image', url: '/assets/sm_ulamp_584ddde2_9f315d.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_packaging_af859035_9375d8.jpg', maxWidth: '420px' },
        { type: 'image', url: '/assets/sm_sketch2_e3d27585_a67015.jpg', maxWidth: '420px' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
    {
      id: 'facebook-rebrand',
      title: '(03) Facebook [Re-Branding]',
      tagline: 'TONE OF VOICE AND ILLUSTRATION DIRECTION',
      agency: 'Agency: Meta Creative X',
      production: '',
      description: "Led by Meta's in-house design team, the refreshed identity seeks to elevate the most distinctive elements of the existing Facebook brand, unify how its identity comes to life across both product and marketing, and place greater emphasis on accessibility. Using custom typeface Facebook Sans, the design team redrew Facebook's existing wordmark and logo to create a consistent treatment and improve overall legibility. The brand's longstanding core blue was retained but reimagined to be more visually accessible, while the entire iconography and reactions system was rebuilt to meet accessibility guidance and remain legible at any size.\n\nAs a marketing consultant on the project, I co-led the illustration direction and tone of voice, ensuring a consistent look, feel, and voice across product, brand, and marketing — from in-app surfaces to global campaigns.",
      tags: ['Brand', 'Identity', 'Facebook'],
      hoverImg: '/assets/fb-rebrand-thumb_d2c892e3_2b2963.avif',
      media: [
        { type: 'mp4', url: '/assets/fb-rebrand-vimeo_40931d76_29b87b.mp4', aspectRatio: '16/9', poster: '/assets/fb-rebrand-poster-s27_2946b11e_3cd2c3.jpg' },
        { type: 'image', url: '/assets/fb-rebrand-system_b5d9f99b_47867f.png' },
        { type: 'image', url: '/assets/cr-fb-866856539_fa4eb2fc_ba3807.gif' },
        { type: 'image', url: '/assets/cr-fb-866856562_e06048cf_39aaf7.gif' },
        { type: 'image', url: '/assets/cr-fb-866856467_e6c730c6_67e857.gif' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
    {
      id: 'bundaberg-rum',
      title: '(05) Bundaberg Rum [Blending Kit]',
      tagline: 'PACKAGING AS THE EXPERIENCE',
      description: 'Designed for Bundaberg Rum connoisseurs, this limited-edition blending kit elevates the product through packaging that reflects the making of the rum itself. Industrial details, technical typography, and tactile finishes create an authentic, premium experience from the moment it\'s opened.',
      agency: 'Agency: Leo Burnett Sydney',
      production: '',
      tags: ['Brand', 'Identity', 'Packaging'],
      hoverImg: '/assets/bundaberg-label_37e928ed_1cad26.jpg',
      media: [
        { type: 'image', url: '/assets/bundaberg-kit_14f77af0_636d17.jpg' },
        { type: 'image', url: '/assets/bundaberg-bottles_c2e818a2_800434.jpg' },
        { type: 'image', url: '/assets/bundaberg-spread_dcd6c551_5fdd70.jpg' },
        { type: 'image', url: '/assets/bundaberg-label_37e928ed_1cad26.jpg' },
        { type: 'image', url: '/assets/bundaberg-notebook_7b1fb135_ca8b14.jpg' },
        { type: 'image', url: '/assets/bundaberg-top_d07bbd9a_ed76fe.jpg' },
      ] as { type: string; url: string; videoWidth?: string; aspectRatio?: string }[]
    },
  ];

  return (
    <div className={embedded ? 'relative' : 'px-6 py-4 h-full overflow-y-auto relative'} style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}>
      {brandProjects.map((project) => (
        <div key={project.id}>
          <button
            onClick={() => toggleProject(project.id)}
            onMouseEnter={(e) => project.hoverImg && setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id })}
            onMouseLeave={() => setHoverImage({ show: false, x: 0, y: 0 })}
            onMouseMove={(e) => project.hoverImg && setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id })}
            className="w-full text-left py-1 flex items-baseline group relative outline-none focus:outline-none"
            
          >
            <span className={`text-[12.5px] font-normal uppercase transition-colors flex-shrink-0 ${
              expandedProject === project.id
                ? 'bg-[var(--folder-text,#000000)] text-[var(--folder-bg,#ffffff)] px-1'
                : 'group-hover:bg-[var(--folder-text,#000000)] group-hover:text-[var(--folder-bg,#ffffff)] group-hover:px-1'
            }`}>
              {project.title.replace(/^\(\d+\)\s*/, '')}
            </span>
            <span className="flex-1 border-b-[2px] border-dotted border-[currentColor] mx-2"></span>
            <span className="text-[12.5px] font-normal uppercase flex-shrink-0">
              {project.title.match(/^\(\d+\)/)?.[0] || ''}
            </span>
          </button>
          {expandedProject === project.id && (
        <div className="pb-6" style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}>
          <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--folder-text, #000000)' }}>{project.tagline}</p>
          {project.description.split('\n\n').map((para, i) => (
            <p key={i} style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--folder-text, #000000)', marginBottom: 12 }}>{para}</p>
          ))}
          {(project as any).italic && (
            <p style={{ fontSize: 14.5, lineHeight: 1.65, fontStyle: 'italic', color: 'var(--folder-text, #000000)', marginBottom: 12, opacity: 0.8 }}>{(project as any).italic}</p>
          )}
          {(project as any).linkHref && (
            <p style={{ fontSize: 14.5, lineHeight: 1.65, marginBottom: 16 }}>
              {project.id === 'studio-mano' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 16 }}>
                  <a href={(project as any).linkHref} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, textDecoration: 'underline' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    studio-mano.co
                  </a>
                  {(project as any).linkHref2 && (
                    <a href={(project as any).linkHref2} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, textDecoration: 'underline' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                      {(project as any).linkText2}
                    </a>
                  )}
                </span>
              ) : (
                <>Click <a href={(project as any).linkHref} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, textDecoration: 'underline' }}>here</a> to read the One Show&apos;s article about just*.</>
              )}
            </p>
          )}
          {((project as any).agency || (project as any).production) && (
            <p className="text-[10.5px] uppercase mb-6 opacity-70 tracking-wide">
              {(project as any).agency && <span>[{(project as any).agency}]</span>}
              {(project as any).agency && (project as any).production && ' '}
              {(project as any).production && <span>[{(project as any).production}]</span>}
            </p>
          )}
              {project.media.length > 0 ? (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--folder-bg, #000000)', paddingBottom: 8, marginBottom: 4 }}>
                  <MediaSizeSlider scale={mediaScale[project.id] ?? 1.3} onChange={s => setMediaScale(prev => ({ ...prev, [project.id]: s }))} />
                  <div className="media-row-scroll" style={{ display: 'flex', flexWrap: 'nowrap', gap: '12px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'auto', scrollbarColor: 'rgba(0,0,0,0.5) rgba(0,0,0,0.15)', alignItems: 'stretch', marginTop: '8px', height: `${scaleHeight(mediaScale[project.id] ?? 1.3) + 36}px` }}>
                    {(() => { const sc = mediaScale[project.id] ?? 1.3; const rowH = scaleHeight(sc); return project.media.map((item, idx) => {
                      const vid = `${project.id}-${idx}`;
                      const isImage = item.type === 'image';
                      const isPair = item.type === 'pair';
                      const ar = (item as any).aspectRatio || '16/9';
                      return (
                        <div key={idx} className="flex flex-col gap-2" style={{ flexShrink: 0, height: rowH + 36 }}>
                          {isPair ? (
                            <div style={{ display: 'flex', gap: '4px', height: rowH, flexShrink: 0 }}>
                              <img src={item.url} alt="" className="animate-fade-in block" style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain' }} />
                              <img src={(item as any).url2} alt="" className="animate-fade-in block" style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain' }} />
                            </div>
                          ) : item.type === 'instagram' ? (
                            <InstagramEmbed url={item.url} height={rowH} />
                          ) : isImage ? (
                            <img
                              src={item.url}
                              alt=""
                              className="animate-fade-in block"
                              style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain', transition: 'height 0.2s ease' }}
                              onLoad={() => setLoadedVideos(prev => new Set(prev).add(vid))}
                            />
                          ) : (
                            <>
                              {item.type === 'mp4' ? (
                                <video src={item.url} poster={(item as any).poster} className="animate-fade-in" controls playsInline onLoadedData={() => setLoadedVideos(prev => new Set(prev).add(vid))} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }} />
                              ) : (
                                (item as any).blackBg ? (
                                  <div style={{ height: rowH, width: `calc(${rowH}px * (16 / 9))`, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }}>
                                    <VimeoEmbed url={item.url} aspectRatio={ar} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0 }} />
                                  </div>
                                ) : (
                                  <VimeoEmbed url={item.url} aspectRatio={ar} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }} />
                                )
                              )}
                            </>
                          )}
                          <button onClick={() => setModalVideoUrl(isPair ? item.url : isImage ? item.url : item.type === 'video' ? (/\.(mp4|mov|webm)$/i.test(item.url) ? item.url : `https://player.vimeo.com/video/${item.url.split('/').pop()?.split('?')[0]}?autoplay=1`) : (/player\.vimeo\.com/.test(item.url) ? item.url.replace(/\?.*$/, '') + '?autoplay=1&badge=0&autopause=0&player_id=0&app_id=58479' : item.url))} className="text-[9px] font-bold uppercase tracking-[0.08em] hover:underline cursor-pointer">[Enlarge]</button>
                        </div>
                      );
                    }); })()}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ))}
      {modalVideoUrl && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
          onClick={() => setModalVideoUrl(null)}
        >
          <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
            {modalVideoUrl.includes('vimeo.com') ? (
              <div style={{ width: 'min(90vw, 1200px)', aspectRatio: '16/9' }}>
                <iframe src={modalVideoUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              </div>
            ) : /\.(mp4|mov|webm)$/i.test(modalVideoUrl) ? (
              <video src={modalVideoUrl} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block' }} />
            ) : (
              <img src={modalVideoUrl} alt="Enlarged media" style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block', objectFit: 'contain' }} />
            )}
            <button
              onClick={() => setModalVideoUrl(null)}
              style={{ position: 'absolute', top: '8px', right: '10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: '11px', fontWeight: '700', fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif", letterSpacing: '0.08em', cursor: 'pointer', zIndex: 10000, padding: '2px 0', lineHeight: 1 }}
              title="Close"
            >[CLOSE]</button>
          </div>
        </div>
      )}
      {hoverImage.show && (
        <div className="fixed pointer-events-none z-50" style={{ left: `${hoverImage.x + 20}px`, top: `${hoverImage.y + 20}px` }}>
          <img src={brandProjects.find(p => p.id === hoverImage.projectId)?.hoverImg || ''} alt="" className="w-[240px] h-auto" />
        </div>
      )}
    </div>
  );
}

// Events and Activations
export function EventsContent({ activeTags = [], onTagClick, initialExpandedProject, embedded }: ContentProps) {
  const [expandedProject, setExpandedProject] = useState<string | null>(initialExpandedProject ?? null);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set());
  const [hoverImage, setHoverImage] = useState<{ show: boolean; x: number; y: number; projectId?: string }>({ show: false, x: 0, y: 0 });
  const [mediaScale, setMediaScale] = useState<Record<string, number>>(() => new Proxy({} as Record<string, number>, { get: (t, k) => k in t ? t[k as string] : getPersistedScale() }));
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const toggleProject = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  const eventsProjects = [
    {
      id: 'meta-connect-2025',
      title: '(01) Meta [Connect 2025]',
      tagline: "BUILT FOR THE FEED",
      description: "Connect 2025 was built as a social-first broadcast. Mark opened in a walk-and-talk wearing the Ray-Ban Display; the show closed with Diplo running live on campus in the Oakley Meta Vanguard. Every creative choice was engineered for shareability: 190M social reach (4x prior year), 62M keynote views, 61M IG creator reach.",
      agency: '',
      production: '',
      tags: ['Events', 'Activation', 'Meta'],
      hoverImg: '/assets/mc2025-stage_4e7dd518_66427d.webp',
      media: [
        { type: 'youtube', url: 'https://www.youtube.com/embed/Q9eLemEd9FY', videoWidth: 'min(640px, 70vw)', aspectRatio: '16/9', poster: '/assets/mc2025_thumb_350_45c642e7_39307f.jpg' },
        { type: 'mp4', url: '/assets/zuck-reel-DOu6KyaDpst_11c4ed70_a5a6fd.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/1173692006?badge=0&autopause=0&player_id=0&app_id=58479', videoWidth: 'min(640px, 70vw)', aspectRatio: '16/9' },
        { type: 'vimeo', url: 'https://player.vimeo.com/video/1173696951?badge=0&autopause=0&player_id=0&app_id=58479', videoWidth: 'min(640px, 70vw)', aspectRatio: '16/9' },
        { type: 'mp4', url: '/assets/mc2025-v4_2e18c0b2_3c1d50.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '4/5' },
        { type: 'mp4', url: '/assets/mc2025-v7_2effee1d_593110.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '4/5' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
    {
      id: 'meta-connect-2024',
      title: '(02) Meta [Connect 2024]',
      tagline: "THE KEYNOTE BECOMES THE DEMO",
      description: "Connect 2024 broke the tech keynote format by bringing external guests on stage for the first time: Awkwafina voicing a live AI demo, creator Don Allen Stevenson showcasing his AI Studio build, and UFC champion Brandon Moreno having a real-time translated conversation with Mark. Each guest proved a product capability live. The keynote became the content, reaching 41M views.",
      agency: '',
      production: '',
      tags: ['Events', 'Activation', 'Meta'],
      hoverImg: '/assets/meta-connect-zuck-orion_a980dc7c_e39844.jpg',
      media: [
        { type: 'youtube', url: 'https://www.youtube.com/embed/I7JyydkqDeI?start=2454', videoWidth: 'min(640px, 70vw)', aspectRatio: '16/9' },
        { type: 'mp4', url: '/assets/meta-connect-2024-video_fdc53507_f3c3c3.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
        { type: 'youtube', url: 'https://www.youtube.com/embed/iDtETDI7NDY', videoWidth: 'min(640px, 70vw)', aspectRatio: '16/9' },
        { type: 'image', url: '/assets/meta-connect-zuck-orion_a980dc7c_e39844.jpg', maxWidth: '500px' },
        { type: 'image', url: '/assets/meta-connect-glasses-stage_692dfd46_50c29b.jpg', maxWidth: '500px' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
    {
      id: 'mr-lee',
      title: '(03) Playstation [Mr. Lee Tailor Shop]',
      tagline: 'TAILOR SHOP TO SUPERHEROES AND VILLAINS',
      description: "In the new Playstation game, DC Universe Online, you can create your own superhero or villain by choosing powers, abilities and your custom suit.\n\nMr. Lee's Tailor Shop specializes in handcrafting custom suits for heroes and villains. So you can make your suit a reality and can live the same experience as the game in the offline world.\n\nThe live experience began deciding whether to be a hero or villain, fill out a questionnaire, and get measurements taken. The custom suit was first created within the game and then an illustrator drew a sketch and gave it to the client together with an estimate.",
      agency: 'Agency: Leo Burnett Iberia',
      production: '',
      tags: ['Events', 'Activation', 'Experiential'],
      hoverImg: '/assets/playstation-mr-lee-tailor-shop(1)_d915f8ea_b2e386.gif',
      media: [
        { type: 'vimeo', url: 'https://player.vimeo.com/video/435860958?badge=0&autopause=0&player_id=0&app_id=58479', videoWidth: 'min(640px, 70vw)', aspectRatio: '4/3', blackBg: true },
        { type: 'image', url: '/assets/01-2000x1254(1)_3dec4caa_cb54da.jpg', maxWidth: '400px' },
        { type: 'image', url: '/assets/mktdirecto02-2000x1012_7d9d238c_9b68b2.jpg', maxWidth: '400px' },
        { type: 'image', url: '/assets/02-2000x1333(1)_b8281d10_4d5fa1.jpg', maxWidth: '200px' },
        { type: 'image', url: '/assets/03-2000x1333(2)_941e377b_cf8cab.jpg', maxWidth: '200px' },
        { type: 'image', url: '/assets/04-2000x1400_7e12b80f_4e051e.jpg', maxWidth: '200px' },
        { type: 'image', url: '/assets/05-2000x1400_a9e6a18c_44cb08.jpg', maxWidth: '200px' },
        { type: 'image', url: '/assets/06-2000x1333(1)_0bf74c2a_fdb3c3.jpg', maxWidth: '200px' },
        { type: 'image', url: '/assets/07-2000x1333_050f519e_b571df.jpg', maxWidth: '200px' },
        { type: 'image', url: '/assets/close04-2000x1333(1)_9f897b34_b1783a.jpg', maxWidth: '200px' },
        { type: 'image', url: '/assets/close05-2000x1333(1)_58624dfb_3d274a.jpg', maxWidth: '200px' },
        { type: 'image', url: '/assets/close06-2000x1333_868f1e4d_382f71.jpg', maxWidth: '200px' },
        { type: 'image', url: '/assets/close07-2000x1333_3ed755cf_e5aaee.jpg', maxWidth: '200px' },
        { type: 'image', url: '/assets/img_2556-2000x1333_a3fdc0c9_72111c.jpg', maxWidth: '200px' },
        { type: 'image', url: '/assets/batman-2000x2796(1)_18724cf4_5d4f5f.jpg', maxWidth: '160px' },
        { type: 'image', url: '/assets/greenlantern-2000x2796_05e4d8a1_4a1f99.jpg', maxWidth: '160px' },
        { type: 'image', url: '/assets/flash-2000x2796_8462f3f3_0a5b45.jpg', maxWidth: '160px' },
        { type: 'image', url: '/assets/superman-2000x2796(1)_78368180_5fbfc5.jpg', maxWidth: '160px' },
        { type: 'image', url: '/assets/hawke-2000x2796_60f16f5b_487518.jpg', maxWidth: '160px' },
        { type: 'image', url: '/assets/sandman-2000x2796_457180a4_9e84a8.jpg', maxWidth: '160px' },
        { type: 'image', url: '/assets/poster01-2000x3143(1)_03b9c54a_08af9e.jpg', maxWidth: '160px' },
        { type: 'image', url: '/assets/poster02-2000x3143_f670d0fc_21b7e9.jpg', maxWidth: '160px' },
      ] as { type: string; url: string; [key: string]: any }[]
    },
  ];

  return (
    <div className={embedded ? 'relative' : 'px-6 py-4 h-full overflow-y-auto relative'} style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}>
      {eventsProjects.map((project) => (
        <div key={project.id}>
          <button
            onClick={() => toggleProject(project.id)}
            onMouseEnter={(e) => project.hoverImg && setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id })}
            onMouseLeave={() => setHoverImage({ show: false, x: 0, y: 0 })}
            onMouseMove={(e) => project.hoverImg && setHoverImage({ show: true, x: e.clientX, y: e.clientY, projectId: project.id })}
            className="w-full text-left py-1 flex items-baseline group relative outline-none focus:outline-none"
            
          >
            <span className={`text-[12.5px] font-normal uppercase transition-colors flex-shrink-0 ${
              expandedProject === project.id
                ? 'bg-[var(--folder-text,#000000)] text-[var(--folder-bg,#ffffff)] px-1'
                : 'group-hover:bg-[var(--folder-text,#000000)] group-hover:text-[var(--folder-bg,#ffffff)] group-hover:px-1'
            }`}>
              {project.title.replace(/^\(\d+\)\s*/, '')}
            </span>
            <span className="flex-1 border-b-[2px] border-dotted border-[currentColor] mx-2"></span>
            <span className="text-[12.5px] font-normal uppercase flex-shrink-0">
              {project.title.match(/^\(\d+\)/)?.[0] || ''}
            </span>
          </button>
          {expandedProject === project.id && (
            <div className="pb-6" style={{background:"var(--folder-bg, #000000)",color:"var(--folder-text, #000000)"}}>
              <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, color: 'var(--folder-text, #000000)' }}>{project.tagline}</p>
              <div style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--folder-text, #000000)", marginBottom: 16 }}>{renderDescription(project.description)}</div>
              {((project as any).agency || (project as any).production) && (
                <p className="text-[10.5px] uppercase mb-6 opacity-70 tracking-wide">
                  {(project as any).agency && <span>[{(project as any).agency}]</span>}
                  {(project as any).agency && (project as any).production && ' '}
                  {(project as any).production && <span>[{(project as any).production}]</span>}
                </p>
              )}
              {project.media.length > 0 ? (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--folder-bg, #000000)', paddingBottom: 8, marginBottom: 4 }}>
                  <MediaSizeSlider scale={mediaScale[project.id] ?? 1.3} onChange={s => setMediaScale(prev => ({ ...prev, [project.id]: s }))} />
                  <div className="media-row-scroll" style={{ display: 'flex', flexWrap: 'nowrap', gap: '12px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'auto', scrollbarColor: 'rgba(0,0,0,0.5) rgba(0,0,0,0.15)', alignItems: 'stretch', marginTop: '8px', height: `${scaleHeight(mediaScale[project.id] ?? 1.3) + 36}px` }}>
                  {(() => {
                    const sc = mediaScale[project.id] ?? 1.3;
                    const rowH = scaleHeight(sc);
                    return project.media.map((item, idx) => {
                      const vid = `${project.id}-${idx}`;
                      const isImage = item.type === 'image';
                      const ar = (item as any).aspectRatio || '16/9';
                      return (
                        <div key={idx} className="flex flex-col gap-2" style={{ flexShrink: 0, height: rowH + 36 }}>
                          {item.type === 'instagram' ? (
                            <InstagramEmbed url={item.url} height={rowH} />
                          ) : isImage ? (
                            <img
                              src={item.url}
                              alt=""
                              className="animate-fade-in block"
                              style={{ height: rowH, width: 'auto', maxWidth: 'none', objectFit: 'contain', transition: 'height 0.2s ease' }}
                              onLoad={() => setLoadedVideos(prev => new Set(prev).add(vid))}
                            />
                          ) : (
                            <>
                              {item.type === 'mp4' ? (
                                <video
                                  src={item.url}
                                  className="animate-fade-in"
                                  controls
                                  playsInline
                                  onLoadedData={() => setLoadedVideos(prev => new Set(prev).add(vid))}
                                  style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }}
                                />
                              ) : item.type === 'youtube' ? (
                                <div style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }}>
                                  <YouTubePoster url={item.url} poster={(item as any).poster} />
                                </div>
                              ) : (
                                (item as any).blackBg ? (
                                  <div style={{ height: rowH, width: `calc(${rowH}px * (16 / 9))`, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }}>
                                    <VimeoEmbed url={item.url} aspectRatio={ar} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0 }} />
                                  </div>
                                ) : (
                                  <VimeoEmbed url={item.url} aspectRatio={ar} style={{ height: rowH, width: `calc(${rowH}px * (${ar.replace('/', ' / ')}))`, display: 'block', flexShrink: 0, transition: 'height 0.2s ease, width 0.2s ease' }} />
                                )
                              )}
                            </>
                          )}
                          <button onClick={() => setModalVideoUrl(isImage ? item.url : item.type === 'youtube' ? item.url : item.type === 'video' ? (/\.(mp4|mov|webm)$/i.test(item.url) ? item.url : `https://player.vimeo.com/video/${item.url.split('/').pop()?.split('?')[0]}?autoplay=1`) : (/player\.vimeo\.com/.test(item.url) ? item.url.replace(/\?.*$/, '') + '?autoplay=1&badge=0&autopause=0&player_id=0&app_id=58479' : item.url))} className="text-[9px] font-bold uppercase tracking-[0.08em] hover:underline cursor-pointer">[Enlarge]</button>
                        </div>
                      );
                    });
                  })()}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ))}
      {modalVideoUrl && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
          onClick={() => setModalVideoUrl(null)}
        >
          <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
            {modalVideoUrl.includes('vimeo.com') || modalVideoUrl.includes('youtube.com') ? (
              <div style={{ width: 'min(90vw, 1200px)', aspectRatio: '16/9' }}>
                <iframe src={modalVideoUrl} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowFullScreen />
              </div>
            ) : /\.(mp4|mov|webm)$/i.test(modalVideoUrl) ? (
              <video src={modalVideoUrl} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block' }} />
            ) : (
              <img src={modalVideoUrl} alt="Enlarged media" style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block', objectFit: 'contain' }} />
            )}
            <button
              onClick={() => setModalVideoUrl(null)}
              style={{ position: 'absolute', top: '8px', right: '10px', background: 'transparent', border: 'none', color: '#ffffff', fontSize: '11px', fontWeight: '700', fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif", letterSpacing: '0.08em', cursor: 'pointer', zIndex: 10000, padding: '2px 0', lineHeight: 1 }}
              title="Close"
            >[CLOSE]</button>
          </div>
        </div>
      )}
      {hoverImage.show && (
        <div className="fixed pointer-events-none z-50" style={{ left: `${hoverImage.x + 20}px`, top: `${hoverImage.y + 20}px` }}>
          <img src={eventsProjects.find(p => p.id === hoverImage.projectId)?.hoverImg || ''} alt="" className="w-[240px] h-auto" />
        </div>
      )}
    </div>
  );
}

// About
const HELLO_GREETINGS = ['Oi!', 'Hi!', 'Hola!'];

export function AboutContent() {
  const [greetingIndex, setGreetingIndex] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => {
      setGreetingIndex(i => (i + 1) % HELLO_GREETINGS.length);
    }, 2500);
    return () => clearInterval(t);
  }, []);
  const greeting = HELLO_GREETINGS[greetingIndex];
  const sectionHead = (label: string) => ({
    fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    marginBottom: 8, color: 'var(--folder-text, #ffffff)', borderBottom: '1px solid rgba(0,0,0,0.18)', paddingBottom: 6
  });

  const awards = [
    // Column 1 (first 14)
    ['Cannes Lions', 'Gold (design), Silver (press), Bronze (film, outdoor, media, mobile). 23 Shortlists'],
    ['Cannes Report 2011', 'Top Ten Art Director Worldwide'],
    ['Lowe Institute NY', 'Selected for emerging leaders program'],
    ['Clio Awards', '1 Silver, 2 Bronzes, 1 Shortlist'],
    ['Webby Awards', '2 Winners, 3 Honorees'],
    ['Shorty Awards', '2 Winners · Shortlist — Shorty Social Good Awards'],
    ['Inhouse Agency Forum', 'Silver — Social Media Animation Graphics'],
    ['Inhouse Creativity Awards', 'Gold — Social Media Animation'],
    ['Eurobest', '2 Golds (integrated, design), 1 Bronze, 2 Shortlists'],
    ['London International Awards', '1 Gold, 2 Silvers, 5 Bronzes, 2 Finalists'],
    ['Andy Awards', '2 Golds, 2 Silvers, 1 Bronze, 1 Shortlist'],
    ['LAUS Award', '1 Grand LAUS, 2 Golds, 1 Silver'],
    ['El Ojo', '5 Golds, 1 Silver, 3 Bronzes, 2 Shortlists'],
    ['El Sol', '1 Gold, 4 Silvers, 2 Bronzes'],
    // Column 2 (last 14)
    ['One Show', 'One to Watch, Green Pencil, Silver, Bronze, 5 Merits'],
    ['The Leo\'s', 'Creative Person of the Year — Leo Burnett Sydney'],
    ['Dieline', 'Top 50 Package Designs of the Decade'],
    ['Art Directors Club', '1 Gold, 2 Bronzes'],
    ['AdFest Asia/Pacific', '1 Gold, 2 Silvers, 3 Bronzes, 2 Finalists'],
    ['Award Awards Australasia', '1 Gold, 7 Silvers, 2 Bronzes, 1 Finalist'],
    ['Spikes Asia', '1 Silver, 1 Bronze, 5 Finalists'],
    ['New York Festivals', '1 Silver, 7 Finalists'],
    ['YoungGuns', '1 Silver, 3 Bronze Bullets, 3 Shortlists'],
    ['MMA Smarties', 'Gold (Mobile Website), Gold (Mobile Audio)'],
    ['Clio Sport', 'Silver (Partnership), Silver (Direct)'],
    ['The Directory Big Won', '9th Design Campaign Worldwide · 11th Integrated Campaign Worldwide'],
    ['Lürzer\'s Archive', '11th Art Director Worldwide · Front Cover · 200 Best Illustrators 16/17'],
    ['Contagious Magazine', 'Front Cover'],
  ];

  return (
    <div style={{ background: 'var(--folder-bg, #000000)', color: 'var(--folder-text, #ffffff)', fontFamily: 'Inter, Arial, sans-serif', height: '100%', overflowY: 'auto', padding: '28px 28px 40px 28px' }}>
      {/* Two-column grid — full-window scroll */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 2fr', gap: '0 40px', width: '100%' }}>

        {/* LEFT COLUMN — bio, what I do, experience, clients, perspective, recognition */}
        <div>

          {/* Intro */}
          <p style={{ fontSize: 14.5, lineHeight: 1.65, marginBottom: 8, color: 'var(--folder-text, #ffffff)', fontWeight: '700' }}>
            {greeting} 👋<br />I'm Bruno Nakano, a Brazilian-Japanese Creative Director working across social, brand design, product, and storytelling.
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, marginBottom: 8, color: 'var(--folder-muted, #000000)' }}>
            I've spent time at agencies, design studios, and in-house teams around the world, helping launch products, build brands, shape executive communications, and create work people genuinely want to engage with. From global campaigns and keynote stages to product experiences and internet culture, the work has always been about finding the right idea for the right moment, and having fun doing it.
          </p>
          <div style={{ marginBottom: 24 }} />


          {/* Current */}
          <div style={{ marginBottom: 24, marginTop: 0 }}>
            <h3 style={sectionHead('Current')}>Current</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--folder-muted, #000000)' }}>
              At Meta, I lead a small social creative team dedicated to supporting Mark Zuckerberg, helping shape how new technologies show up in the world through social content and product storytelling. I also lead the creative direction for Connect, Meta's flagship conference, bringing together a team of 20+ creatives to deliver the company's biggest moment each year.
            </p>
          </div>

          {/* Experience */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={sectionHead('Experience')}>Past</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.75, color: 'var(--folder-muted, #000000)' }}>
              Over the years, I've been fortunate to work with local and global brands across multiple countries, disciplines, and mediums, at places like{' '}
              Meta<sup style={{ fontSize: 9.5, fontWeight: 400, color: 'var(--folder-muted, #000000)', verticalAlign: 'super', marginLeft: 2 }}>Menlo Park</sup>,{' '}
              FCB West<sup style={{ fontSize: 9.5, fontWeight: 400, color: 'var(--folder-muted, #000000)', verticalAlign: 'super', marginLeft: 2 }}>San Francisco</sup>,{' '}
              R/GA<sup style={{ fontSize: 9.5, fontWeight: 400, color: 'var(--folder-muted, #000000)', verticalAlign: 'super', marginLeft: 2 }}>New York</sup>,{' '}
              Leo Burnett<sup style={{ fontSize: 9.5, fontWeight: 400, color: 'var(--folder-muted, #000000)', verticalAlign: 'super', marginLeft: 2 }}>Sydney</sup>,{' '}
              Lola<sup style={{ fontSize: 9.5, fontWeight: 400, color: 'var(--folder-muted, #000000)', verticalAlign: 'super', marginLeft: 2 }}>Madrid</sup>,{' '}
              Leo Burnett Iberia<sup style={{ fontSize: 9.5, fontWeight: 400, color: 'var(--folder-muted, #000000)', verticalAlign: 'super', marginLeft: 2 }}>Madrid</sup>, and{' '}
              JWT<sup style={{ fontSize: 9.5, fontWeight: 400, color: 'var(--folder-muted, #000000)', verticalAlign: 'super', marginLeft: 2 }}>São Paulo</sup>.
            </p>
          </div>

          {/* Recognition — two columns inside col 1 */}
          <div>
            <h3 style={sectionHead('Recognition')}>Recognition</h3>
            <div style={{ display: 'flex', gap: 32 }}>
              {[awards.slice(0, Math.ceil(awards.length / 2)), awards.slice(Math.ceil(awards.length / 2))].map((col, ci) => (
                <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {col.map(([award, detail]) => (
                    <div key={award} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--folder-text, #ffffff)', letterSpacing: '0.02em' }}>{award}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--folder-text, #000000)', lineHeight: 1.5, opacity: 0.7 }}>{detail}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN — contact, studiomano, status, languages */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>

          {/* Contact */}
          <div style={{ marginBottom: 24, width: '100%' }}>
            <h3 style={{ ...sectionHead('Contact'), borderBottom: '1px solid rgba(0,0,0,0.18)' }}>Contact</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <a href="mailto:hello@brunonakano.com" style={{ fontSize: 14.5, color: 'var(--folder-text, #ffffff)', textDecoration: 'underline', fontWeight: 700 }}>hello@brunonakano.com</a>
              <a href="https://www.linkedin.com/in/brunonakano" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14.5, color: 'var(--folder-text, #ffffff)', textDecoration: 'underline', fontWeight: 700 }}>LinkedIn</a>

            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom: 24, width: '100%' }}>
            <h3 style={{ ...sectionHead('Status'), borderBottom: '1px solid rgba(0,0,0,0.18)' }}>Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <span style={{ fontSize: 14.5, color: 'var(--folder-muted, #000000)' }}>Green Card Holder</span>

            </div>
          </div>

          {/* Languages */}
          <div style={{ width: '100%', marginBottom: 24 }}>
            <h3 style={{ ...sectionHead('Languages'), borderBottom: '1px solid rgba(0,0,0,0.18)' }}>Languages</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <span style={{ fontSize: 14.5, color: 'var(--folder-muted, #000000)' }}>Portuguese (native)</span>
              <span style={{ fontSize: 14.5, color: 'var(--folder-muted, #000000)' }}>English (fluent)</span>
              <span style={{ fontSize: 14.5, color: 'var(--folder-muted, #000000)' }}>Spanish (fluent)</span>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}


// Webcam + AI Chat
export function WebcamChatContent() {
  const [messages, setMessages] = useState<{id: number; text: string; sender: 'user'|'ai'; timestamp: Date}[]>([
    { id: 1, text: "hi! 👋\n\nI can chat in english, portuguese or spanish. your pick.", sender: 'ai', timestamp: new Date() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<{role: 'user'|'assistant'; content: string}[]>([]);
  const chatMutation = trpc.chat.send.useMutation();
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);
  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    const userText = inputValue.trim();
    const userMessage = { id: Date.now(), text: userText, sender: 'user' as const, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    conversationHistoryRef.current.push({ role: 'user', content: userText });
    try {
      const result = await chatMutation.mutateAsync({
        messages: conversationHistoryRef.current,
      });
      const aiText = typeof result.text === 'string' ? result.text : 'Sorry, I could not respond right now. You can always reach me at hello@brunonakano.com!';
      conversationHistoryRef.current.push({ role: 'assistant', content: aiText });
      if (conversationHistoryRef.current.length > 20) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-20);
      }
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, text: aiText, sender: 'ai', timestamp: new Date() }]);
    } catch (err) {
      console.error('Chat error:', err);
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, text: "Sorry, something went wrong. You can always reach me at hello@brunonakano.com!", sender: 'ai', timestamp: new Date() }]);
    }
  };

  return (
    <div className="flex" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Chat - full width */}
      <div className="bg-[#000000]" style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Chat Messages - scrollable, takes remaining space */}
        <div style={{ flex: '1 1 0', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: 0 }}>
          {messages.map((message) => (
            <div key={message.id} className="text-[12.5px] leading-relaxed" style={{ color: 'var(--folder-text, #ffffff)' }}>
              <span className="font-bold" style={{ color: 'var(--folder-text, #ffffff)' }}>{message.sender === 'ai' ? 'Bruno' : 'You'}:</span>
              {' '}
              <span style={{ whiteSpace: 'pre-wrap' }}>{message.text}</span>
            </div>
          ))}
          {isTyping && (
            <div className="text-[12.5px] leading-relaxed italic" style={{ color: 'var(--folder-text, #ffffff)' }}>
              <span className="font-bold" style={{ color: 'var(--folder-text, #ffffff)' }}>Bruno:</span> typing...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area - always pinned at bottom, never shrinks */}
        <div className="border-t-[2px] border-[#333333] p-3" style={{ flexShrink: 0 }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Type message..."
              className="flex-1 px-2 py-1 border-[1px] border-[#555555] bg-[#111111] text-[#ffffff] text-[12.5px] focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={isTyping}
              className="px-3 py-1 bg-[#ffffff] text-[#000000] hover:bg-[#cccccc] text-[12.5px] uppercase font-bold disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Ceramics and Furniture
export function PotteryContent({ activeTags = [], onTagClick }: ContentProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const colRef0 = useRef<HTMLDivElement>(null);
  const colRef1 = useRef<HTMLDivElement>(null);
  const colRef2 = useRef<HTMLDivElement>(null);
  const columnRefs = [colRef0, colRef1, colRef2];

  const [shuffledImages] = useState(() => {
    const imageArray = [
      '/assets/KODAK-200-5-of-38_c1176a.jpg',
      '/assets/03_deb729.JPG',
      '/assets/Snapinsta.app_367361112_794386825749845_3041882079062117529_n_1080_40323e.jpg',
      '/assets/DSC08677_b64cc5.jpg',
      '/assets/Snapinsta.app_367037634_756500866249869_6481214663538332849_n_1080_8800ee.jpg',
      '/assets/Made-this-wooden-chair-with-Marcio--a-craftsman-based-in-Paraty--Rio-de-Janeiro.-For-generations-3_d7d8cf.jpg',
      '/assets/mezcal_3d54db.jpg',
      '/assets/Snapinsta.app_407575311_1093064738276849_3352866088452037380_n_1080_6b3c26.jpg',
      '/assets/studiomano05-1_c55278.jpg',
      '/assets/website_0006_Layer-135_512e69.jpg',
      '/assets/tile02low_0c54a1.jpg',
      '/assets/website_0005_Layer-133_e7a392.jpg',
      '/assets/website_0006_Group-1_0aca53.jpg',
      '/assets/toro01_adf808.jpg',
      '/assets/Snapinsta.app_397128198_2699441313565605_7136852584015873761_n_1080_a88cd3.jpg',
      '/assets/4x5_01_9b6bd1.jpg',
      '/assets/IMG_02332_db9674.jpg',
      '/assets/tile-copy_483ba6.jpg',
      '/assets/LADW_0004_Group-3-copy_362c4f.jpg',
      '/assets/This-is-America_Studio-Mano_The-Climate-Refugees_Credit-Jonathan-Hokklo-copy_0d54a9.jpeg',
      '/assets/Made-this-wooden-chair-with-Marcio--a-craftsman-based-in-Paraty--Rio-de-Janeiro.-For-generations-2_afe74a.jpg',
      '/assets/tile03low_8bfd55.jpg',
      '/assets/Made-this-wooden-chair-with-Marcio--a-craftsman-based-in-Paraty--Rio-de-Janeiro.-For-generations-1_a02ae4.jpg',
      '/assets/promez_c751f1.jpg',
      '/assets/oncapintada_298c3b.jpg',
      '/assets/DSCF0333-copy_163b86.jpg',
      '/assets/toro03_f98fae.jpg',
      '/assets/Snapinsta.app_396567091_873442487563577_4738128618748587376_n_1080_693e7a.jpg',
    ];
    for (let i = imageArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [imageArray[i], imageArray[j]] = [imageArray[j], imageArray[i]];
    }
    return imageArray;
  });

  useEffect(() => {
    const scrollSpeeds = [0.3, -0.4, 0.35];
    const intervals: NodeJS.Timeout[] = [];
    columnRefs.forEach((ref, colIdx) => {
      if (ref.current) {
        const interval = setInterval(() => {
          if (ref.current) {
            ref.current.scrollTop += scrollSpeeds[colIdx];
            if (scrollSpeeds[colIdx] > 0 && ref.current.scrollTop >= ref.current.scrollHeight - ref.current.clientHeight) {
              ref.current.scrollTop = 0;
            } else if (scrollSpeeds[colIdx] < 0 && ref.current.scrollTop <= 0) {
              ref.current.scrollTop = ref.current.scrollHeight;
            }
          }
        }, 16);
        intervals.push(interval);
      }
    });
    return () => intervals.forEach(clearInterval);
  }, []);

  const images = shuffledImages;

  const col1 = images.filter((_, i) => i % 3 === 0);
  const col2 = images.filter((_, i) => i % 3 === 1);
  const col3 = images.filter((_, i) => i % 3 === 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--folder-bg, #000000)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px 14px', fontFamily: 'Inter, Arial, sans-serif', color: 'var(--folder-text, #000000)', lineHeight: 1.65, flexShrink: 0, borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, color: 'var(--folder-text, #000000)' }}>Studio Mano</p>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--folder-text, #000000)', marginBottom: 10 }}>
          Studio Mano is my side gig and a creative outlet where I can step away from the computer for a bit and just make things with my hands. Through ceramics, I’ve also met other makers and occasionally collaborate with them on furniture pieces.
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--folder-text, #000000)' }}>
          I’ve been lucky to exhibit my pieces at{' '}
          <a href="https://www.milandesignweek.it" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>Milan Design Week</a>,{' '}
          <a href="https://ladesignfestival.org" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>LA Design Weekend</a>,{' '}
          and in galleries across New York, Los Angeles, and San Francisco. Along the way, I've created projects for artists like{' '}
          <a href="https://www.lizzymcalpine.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>Lizzy McAlpine</a>, collaborated with brands like{' '}
          <a href="https://www.madremezcal.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>Madre Mezcal</a>, and been featured in{' '}
          <a href="https://www.wallpaper.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>Wallpaper</a>{' '}and{' '}
          <a href="https://www.houseandgarden.co.uk" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>House & Garden</a>. I'm currently represented by{' '}
          <a href="https://galeriephilia.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>Galerie Philia</a>.
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--folder-text, #000000)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="https://studio-mano.co" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            studio-mano.co
          </a>
          <a href="https://instagram.com/studiomanoceramics" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            @studiomanoceramics
          </a>
        </p>
      </div>
      {/* Scrolling columns */}
      <div style={{ display: 'flex', flex: 1, gap: '12px', padding: '12px', overflow: 'hidden' }}>
        {[col1, col2, col3].map((col, colIdx) => (
          <div
            key={colIdx}
            ref={columnRefs[colIdx]}
            style={{
              flex: 1,
              overflowY: 'scroll',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Duplicate images for seamless loop */}
            {[...col, ...col].map((src, imgIdx) => (
              <img
                key={imgIdx}
                src={src}
                alt=""
                onClick={() => setSelectedImage(src)}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Lightbox */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.97)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
          }}
        >
          <img
            src={selectedImage}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// MERGED COMPONENTS
// ============================================================

// Brand Design and Illustration (merged)
export function BrandDesignContent(props: ContentProps) {
  const SectionDivider = ({ label }: { label: string }) => (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4, color: 'var(--folder-text, #000000)' }}>{label}</div>
      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.18)', marginBottom: 8, paddingBottom: 0 }}></div>
    </div>
  );
  return (
    <div className="p-6 h-full overflow-y-auto relative" style={{ background: 'var(--folder-bg, #000000)', color: 'var(--folder-text, #000000)' }}>
      <SectionDivider label="Brand" />
      <BrandContent {...props} embedded={true} />
      <SectionDivider label="Design and Illustration" />
      <DesignContent {...props} embedded={true} />
    </div>
  );
}

// Campaigns and Events (merged)
export function CampaignEventContent(props: ContentProps) {
  const SectionDivider = ({ label }: { label: string }) => (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4, color: 'var(--folder-text, #000000)' }}>{label}</div>
      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.18)', marginBottom: 8, paddingBottom: 0 }}></div>
    </div>
  );
  return (
    <div className="p-6 h-full overflow-y-auto relative" style={{ background: 'var(--folder-bg, #000000)', color: 'var(--folder-text, #000000)' }}>
      <SectionDivider label="Campaign" />
      <CampaignContent {...props} embedded={true} />
      <SectionDivider label="Events and Activations" />
      <EventsContent {...props} embedded={true} />
    </div>
  );
}

// ============================================================
// INDEX CONTENT - Shows all projects grouped by category
// ============================================================
// Map each project ID to its parent section folder ID
const PROJECT_TO_SECTION: Record<string, string> = {
  // Social + Interactive (merged)
  'samsung-diplo': 'social',
  'mcdonalds-emlings': 'social',
  'samsung-s-drive': 'social',
  'mood-calendar': 'social',
  'love-meter': 'social',
  'poster-3d': 'social',
  'whoopee-cushion': 'social',
  'social-01': 'social',
  'social-02': 'social',
  'social-03': 'social',
  'facebook-mindfull': 'social',
  // Campaign
  'facebook-eoy': 'campaign',
  'libero-football': 'campaign',
  'levis-vote': 'campaign',
  'samsung-unbox': 'campaign',
  'wwf-just': 'campaign',
  'facebook-real-story': 'campaign',
  // Brand & Identity
  'wwf-just-brand': 'brand',
  'studio-mano': 'brand',
  'facebook-rebrand': 'brand',
  'bundaberg-rum': 'brand',
  // Events
  'mr-lee': 'events',
  'meta-connect-2024': 'events',
  'meta-connect-2025': 'events',
};


export function IndexContent({ onProjectClick }: { onProjectClick?: (sectionId: string, projectId?: string) => void }) {
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const mediaStripRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [activeMediaStrip, setActiveMediaStrip] = useState<string | null>(null);

  const handleMainContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainContainerRef.current) return;
    const rect = mainContainerRef.current.getBoundingClientRect();
    const rightEdgeThreshold = 80;
    const distFromRight = rect.right - e.clientX;
    
    if (distFromRight < rightEdgeThreshold && distFromRight > 0) {
      if (!scrollIntervalRef.current) {
        scrollIntervalRef.current = setInterval(() => {
          if (mainContainerRef.current) {
            mainContainerRef.current.scrollTop += 3;
          }
        }, 16);
      }
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }
  };

  const handleMainContainerMouseLeave = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleMediaStripMouseMove = (projectId: string, e: React.MouseEvent<HTMLDivElement>) => {
    const container = mediaStripRefs.current[projectId];
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const rightEdgeThreshold = 60;
    const distFromRight = rect.right - e.clientX;
    
    if (distFromRight < rightEdgeThreshold && distFromRight > 0) {
      setActiveMediaStrip(projectId);
    } else if (distFromRight > 100) {
      setActiveMediaStrip(null);
    }
  };

  const handleMediaStripMouseLeave = () => {
    setActiveMediaStrip(null);
  };

  useEffect(() => {
    if (!activeMediaStrip) return;
    
    const container = mediaStripRefs.current[activeMediaStrip];
    if (!container) return;
    
    const interval = setInterval(() => {
      container.scrollLeft += 4;
    }, 16);
    
    return () => clearInterval(interval);
  }, [activeMediaStrip]);

  // Helper: extract a displayable thumbnail URL from a media item
  function getMediaThumb(item: { type: string; url: string; [key: string]: any }): { src: string; isVideo: boolean; aspectRatio?: string } {
    if (item.type === 'pair') return { src: item.url, isVideo: false };
    if (item.type === 'image') return { src: item.url, isVideo: false };
    if (item.type === 'mp4' || item.type === 'video') {
      const m = item.url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/);
      if (m && VIMEO_THUMBS[m[1]]) return { src: VIMEO_THUMBS[m[1]], isVideo: true, aspectRatio: item.aspectRatio };
      return { src: '', isVideo: true };
    }
    if (item.type === 'vimeo') {
      const m = item.url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/);
      if (m && VIMEO_THUMBS[m[1]]) return { src: VIMEO_THUMBS[m[1]], isVideo: true, aspectRatio: item.aspectRatio };
      return { src: '', isVideo: true };
    }
    if (item.type === 'youtube') {
      const m = item.url.match(/embed\/([^?]+)/);
      if (m) return { src: `/assets/hqdefault_4931ec.jpg`, isVideo: true, aspectRatio: item.aspectRatio };
      return { src: 'youtube-placeholder', isVideo: true, aspectRatio: item.aspectRatio };
    }
    return { src: item.url, isVideo: false };
  }

  // Inline lightbox state
  const [lightbox, setLightbox] = useState<{ item: any } | null>(null);
  // Expanded info panels per project
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Hovered project title row
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // All project data inline (mirrors the data in each content component)
  // DESIGN AND ILLUSTRATION and CERAMICS AND FURNITURE moved to bottom
  const allSections: Array<{
    label: string;
    sectionId: string;
    projects: Array<{
      id: string;
      title: string;
      tagline?: string;
      description?: string;
      agency?: string;
      production?: string;
      linkHref?: string;
      hoverImg?: string;
      media: Array<{ type: string; url: string; [key: string]: any }>;
    }>;
  }> = [
    {
      label: 'SOCIAL AND PR',
      sectionId: 'social',
      projects: [
        {
          id: 'social-01',
          title: '@ZUCK | CEO COMMUNICATIONS',
          tagline: "Reimagining Mark's social presence",
          description: 'In 2023, Mark Zuckerberg set out to move away from an overly corporate social presence and show up in a more human, culturally relevant way. I was part of the small team brought in to help shape that shift.\n\nOur approach is to turn product launches, company updates, and complex technology into stories that people genuinely want to watch, share, and talk about. Rather than relying on traditional marketing, we make Mark feel more like a creator and the products feel useful, relatable, and part of everyday life through social content, live events, and creator collaborations.',
          agency: '',
          hoverImg: '/assets/download(8)_c34ba657_c19a7e.jpeg',
          media: [
            { type: 'mp4', url: '/assets/DLuvQ5UR0n5_1bf3f280_9ff7f4.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
            { type: 'mp4', url: '/assets/DLsv5Toh44g_377535e8_499053.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
            { type: 'mp4', url: '/assets/C27qtysxAdE_9c4f91eb_193087.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
            { type: 'mp4', url: '/assets/DaAu0cVxhzM_14f9306f_1e916c.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
            { type: 'mp4', url: '/assets/DGoDxw5PvlH_6b418404_04bfc8.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
            { type: 'mp4', url: '/assets/DCRySOxvdz6_2095ee2a_2b3d23.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
            { type: 'mp4', url: '/assets/C9xxBFYyF2X_5280b584_bd90b9.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
            { type: 'mp4', url: '/assets/C9AbmIYp3Js_6d8470ae_7867c0.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
            { type: 'mp4', url: '/assets/DDpSa0DPvrW_341fa4ff_fe8573.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
          ]
        },
        {
          id: 'social-02',
          title: 'FACEBOOK (I WANNA ROCK)',
          tagline: "WHATEVER YOU ROCK, THERE'S A FACEBOOK GROUP FOR YOU",
          description: "This campaign seeks to show the diversity of Facebook Groups through the lens of Rock. Whether you like to paint on rocks, collect rock crystals or rock out with 80's rock stars — there's a Facebook group for you.",
          agency: 'Agency: Meta Creative X',
          hoverImg: '/assets/ezgif-6-525ea5da065d(1)_4b841a17_9727e5.gif',
          media: [
            { type: 'vimeo', url: 'https://player.vimeo.com/video/435655934', aspectRatio: '4/5' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/435655396', aspectRatio: '4/5' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/435655053', aspectRatio: '4/5' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/435654761', aspectRatio: '4/5' },
            { type: 'image', url: '/assets/mood-2000x1251_5c73fc1f_486eb6.jpg' },
          ]
        },
        {
          id: 'social-03',
          title: 'FACEBOOK (HOUSE OF HORRORS)',
          tagline: 'HALLOWEEN TIPS FROM HALLOWEEN EXPERTS',
          description: 'With Halloween being one of the biggest and busiest moments on the platform, the community is always eager for tips and tricks. So we thought who better to give Halloween advice and inspiration, than Facebook "Halloween" Groups?\n\nWe brought together Halloween themed Groups, and under one roof, to share their tips, tricks and insights from the Wonderful House of Horrors.',
          agency: 'Agency: Meta Creative X',
          hoverImg: '/assets/ezgif-80d9ca958b65d964_9784c73e_637a99.gif',
          media: [
            { type: 'vimeo', url: 'https://player.vimeo.com/video/371704647', aspectRatio: '4/5' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/371704689', aspectRatio: '4/5' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/371744962', aspectRatio: '4/5' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/371704672', aspectRatio: '4/5' },
            { type: 'image', url: '/assets/jjh-copy-1-2000x2501_2b1bad90_ca8dd1.jpg' },
            { type: 'image', url: '/assets/fb_halloween_hauntedhouse_interior_v1_001-1535x1920(1)_d20c9b0a_4ec222.jpg' },
            { type: 'image', url: '/assets/jjh-2000x2501(1)_c3875392_c3150d.jpg' },
            { type: 'image', url: '/assets/int_dining_food-1920x1500_e9071cea_a2b4df.jpg' },
            { type: 'image', url: '/assets/int_dining_table_set-1920x1500_5bea1b1c_daa705.jpg' },
            { type: 'image', url: '/assets/int_lab_vials-1920x1500_a7cd8d42_4652bf.jpg' },
            { type: 'image', url: '/assets/int_lab_tank_cabinet-1920x1500_1919cd0c_9cee13.jpg' },
            { type: 'image', url: '/assets/int_attic_stairs_detail-1920x1500_cca3aae6_322351.jpg' },
            { type: 'image', url: '/assets/int_attic_lights-1920x1500_c7724193_12fea1.jpg' },
          ]
        },
        {
          id: 'facebook-mindfull',
          title: 'FACEBOOK (MINDFULL)',
          tagline: 'FIND YOUR CALM AND FOCUS',
          description: 'The arrival of COVID19 has created a heightened amount of fear, stress and anxiety for everyone. Increasingly, people are looking to their community for help and support as we continue to weather this storm together. In response, we felt it was important to create a content series about well-being and mental health to help our community get through the pressures of being inside and at home.',
          agency: 'Agency: Meta Creative X',
          hoverImg: '/assets/ezgif-6-9da134f664ea(1)_bb4e7901_2abe3f.gif',
          media: [
            { type: 'vimeo', url: 'https://player.vimeo.com/video/429384060', aspectRatio: '4/5' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/432946376', aspectRatio: '4/5' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/429384778', aspectRatio: '4/5' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/432946669', aspectRatio: '4/5' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/432945889', aspectRatio: '4/5' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/429385150', aspectRatio: '4/5' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/432948234', aspectRatio: '4/5' },
            { type: 'image', url: '/assets/everything-2000x1235_b21af245_3cb61b.png' },
          ]
        },
      ]
    },
    {
      label: 'CAMPAIGN',
      sectionId: 'campaign',
      projects: [
        {
          id: 'libero-football',
          title: 'LIBERO MAGAZINE [FOOTBALL ANALOGIES]',
          tagline: 'A CAMPAIGN WHERE WOMEN EXPLAIN TO MEN EVERY DAY SITUATIONS THROUGH FOOTBALL ANALOGIES',
          description: '"If they explain it to you with football, you get it" is the concept created by the agency to put across the message that Líbero is not just a football magazine, but also one that uses the world\'s most popular sport to talk about other topics such as culture, art and style, among others.',
          agency: 'Agency: Lola Madrid',
          hoverImg: '/assets/football-analogies-libero-magazine-1_0f1359f7_e476e8.gif',
          media: [
            { type: 'vimeo', url: 'https://player.vimeo.com/video/1170568733' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/1170568802' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/1170568786' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/1170568766' },
            { type: 'image', url: '/assets/screen-shot-2018-05-17-at-10.46.07-pm-copy-2000x1707_d3076bcf_e7d971.jpg' },
          ]
        },
        {
          id: 'levis-vote',
          title: "LEVI'S [USE YOUR VOTE]",
          tagline: 'VOTING LOOKS GOOD ON EVERYONE',
          description: "We mashed up what feels like a National Geographic documentary with a music video to remind Americans that voting isn't just a chore, but a powerful form of self-expression.\n\nBut we didn't just make a film. We also turned stores into registration centers, made custom clothes, got employers to give employees time off to vote, and a whole bunch more—all to actually make a difference and get people to express themselves on election day.",
          agency: 'Agency: FCB West',
          hoverImg: '/assets/iNGsyYpiapxyHSKi_7dcdf9.webp',
          media: [
            { type: 'vimeo', url: 'https://player.vimeo.com/video/1170893097' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/306292196' },
            { type: 'image', url: '/assets/tweet_snoop_vote_7ca632a8_58a301.jpg' },
            { type: 'image', url: '/assets/p01-1158x1637_cb835cf8_c3097e.jpg' },
            { type: 'image', url: '/assets/p02-1158x1637_dfe756f3_a40248.jpg' },
            { type: 'image', url: '/assets/p05-1158x1637_faed9496_6ed0af.jpg' },
            { type: 'image', url: '/assets/p07-1158x1637_2f0314d4_c98e9e.jpg' },
            { type: 'image', url: '/assets/mooood_dbed463e_ce40f7.jpg' },
          ]
        },
        {
          id: 'samsung-unbox',
          title: 'SAMSUNG [UNBOX YOUR PHONE]',
          tagline: 'S8 LAUNCH CAMPAIGN',
          description: "The new Galaxy S8 has the world's first Infinity Screen – an expansive display that stretches all the way to the edges of the device and makes everything feel more immersive.\n\nTo capture this feeling, the launch campaign features a series of tranquil nature scenes that begin within the confines of a traditional phone screen, but then break free from these barriers.",
          agency: 'Agency: R/GA NY',
          production: 'Production Company: Radical Media',
          hoverImg: '/assets/ezgif-6-93a9b73094d5(1)_cb611700_3daf54.gif',
          media: [
            { type: 'vimeo', url: 'https://player.vimeo.com/video/217187282' },
            { type: 'image', url: '/assets/aaaa-2000x1380_8746a43f_923f01bb_31270b.jpg' },
            { type: 'image', url: '/assets/KV-MOTORCYCLE-0328_a4c47c47_6271ef96_05ffe1.jpg' },
            { type: 'image', url: '/assets/image-asset-3_9dc34a40_e0aa9950_d21ae2.jpeg' },
            { type: 'image', url: '/assets/image-asset_8ae1229d_6e73e1c2_b39b59.png' },
            { type: 'image', url: '/assets/image-asset-2_250d46ed_7d35df2e_7a37b7.jpeg' },
          ]
        },
        {
          id: 'wwf-just',
          title: 'WWF [JUST*]',
          tagline: 'WHAT YOU NEED, NATURALLY',
          description: 'just* is a WWF initiative created to show that there are often simple and natural alternatives to many of the products we use every day - products that require packaging that uses up resources and often end up as landfill.\n\nA few simple steps are all it takes to make small changes that, when done by many, can help create a cleaner and more sustainable future.',
          agency: 'Agency: Leo Burnett Sydney',
          hoverImg: '/assets/Screenshot2026-03-14at7.25.46PM_d7268fba_fcbf94.webp',
          media: [
            { type: 'vimeo', url: 'https://player.vimeo.com/video/286728221' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/286728178' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/286728142' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/286728073' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/286727955' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/286727917' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/286727866' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/286727786' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/286727709' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/286727673' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/286727603' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/286727384' },
            { type: 'image', url: '/assets/ezgif-6-adf1265cdcd1_838c0a00_71af2a.gif' },
            { type: 'image', url: '/assets/oLbmjUPUMWJrGWMO_ea0fb0.jpg' },
            { type: 'image', url: '/assets/CFPgqAIsIykasLty_95c969.jpg' },
            { type: 'image', url: '/assets/YvnarBzOvYueLGuU_f6a1bb.gif' },
            { type: 'image', url: '/assets/QKNljSyKJUUDdcNW_73c0b4.gif' },
            { type: 'image', url: '/assets/yQgxQEFMfbaJXknc_07226c.jpg' },
            { type: 'image', url: '/assets/ucPOkqJsCaxnZUMU_ab1619.jpg' },
            { type: 'image', url: '/assets/rmaoShGYBzogksqG_b451fc.jpg' },
            { type: 'image', url: '/assets/ogNzsSdcHxamGKja_ff51fb.jpg' },
            { type: 'image', url: '/assets/mMsoyexyObTDkdTl_03d63c.jpg' },
            { type: 'image', url: '/assets/tAvomcXyyvCSjbYG_8b8e94.gif' },
          ]
        },
        {
          id: 'facebook-real-story',
          title: 'FACEBOOK (A REAL FACEBOOK STORY)',
          tagline: 'REAL STORIES. TOLD AUTHENTICALLY',
          description: 'From the seemingly small, to the powerfully poignant, everyone has a Facebook Story. As we uncovered them, we found stories of life, stories of healing, stories of love, and stories of progress. But always stories centered around community and how others help you go further.',
          agency: 'Agency: Meta Creative X',
          hoverImg: '/assets/akosua_b00f2ded_f665c6.gif',
          media: [
            { type: 'vimeo', url: 'https://player.vimeo.com/video/1170574311' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/1170574267' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/1170574333' },
          ]
        },
        {
          id: 'facebook-eoy',
          title: 'FACEBOOK [END OF THE YEAR]',
          tagline: 'A YEAR TO REMEMBER, AND A YEAR TO FORGET',
          description: 'At the end of 2020, we created a film that showed how we will never forget the ways people showed up for each other and their communities throughout the year, helping us find comfort in discomfort and strength in one another.',
          agency: 'In-House Agency: Meta Creative X',
          hoverImg: '/assets/11111_ac2b5ad0_142d6a.jpg',
          media: [
            { type: 'vimeo', url: 'https://player.vimeo.com/video/508194471' },
            { type: 'image', url: '/assets/Adweek-01_1340_c_b06a9bd0_789be3.jpg' },
            { type: 'image', url: '/assets/Adweek-02_1340_c_d5b3494c_0210f6.jpg' },
            { type: 'image', url: '/assets/Adweek-03_1340_c_d840ea73_43f851.jpg' },
            { type: 'image', url: '/assets/Adweek-04_1340_c_cf29b955_bf4685.jpg' },
            { type: 'image', url: '/assets/Adweek-05_1340_c_d6f710bc_2b67af.jpg' },
            { type: 'image', url: '/assets/Hivemind_new_1000_9ec57d71_285a24.jpg' },
          ]
        },
      ]
    },
    {
      label: 'BRAND AND IDENTITY',
      sectionId: 'brand',
      projects: [
        {
          id: 'wwf-just-brand',
          title: 'WWF [JUST*]',
          tagline: 'PACKAGING DESIGNED TO ELIMINATE PACKAGING',
          description: "Everyday we buy millions of household products that are essentially chemicals in plastic bottles. And every one of them puts more pressure on our already fragile environment.\n\nSo we got rid of the plastic and the chemicals by creating a range of natural, alternative products for WWF called just*. Each was 100% natural and packaged using recyclable and biodegradable materials.",
          agency: 'Agency: Leo Burnett Sydney',
          hoverImg: '/assets/CFPgqAIsIykasLty_95c969.jpg',
          media: [
            { type: 'image', url: '/assets/oLbmjUPUMWJrGWMO_ea0fb0.jpg' },
            { type: 'image', url: '/assets/ucPOkqJsCaxnZUMU_ab1619.jpg' },
            { type: 'image', url: '/assets/rmaoShGYBzogksqG_b451fc.jpg' },
            { type: 'image', url: '/assets/ogNzsSdcHxamGKja_ff51fb.jpg' },
            { type: 'image', url: '/assets/mMsoyexyObTDkdTl_03d63c.jpg' },
            { type: 'image', url: '/assets/YvnarBzOvYueLGuU_f6a1bb.gif' },
            { type: 'image', url: '/assets/QKNljSyKJUUDdcNW_73c0b4.gif' },
            { type: 'image', url: '/assets/tAvomcXyyvCSjbYG_8b8e94.gif' },
            { type: 'image', url: '/assets/just01-1-2000x786_8c2c3a6f_7b9ae8.jpg' },
            { type: 'image', url: '/assets/just02-2-2000x1380-1_2c0c7c8b_c39159.jpg' },
            { type: 'image', url: '/assets/Ajust04_1f5e9e4b_a2787e.jpg' },
            { type: 'image', url: '/assets/Ajust05_e9e3c9d5_3736a1.jpg' },
            { type: 'image', url: '/assets/Ajust06_f9d5c3b2_8d489e.jpg' },
            { type: 'image', url: '/assets/Ajust07_a1b2c3d4_7e5ac0.jpg' },
            { type: 'image', url: '/assets/Ajust08_b2c3d4e5_6bb60f.jpg' },
          ]
        },
        {
          id: 'studio-mano',
          title: 'STUDIO MANO',
          tagline: 'STUDIO MANO DESIGN IDENTITY',
          description: 'The Studio Mano identity follows the same philosophy as the work itself. If every ceramic piece is made by hand, the brand should be too. The identity is built from handmade elements and the ceramics themselves, using illustrations, stamps, organic forms, and details taken directly from the pieces. The goal was to create a visual identity that feels like another handmade object: tactile, imperfect, and human, carrying the same sense of craft as the ceramics.',
          agency: '',
          hoverImg: '/assets/sm-mezcal-1_13a71f69_1856aa.jpg',
          media: [
            { type: 'image', url: '/assets/sm_hero_259b04ff_e7fea7.webp' },
            { type: 'image', url: '/assets/sm_logo_textured_7e57ffe3_c3349b.jpg' },
            { type: 'image', url: '/assets/studio-mano-boyle-heights_85b52403_2f169e.png' },
            { type: 'image', url: '/assets/sm_aditions_poster_9cdaa088_5ba410.jpg' },
            { type: 'image', url: '/assets/sm_aditions_invite_142f4822_dee3bb.jpg' },
            { type: 'image', url: '/assets/sm_aditions_event_4a0bbb36_f7ece1.jpg' },
            { type: 'image', url: '/assets/sm_brand1_178fafd8_bcc46f.jpg' },
            { type: 'image', url: '/assets/sm_sketch1_1bc3a315_ef17ab.jpg' },
            { type: 'image', url: '/assets/sm_ceramics_vid_5353fdc9_47cc5b.gif' },
            { type: 'image', url: '/assets/tile03low_182e1d0a_ac7aa8.jpg' },
            { type: 'image', url: '/assets/sm_tile_board_cdf07676_a5a676.jpg' },
            { type: 'image', url: '/assets/sm_tiles_colorful_063d8cf7_472bc9.webp' },
            { type: 'image', url: '/assets/1PROFESORMEZCAL_a37de453_a67d69.jpg' },
            { type: 'image', url: '/assets/promezcal_0000_Layer-4_9205ebdc_b82554.jpg' },
            { type: 'image', url: '/assets/22PROFESORMEZCAL_a72be719_018add.jpg' },
            { type: 'image', url: '/assets/PROMEZ_0007_Layer-14_39c6fbf6_29092b.jpg' },
            { type: 'image', url: '/assets/sm_brand2_b4f09427_fbf1a9.jpg' },
            { type: 'image', url: '/assets/sm_ladesignweek_aab544cb_0827dc.gif' },
            { type: 'image', url: '/assets/sm_milan_6aac2bc2_16b75a.jpg' },
            { type: 'mp4', url: '/assets/05310CA5_cropped_4x5_d307a1db_ab1f87.mp4', aspectRatio: '4/5', videoWidth: '224px', poster: '/assets/05310CA5_poster_b4c03dfa_80db83.jpg' },
            { type: 'image', url: '/assets/sm_riso_print_8232f2c8_8a6aab.jpg' },
            { type: 'image', url: '/assets/sm_drop3_1a517719_4f2b59.gif' },
            { type: 'image', url: '/assets/sm_riso1_6711957d_cac1f2.jpg' },
            { type: 'image', url: '/assets/sm_riso2_9538d84e_311f56.jpg' },
            { type: 'image', url: '/assets/sm_ceramics1_d62a8037_276788.jpg' },
            { type: 'image', url: '/assets/sm_ceramics2_743df90d_6e78eb.jpg' },
            { type: 'image', url: '/assets/sm_flask_f9985e42_12c54a.jpg' },
            { type: 'image', url: '/assets/sm_drop2_6ab62b2d_bd7cfe.gif' },
            { type: 'image', url: '/assets/sm_ulamp_584ddde2_9f315d.jpg' },
            { type: 'image', url: '/assets/sm_packaging_af859035_9375d8.jpg' },
            { type: 'image', url: '/assets/sm_sketch2_e3d27585_a67015.jpg' },
          ]
        },
        {
          id: 'facebook-rebrand',
          title: 'FACEBOOK [RE-BRANDING]',
          tagline: 'TONE OF VOICE AND ILLUSTRATION DIRECTION',
          agency: 'Agency: Meta Creative X',
          description: "Led by Meta's in-house design team, the refreshed identity seeks to elevate the most distinctive elements of the existing Facebook brand, unify how its identity comes to life across both product and marketing, and place greater emphasis on accessibility. Using custom typeface Facebook Sans, the design team redrew Facebook's existing wordmark and logo to create a consistent treatment and improve overall legibility. The brand's longstanding core blue was retained but reimagined to be more visually accessible, while the entire iconography and reactions system was rebuilt to meet accessibility guidance and remain legible at any size.\n\nAs a marketing consultant on the project, I co-led the illustration direction and tone of voice, ensuring a consistent look, feel, and voice across product, brand, and marketing — from in-app surfaces to global campaigns.",
          hoverImg: '/assets/fb-rebrand-thumb_d2c892e3_2b2963.avif',
          media: [
            { type: 'mp4', url: '/assets/fb-rebrand-vimeo_40931d76_29b87b.mp4', aspectRatio: '16/9', poster: '/assets/fb-rebrand-poster-s27_2946b11e_3cd2c3.jpg' },
            { type: 'image', url: '/assets/fb-rebrand-system_b5d9f99b_47867f.png' },
            { type: 'image', url: '/assets/cr-fb-866856539_fa4eb2fc_ba3807.gif' },
            { type: 'image', url: '/assets/cr-fb-866856562_e06048cf_39aaf7.gif' },
            { type: 'image', url: '/assets/cr-fb-866856467_e6c730c6_67e857.gif' },
          ]
        },
        {
          id: 'bundaberg-rum',
          title: 'BUNDABERG RUM [BLENDING KIT]',
          tagline: 'PACKAGING AS THE EXPERIENCE',
          description: 'Designed for Bundaberg Rum connoisseurs, this limited-edition blending kit elevates the product through packaging that reflects the making of the rum itself. Industrial details, technical typography, and tactile finishes create an authentic, premium experience from the moment it\'s opened.',
          agency: 'Agency: Leo Burnett Sydney',
          hoverImg: '/assets/bundaberg-label_37e928ed_1cad26.jpg',
          media: [
            { type: 'image', url: '/assets/bundaberg-kit_14f77af0_636d17.jpg' },
            { type: 'image', url: '/assets/bundaberg-bottles_c2e818a2_800434.jpg' },
            { type: 'image', url: '/assets/bundaberg-spread_dcd6c551_5fdd70.jpg' },
            { type: 'image', url: '/assets/bundaberg-label_37e928ed_1cad26.jpg' },
            { type: 'image', url: '/assets/bundaberg-notebook_7b1fb135_ca8b14.jpg' },
            { type: 'image', url: '/assets/bundaberg-top_d07bbd9a_ed76fe.jpg' },
          ]
        },
      ]
    },
    {
      label: 'EVENTS AND ACTIVATIONS',
      sectionId: 'events',
      projects: [
        {
          id: 'meta-connect-2025',
          title: 'META [CONNECT 2025]',
          tagline: "DRIVING END-TO-END CREATIVE FOR META'S FLAGSHIP EVENT",
          description: "Meta Connect is the company's flagship moment to unveil our vision and latest innovations. I led a team of 30+ creatives and production partners, driving the end-to-end creative for keynote and social.\n\nIn 2025, we created a film that brought Mark's wearable AI vision to life, broke a Guinness World Record with Oakley and Red Bull, and launched the new Meta x Oakley glasses by inviting Diplo and his run club for a live activation. We also partnered with Johnny Cirillo (@watchingnewyork), one of New York's leading street style photographers.\n\nIt became the most successful Meta Connect to date.",
          agency: '',
          hoverImg: '/assets/mc2025-stage_4e7dd518_66427d.webp',
          media: [
            { type: 'youtube', url: 'https://www.youtube.com/embed/Q9eLemEd9FY', poster: '/assets/mc2025_thumb_350_45c642e7_39307f.jpg' },
            { type: 'mp4', url: '/assets/zuck-reel-DOu6KyaDpst_11c4ed70_a5a6fd.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/1173692006' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/1173696951' },
            { type: 'mp4', url: '/assets/mc2025-v4_2e18c0b2_3c1d50.mp4', aspectRatio: '4/5' },
            { type: 'mp4', url: '/assets/mc2025-v7_2effee1d_593110.mp4', aspectRatio: '4/5' },
          ]
        },
        {
          id: 'meta-connect-2024',
          title: 'META [CONNECT 2024]',
          tagline: "META'S BIGGEST ANNUAL MIXED REALITY & AI EVENT",
          description: "Meta Connect is Meta's biggest annual event where the company shares the latest developments in mixed reality, AI and wearables.",
          agency: '',
          hoverImg: '/assets/meta-connect-zuck-orion_a980dc7c_e39844.jpg',
          media: [
            { type: 'youtube', url: 'https://www.youtube.com/embed/I7JyydkqDeI?start=2454', videoWidth: 'min(640px, 70vw)', aspectRatio: '16/9' },
            { type: 'mp4', url: '/assets/meta-connect-2024-video_fdc53507_f3c3c3.mp4', videoWidth: 'min(340px, 38vw)', aspectRatio: '9/16' },
            { type: 'youtube', url: 'https://www.youtube.com/embed/iDtETDI7NDY', videoWidth: 'min(640px, 70vw)', aspectRatio: '16/9' },
            { type: 'image', url: '/assets/meta-connect-zuck-orion_a980dc7c_e39844.jpg' },
            { type: 'image', url: '/assets/meta-connect-glasses-stage_692dfd46_50c29b.jpg' },
          ]
        },
        {
          id: 'mr-lee',
          title: 'PLAYSTATION [MR. LEE TAILOR SHOP]',
          tagline: 'TAILOR SHOP TO SUPERHEROES AND VILLAINS',
          description: "In the new Playstation game, DC Universe Online, you can create your own superhero or villain by choosing powers, abilities and your custom suit.\n\nMr. Lee's Tailor Shop specializes in handcrafting custom suits for heroes and villains. So you can make your suit a reality and can live the same experience as the game in the offline world.\n\nThe live experience began deciding whether to be a hero or villain, fill out a questionnaire, and get measurements taken. The custom suit was first created within the game and then an illustrator drew a sketch and gave it to the client together with an estimate.",
          agency: 'Agency: Leo Burnett Iberia',
          hoverImg: '/assets/playstation-mr-lee-tailor-shop(1)_d915f8ea_b2e386.gif',
          media: [
            { type: 'vimeo', url: 'https://player.vimeo.com/video/435860958?badge=0&autopause=0&player_id=0&app_id=58479', aspectRatio: '4/3', blackBg: true },
            { type: 'image', url: '/assets/01-2000x1254(1)_3dec4caa_cb54da.jpg' },
            { type: 'image', url: '/assets/mktdirecto02-2000x1012_7d9d238c_9b68b2.jpg' },
            { type: 'image', url: '/assets/02-2000x1333(1)_b8281d10_4d5fa1.jpg' },
            { type: 'image', url: '/assets/03-2000x1333(2)_941e377b_cf8cab.jpg' },
            { type: 'image', url: '/assets/04-2000x1400_7e12b80f_4e051e.jpg' },
            { type: 'image', url: '/assets/05-2000x1400_a9e6a18c_44cb08.jpg' },
            { type: 'image', url: '/assets/06-2000x1333(1)_0bf74c2a_fdb3c3.jpg' },
            { type: 'image', url: '/assets/07-2000x1333_050f519e_b571df.jpg' },
            { type: 'image', url: '/assets/close04-2000x1333(1)_9f897b34_b1783a.jpg' },
            { type: 'image', url: '/assets/close05-2000x1333(1)_58624dfb_3d274a.jpg' },
            { type: 'image', url: '/assets/close06-2000x1333_868f1e4d_382f71.jpg' },
            { type: 'image', url: '/assets/close07-2000x1333_3ed755cf_e5aaee.jpg' },
            { type: 'image', url: '/assets/img_2556-2000x1333_a3fdc0c9_72111c.jpg' },
            { type: 'image', url: '/assets/batman-2000x2796(1)_18724cf4_5d4f5f.jpg' },
            { type: 'image', url: '/assets/greenlantern-2000x2796_05e4d8a1_4a1f99.jpg' },
            { type: 'image', url: '/assets/flash-2000x2796_8462f3f3_0a5b45.jpg' },
            { type: 'image', url: '/assets/superman-2000x2796(1)_78368180_5fbfc5.jpg' },
            { type: 'image', url: '/assets/hawke-2000x2796_60f16f5b_487518.jpg' },
            { type: 'image', url: '/assets/sandman-2000x2796_457180a4_9e84a8.jpg' },
            { type: 'image', url: '/assets/poster01-2000x3143(1)_03b9c54a_08af9e.jpg' },
            { type: 'image', url: '/assets/poster02-2000x3143_f670d0fc_21b7e9.jpg' },
          ]
        },
      ]
    },
    {
      label: 'SOCIAL + INTERACTIVE',
      sectionId: 'social',
      projects: [
        {
          id: 'samsung-diplo',
          title: "SAMSUNG X DIPLO [CAN'T STOP]",
          tagline: "THE MIX THAT ONLY PLAYS WHEN YOU MOVE",
          description: "Introducing \"Can't Stop\" by Grammy-winning DJ/Producer Diplo, an exclusive 30-minute mix with a catch: you have to move to play it. Your phone's GPS and accelerometer detect movement to play the mix, which is composed of new, unreleased content. Run, jump, dance, pogo - the app doesn't discriminate. Just don't stop.",
          agency: 'Agency: R/GA NY',
          production: 'Production: R/GA Studios NY-BA',
          hoverImg: '/assets/xXvnNMChIHQzGOdH_b8368a.gif',
          media: [
            { type: 'video', url: 'https://vimeo.com/217188315' },
            { type: 'image', url: '/assets/uGdlSKPSGtBQrFuE_9c7bd2.jpg' },
            { type: 'image', url: '/assets/FaGpapXCNhQUaRcm_a30a5c.jpg' },
            { type: 'image', url: '/assets/xXvnNMChIHQzGOdH_b8368a.gif' },
            { type: 'image', url: '/assets/CPXWQSYjyWAXGKdw_7c6969.gif' },
            { type: 'image', url: '/assets/diploFC_1340_c_5652601b_ab8f41.png' },
          ]
        },
        {
          id: 'mcdonalds-emlings',
          title: "McDONALD'S [EMLINGS]",
          tagline: "HELPING McDONALD'S FIND ITS MISSING MAGIC",
          description: "Emlings is a digital toy that brings the Happy Meal to life, reinvigorating the brand for a new generation.",
          agency: '',
          hoverImg: '/assets/BmylwDPzFqnMlzuH_ff8dc8.gif',
          media: [
            { type: 'vimeo', url: 'https://player.vimeo.com/video/334615998?badge=0&autopause=0&player_id=0&app_id=58479' },
            { type: 'image', url: '/assets/SeyKZQNIxVxyJiPq_edd3bb.jpg' },
            { type: 'image', url: '/assets/BmylwDPzFqnMlzuH_ff8dc8.gif' },
            { type: 'image', url: '/assets/iHHNQmahOnbwGonZ_3dcc45.gif' },
            { type: 'image', url: '/assets/eNuJomcvUcIPIuJx_f7a674.gif' },
            { type: 'image', url: '/assets/TNZWkPVBhCIAWaPU_136492.gif' },
            { type: 'image', url: '/assets/QCjxNORjawpCXsbI_f6a4e0.gif' },
          ]
        },
        {
          id: 'samsung-s-drive',
          title: 'SAMSUNG [S-DRIVE]',
          tagline: 'REWARDING SAFE DRIVING',
          description: 'Samsung S-Drive was created to turn one of the biggest distractions on the road into a life saver.',
          agency: 'Agency: Leo Burnett Sydney',
          hoverImg: '/assets/49424455075641.5d4132e539b75_4c6ca02e_e68217.gif',
          media: [
            { type: 'vimeo', url: 'https://player.vimeo.com/video/343710550' },
            { type: 'vimeo', url: 'https://player.vimeo.com/video/219596551' },
            { type: 'pair', url: '/assets/49424455075641.5d4132e539b75_4c6ca02e_e68217.gif', url2: '/assets/36c4d655075641.5d4135ab84f41_5dd89a8f_2be302.jpg' },
            { type: 'image', url: '/assets/2d5f0255075641.5d4132e58d3c0_ae3590eb_92d0b9.jpeg' },
            { type: 'image', url: '/assets/s-02-2000x1519-1(1)_c9c5863c_43cb49.jpg' },
            { type: 'image', url: '/assets/posters_3d5cb432_e5ada1.jpg' },
            { type: 'image', url: '/assets/ezgif-6-b8629a5cef27_02f09d4c_26c0cb.gif' },
            { type: 'image', url: '/assets/S-Drive-Design-Case-Study1(1)_b5a95fcf_87a0ae.gif' },
          ]
        },

      ]
    },
    {
      label: 'DESIGN AND ILLUSTRATION',
      sectionId: 'branddesign',
      projects: [
        {
          id: 'design-illustration-row1',
          title: 'DESIGN AND ILLUSTRATION',
          tagline: 'SELECTED WORKS',
          description: '',
          agency: '',
          hoverImg: '',
          media: [
            // Fiat campaign (grouped)
            { type: 'image', url: '/assets/fiat-chairs_5fb3036e_aea2fa.webp' },
            { type: 'image', url: '/assets/fiat-horses_1a3491f3_1c3b91.webp' },
            { type: 'image', url: '/assets/fiat-heart_d576c1f0_95595d.webp' },
            { type: 'image', url: '/assets/fiat-bed_843649c4_d79070.webp' },
            { type: 'image', url: '/assets/fiat-apple_ce55ab8b_c87f68.webp' },
            // Character / portrait series (same illustrator style)
            { type: 'image', url: '/assets/GKOKBBEWJWOgIKmz_254480.jpg' },
            { type: 'image', url: '/assets/cZcqAGSLyHGmMNHg_39d519.jpg' },
            { type: 'image', url: '/assets/DdGJGfqxUWJTHCvJ_8a7d89.jpg' },
            { type: 'image', url: '/assets/FyqHMqmvjjxhqjPy_6ec719.jpg' },
            { type: 'image', url: '/assets/TfvUmqLWOOlhEAjb_422e6a.jpg' },
            { type: 'image', url: '/assets/nqTQwxGwGYLVJlON_ec5cc6.jpg' },
            { type: 'image', url: '/assets/YHDCxKvJYJPpCLqe_a94287.jpg' },
            { type: 'image', url: '/assets/BbTEqojjjMwOmlrL_be3515.jpg' },
            // Poster / editorial series
            { type: 'image', url: '/assets/iqYBonZqmWxPRXeK_76d823.jpg' },
            { type: 'image', url: '/assets/RoGZHllrZKhhPmSx_cc3898.jpg' },
            { type: 'image', url: '/assets/ikAEFvAhwNtlZcUf_4f6fa8.jpeg' },
            { type: 'image', url: '/assets/HRfADZuRkpVAIRGF_ff6b54.jpg' },
            { type: 'image', url: '/assets/xYjFuxxSfaVexjhu_dd5116.jpg' },
            { type: 'image', url: '/assets/jWVmacDwViOFVnxz_e2408a.jpg' },
            { type: 'image', url: '/assets/qcZpOlDZLQWvFJnn_438e71.jpg' },
            { type: 'image', url: '/assets/ylxlgfUwjglHIWKx_385ef2.jpg' },
            { type: 'image', url: '/assets/mHYCQEIhOwEJJpDX_e5b9d5.jpg' },
            // Print / layout series
            { type: 'image', url: '/assets/pyILPYBNnXORNCvT_5c2661.jpg' },
            { type: 'image', url: '/assets/BaENksRKniPOriHn_6b1482.jpg' },
            { type: 'image', url: '/assets/lYHYUpYCrcJIZtnJ_f62e51.jpg' },
            { type: 'image', url: '/assets/SbhaBiaNdqDpeSkX_ee5d89.jpg' },
            { type: 'image', url: '/assets/DyQZWqbNeMUFxnql_3c000f.jpg' },
            { type: 'image', url: '/assets/EjYehCMBdEQIISbw_e21184.jpg' },
            { type: 'image', url: '/assets/sZieRfucMNfLovHe_47f23f.jpg' },
            { type: 'image', url: '/assets/oYkNTsngBDsfIDxJ_568185.jpg' },
            // Mixed campaign / editorial
            { type: 'image', url: '/assets/vAlWXNZMuZUgZUDK_d90ab9.png' },
            { type: 'image', url: '/assets/raCCxjgejvWNkygi_7a20d2.jpg' },
            { type: 'image', url: '/assets/QwUNGkfWmZnbjzHE_0e1b6b.jpg' },
            { type: 'image', url: '/assets/blGqQqSbJZykJATN_a7a062.jpg' },
            { type: 'image', url: '/assets/dTVTvaBJUkupfEca_560d70.jpg' },
            { type: 'image', url: '/assets/VdrQzKcjgmKUQWrJ_a6d2de.jpg' },
            { type: 'image', url: '/assets/PKpRbGZalSdjpDhV_ec3320.jpg' },
            { type: 'image', url: '/assets/PjXYupTrGcMYIpav_5ecd96.jpg' },
            { type: 'image', url: '/assets/IELgILuOprsxNGEo_4dc23c.jpg' },
            { type: 'image', url: '/assets/JolHiwkJPGeyUKEf_43787b.jpg' },
            { type: 'image', url: '/assets/OVjPGatNixMKTYkH_4d3ac5.jpg' },
            { type: 'image', url: '/assets/dOiFgqyjhmKFNQpt_cb1ed6.png' },
            { type: 'image', url: '/assets/esmAKHGtUYkvULqj_6b4efa.jpg' },
            { type: 'image', url: '/assets/DKGnTbLeIrXkpTuN_ad3e40.jpg' },
            { type: 'image', url: '/assets/KCuqdrPubDFsBPgb_ca4a84.jpg' },
            { type: 'image', url: '/assets/WeIwaIsaFJGhHxcH_522c98.jpg' },
          ]
        },
      ]
    },
    {
      label: 'CERAMICS AND FURNITURE',
      sectionId: 'pottery',
      projects: [
        {
          id: 'ceramics-furniture',
          title: 'CERAMICS AND FURNITURE',
          tagline: 'STUDIO MANO',
          description: 'Studio Mano is my side gig and a creative outlet where I can step away from the computer for a bit and just make things with my hands. Through ceramics, I\'ve also met other makers and occasionally collaborate with them on furniture pieces.',
          agency: '@studiomanoceramics',
          hoverImg: '',
          media: [
            { type: 'image', url: '/assets/KODAK-200-5-of-38_c1176a.jpg' },
            { type: 'image', url: '/assets/03_deb729.JPG' },
            { type: 'image', url: '/assets/Snapinsta.app_367361112_794386825749845_3041882079062117529_n_1080_40323e.jpg' },
            { type: 'image', url: '/assets/DSC08677_b64cc5.jpg' },
            { type: 'image', url: '/assets/Snapinsta.app_367037634_756500866249869_6481214663538332849_n_1080_8800ee.jpg' },
            { type: 'image', url: '/assets/Made-this-wooden-chair-with-Marcio--a-craftsman-based-in-Paraty--Rio-de-Janeiro.-For-generations-3_d7d8cf.jpg' },
            { type: 'image', url: '/assets/mezcal_3d54db.jpg' },
            { type: 'image', url: '/assets/Snapinsta.app_407575311_1093064738276849_3352866088452037380_n_1080_6b3c26.jpg' },
            { type: 'image', url: '/assets/studiomano05-1_c55278.jpg' },
            { type: 'image', url: '/assets/website_0006_Layer-135_512e69.jpg' },
            { type: 'image', url: '/assets/tile02low_0c54a1.jpg' },
            { type: 'image', url: '/assets/website_0005_Layer-133_e7a392.jpg' },
            { type: 'image', url: '/assets/website_0006_Group-1_0aca53.jpg' },
            { type: 'image', url: '/assets/toro01_adf808.jpg' },
            { type: 'image', url: '/assets/Snapinsta.app_397128198_2699441313565605_7136852584015873761_n_1080_a88cd3.jpg' },
            { type: 'image', url: '/assets/4x5_01_9b6bd1.jpg' },
            { type: 'image', url: '/assets/IMG_02332_db9674.jpg' },
            { type: 'image', url: '/assets/tile-copy_483ba6.jpg' },
            { type: 'image', url: '/assets/LADW_0004_Group-3-copy_362c4f.jpg' },
            { type: 'image', url: '/assets/This-is-America_Studio-Mano_The-Climate-Refugees_Credit-Jonathan-Hokklo-copy_0d54a9.jpeg' },
            { type: 'image', url: '/assets/Made-this-wooden-chair-with-Marcio--a-craftsman-based-in-Paraty--Rio-de-Janeiro.-For-generations-2_afe74a.jpg' },
            { type: 'image', url: '/assets/tile03low_8bfd55.jpg' },
            { type: 'image', url: '/assets/Made-this-wooden-chair-with-Marcio--a-craftsman-based-in-Paraty--Rio-de-Janeiro.-For-generations-1_a02ae4.jpg' },
            { type: 'image', url: '/assets/promez_c751f1.jpg' },
            { type: 'image', url: '/assets/oncapintada_298c3b.jpg' },
            { type: 'image', url: '/assets/DSCF0333-copy_163b86.jpg' },
            { type: 'image', url: '/assets/toro03_f98fae.jpg' },
            { type: 'image', url: '/assets/Snapinsta.app_396567091_873442487563577_4738128618748587376_n_1080_693e7a.jpg' },
          ]
        },
      ]
    },
  ];

  const THUMB_MAX_H = 220;

  // Inline lightbox overlay
  const renderLightbox = () => {
    if (!lightbox) return null;
    const { item } = lightbox;
    const isVimeo = item.type === 'vimeo';
    const isYoutube = item.type === 'youtube';
    const isMp4 = item.type === 'mp4' || item.type === 'video';
    const isImage = item.type === 'image';
    const is45 = item.aspectRatio === '4/5';
    return (
      <div
        onClick={() => setLightbox(null)}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.97)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'zoom-out',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'relative', display: 'inline-block' }}
        >
          {isVimeo && (
            <iframe
              src={item.url + (item.url.includes('?') ? '&autoplay=1' : '?autoplay=1')}
              style={{
                width: is45 ? 'min(50vw, 480px)' : '80vw',
                height: is45 ? 'min(62.5vw, 600px)' : '45vw',
                maxHeight: '85vh',
                border: 'none',
                display: 'block',
              }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          )}
          {isYoutube && (
            <iframe
              src={item.url + (item.url.includes('?') ? '&autoplay=1' : '?autoplay=1')}
              style={{ width: '80vw', height: '45vw', maxHeight: '85vh', border: 'none', display: 'block' }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          )}
          {isMp4 && (
            <video
              src={item.url}
              controls
              autoPlay
              style={{ maxWidth: '80vw', maxHeight: '85vh', display: 'block' }}
            />
          )}
          {isImage && (
            <img
              src={item.url}
              alt=""
              style={{ maxWidth: '80vw', maxHeight: '85vh', display: 'block', objectFit: 'contain' }}
            />
          )}
          {/* [CLOSE] button — top-right corner of the media */}
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '10px',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",
              letterSpacing: '0.08em',
              cursor: 'pointer',
              zIndex: 10000,
              padding: '2px 0',
              lineHeight: 1,
            }}
            title="Close"
          >[CLOSE]</button>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={mainContainerRef}
      className="p-6 overflow-y-auto h-full relative"
      style={{ background: 'var(--folder-bg, #000000)', color: 'var(--folder-text, #ffffff)' }}
      onMouseMove={handleMainContainerMouseMove}
      onMouseLeave={handleMainContainerMouseLeave}
    >
      {renderLightbox()}
      {allSections.map((section) => (
        <div key={section.label} className="mb-10">
          {/* Section header */}
          <h2 style={{
            fontSize: '12.5px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            marginBottom: '4px',
            color: 'var(--folder-text, #000000)',
            letterSpacing: '0.08em',
          }}>
            {section.label}
          </h2>
          <div style={{ borderBottom: '1px solid rgba(0,0,0,0.18)', marginBottom: 8, paddingBottom: 0 }}></div>

          {/* Projects */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {section.projects.map((project) => {
              const isExpanded = !!expanded[project.id];
              const hasInfo = !!(project.description || project.tagline || project.agency);
              const hideTitleRow = section.sectionId === 'branddesign' || (section.sectionId === 'pottery' && !hasInfo);
              const hideTitleText = section.sectionId === 'branddesign' || section.sectionId === 'pottery'; // hide repeated label text but keep [EXPAND]
              return (
                <div key={project.id} style={{ marginBottom: '20px' }}>
                  {/* Project title row — hidden for sections whose label already names the project */}
                  <div
                    className="index-title-row"
                    style={{ display: hideTitleRow ? 'none' : 'flex', alignItems: 'baseline', gap: '10px', marginBottom: isExpanded ? '0' : '8px', cursor: 'default', marginTop: section.sectionId === 'pottery' ? '-12px' : '0' }}
                  >
                    {!hideTitleText && (
                    <div
                      className="index-title-text"
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 'normal',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--folder-text, #000000)',
                      }}
                    >
                      {project.title}
                    </div>
                    )}
                    {/* [EXPAND] toggle - positioned to the right of title for pottery section */}
                    {hasInfo && (
                      <button
                        onClick={() => setExpanded(prev => ({ ...prev, [project.id]: !prev[project.id] }))}
                        style={{
                          background: 'none', border: 'none', padding: 0,
                          fontFamily: 'Arial Narrow, Arial, sans-serif',
                          fontSize: '9.5px',
                          color: '#000000',
                          cursor: 'pointer',
                          letterSpacing: '0.05em',
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px',
                          flexShrink: 0,
                          marginLeft: section.sectionId === 'pottery' ? 'auto' : '0',
                        }}
                      >
                        {isExpanded ? '[COLLAPSE]' : '[EXPAND]'}
                      </button>
                    )}
                    {/* External link for vibe-coding projects */}
                    {project.linkHref && (
                      <a
                        href={project.linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: 'Arial Narrow, Arial, sans-serif',
                          fontSize: '9.5px',
                          color: '#000000',
                          letterSpacing: '0.05em',
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px',
                        }}
                      >
                        [OPEN ↗]
                      </a>
                    )}
                  </div>

                  {/* Expanded info panel */}
                  {isExpanded && (
                    <div style={{
                      margin: '10px 0 12px 0',
                      padding: '10px 14px',
                      borderLeft: '1px solid rgba(0,0,0,0.18)',
                      background: 'var(--folder-bg, #ffffff)',
                    }}>
                      {project.tagline && (
                        <div style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: 'var(--folder-text, #000000)',
                          letterSpacing: '0.08em',
                          marginBottom: 10,
                        }}>{project.tagline}</div>
                      )}
                      {project.description && (
                        <div style={{
                          fontSize: 14.5,
                          color: 'var(--folder-text, #000000)',
                          lineHeight: 1.65,
                          whiteSpace: 'pre-line',
                          marginBottom: project.agency ? 12 : 0,
                        }}>{renderDescription(project.description, true)}</div>
                      )}
                      {project.agency && (
                        <div style={{
                          fontSize: 12.5,
                          color: 'var(--folder-text, #000000)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          opacity: 0.7,
                        }}>{project.agency}</div>
                      )}
                    </div>
                  )}

                  {/* Horizontal scrolling media strip */}
                  <div
                    ref={(el) => {
                      if (el) mediaStripRefs.current[project.id] = el;
                    }}
                    onMouseMove={(e) => handleMediaStripMouseMove(project.id, e)}
                    onMouseLeave={handleMediaStripMouseLeave}
                    style={{
                      display: 'flex',
                      gap: '6px',
                      overflowX: 'auto',
                      paddingBottom: '8px',
                      scrollbarWidth: 'thick',
                      scrollbarColor: '#000000 transparent',
                      alignItems: 'center',
                      height: `${THUMB_MAX_H}px`,
                      position: 'relative',
                    }}
                    className="media-scroll-thick"
                  >
                    {activeMediaStrip === project.id && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '60px',
                        background: 'linear-gradient(to left, rgba(255,255,255,0.15), transparent)',
                        pointerEvents: 'none',
                        zIndex: 2,
                      }} />
                    )}
                    {project.media.map((item, idx) => {
                      const { src, isVideo, aspectRatio } = getMediaThumb(item);
                      const isImage = item.type === 'image';
                      const isPair = item.type === 'pair';
                      const is45 = aspectRatio === '4/5' || item.aspectRatio === '4/5';
                      const ar = (item as any).aspectRatio;
                      const is916 = ar === '9/16';
                      const thumbW = is45 ? Math.round(THUMB_MAX_H * 0.8) : is916 ? Math.round(THUMB_MAX_H * 9/16) : undefined;
                      return (
                        <div
                          key={idx}
                          onClick={() => setLightbox({ item })}
                          style={{
                            position: 'relative',
                            flexShrink: 0,
                            background: '#111',
                            overflow: 'hidden',
                            cursor: 'zoom-in',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: `${THUMB_MAX_H}px`,
                            ...(thumbW ? { width: `${thumbW}px` } : {}),
                          }}
                        >
                          {isPair ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                              <img src={item.url} alt="" style={{ maxHeight: `${THUMB_MAX_H}px`, width: 'auto', display: 'block', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
                              <img src={(item as any).url2} alt="" style={{ maxHeight: `${THUMB_MAX_H}px`, width: 'auto', display: 'block', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
                            </div>
                          ) : isImage ? (
                            <img
                              src={item.url}
                              alt=""
                              style={{
                                maxHeight: `${THUMB_MAX_H}px`,
                                width: 'auto',
                                display: 'block',
                                objectFit: 'contain',
                              }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                            />
                          ) : src && src !== 'youtube-placeholder' ? (
                            <>
                              <img
                                src={src}
                                alt=""
                                style={{
                                  maxHeight: `${THUMB_MAX_H}px`,
                                  width: is45 ? '100%' : 'auto',
                                  height: is45 ? '100%' : 'auto',
                                  display: 'block',
                                  objectFit: is45 ? 'cover' : 'contain',
                                }}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                              />
                              {/* Play icon overlay */}
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0,0,0,0.25)',
                              }}>
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  background: 'rgba(255,255,255,0.85)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                                    <path d="M1 1L9 6L1 11V1Z" fill="#000" />
                                  </svg>
                                </div>
                              </div>
                            </>
                          ) : src === 'youtube-placeholder' ? (
                            /* YouTube — show dark placeholder with play icon */
                            <div style={{
                              height: `${THUMB_MAX_H}px`,
                              width: `${Math.round(THUMB_MAX_H * 16/9)}px`,
                              background: '#111',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                            }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.85)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}>
                                <svg width="12" height="14" viewBox="0 0 10 12" fill="none">
                                  <path d="M1 1L9 6L1 11V1Z" fill="#000" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            /* mp4 — show first frame via video element */
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <video
                                src={item.url + '#t=0.5'}
                                preload="metadata"
                                muted
                                playsInline
                                style={{
                                  height: `${THUMB_MAX_H}px`,
                                  width: 'auto',
                                  display: 'block',
                                  objectFit: 'contain',
                                  background: '#111',
                                }}
                              />
                              {/* Play icon overlay */}
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0,0,0,0.25)',
                              }}>
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  background: 'rgba(255,255,255,0.85)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                                    <path d="M1 1L9 6L1 11V1Z" fill="#000" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Horizontal auto-scrolling carousel — no labels, seamless loop
function CarouselRow({ images }: { images: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let pos = 0;
    const speed = 0.5;
    const step = () => {
      pos += speed;
      // Reset when first half scrolled past
      if (track.scrollWidth > 0 && pos >= track.scrollWidth / 2) {
        pos = 0;
      }
      track.style.transform = `translateX(-${pos}px)`;
      rafId = requestAnimationFrame(step);
    };
    let rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Duplicate images for seamless loop
  const doubled = [...images, ...images];

  return (
    <div style={{ overflow: 'hidden', width: '100%' }}>
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: '12px',
          willChange: 'transform',
          width: 'max-content',
        }}
      >
        {doubled.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            style={{
              height: '160px',
              width: 'auto',
              objectFit: 'cover',
              flexShrink: 0,
              display: 'block',
            }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ))}
      </div>
    </div>
  );
}
