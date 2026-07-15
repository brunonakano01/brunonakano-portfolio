import { useState, useEffect, useRef } from 'react';

// Pre-fetched thumbnails from Vimeo oEmbed API — no runtime fetch needed
export const VIMEO_THUMBS: Record<string, string> = {
  "1170568733": "https://i.vimeocdn.com/video/2129751079-be4aa0d759f01d84af2a5f4b747db5ca8bd001a3bb1663a8c7a7f1e369e4dc5b-d_295x166?region=us",
  "1170568766": "https://i.vimeocdn.com/video/2129750716-4dd9cfbb9a37810c1ace6e355e01a6b7defb0d5c5962002e2055a546d6c06f94-d_295x166?region=us",
  "1170568786": "https://i.vimeocdn.com/video/2129750736-75ff14829d5fcb58b5cc02a958afbb5ad976db058169389d40335d6fb0efd8f1-d_295x166?region=us",
  "1170568802": "https://i.vimeocdn.com/video/2129750757-6d7b35261876d12ffcb45274a39d8d7b5d7a29685b6c4d3764c03a275e41ad55-d_295x166?region=us",
  "1170574267": "https://i.vimeocdn.com/video/2129758611-cd3ef0971901453d584fd506ec24a61f6cc70d0d4964f5f907f29bca55bc33a1-d_295x166?region=us",
  "1170574311": "https://i.vimeocdn.com/video/2129758678-05be03e1d24d3dad5bbced5224322842d774a257375d542b6c6add33a2206ea9-d_295x166?region=us",
  "1170574333": "https://i.vimeocdn.com/video/2129758708-adecfa1368da64e50da19ce3b1d4de089849df4a7edb1733856a65a8a54b28e2-d_295x166?region=us",
  "1170893097": "https://i.vimeocdn.com/video/2130203355-a5822f448d14dc07a8bc402f27c5822fc4918379e10ca4b0e850b772ae779c0b-d_295x166?region=us",
  "1173692006": "https://i.vimeocdn.com/video/2134083349-bb0a9d35bf870ad38d66a282dc43526823957e508127ebc8ce86a6c7bcd721e6-d_295x166?region=us",
  "1173696908": "https://i.vimeocdn.com/video/2134089192-0409768a9e8635397183af47de442ebccaaf142e5be2ceb2eee285c10e420260-d_295x166?region=us",
  "1173696951": "https://i.vimeocdn.com/video/2134089259-dee39fb7539e45904b84bdbd9d3f9a6c5cfa92ef462724cac681d45de54ba256-d_295x166?region=us",
  "217187282": "https://i.vimeocdn.com/video/634340940-2747c287a28665f5a2bd40966f833f2db630a0ca68f7fc552bdb9a9db012bced-d_640?region=us",
  "217188315": "https://i.vimeocdn.com/video/634341866-154c6d2437e872f4c29ef75b31be294165fbe0b49b5a1f2fb44c27d3c51a4154-d_640?region=us",
  "219596551": "https://i.vimeocdn.com/video/637389444-37f9ee8275c8dd70aaebbc98a7bed58a50e1cc9f7fcec52569b530b7b90ea163-d_640?region=us",
  "286727384": "https://i.vimeocdn.com/video/721695080-b8087a674a3a0146a41bd0af26a8eb908dd68f18dae5476d4737f1c8537a9f20-d_640?region=us",
  "286727603": "https://i.vimeocdn.com/video/721695088-42c7d6e10e449d9561e63a41e2e3040e322d76486c6831bd26db5036750c9f9e-d_640?region=us",
  "286727673": "https://i.vimeocdn.com/video/721695129-0c1a4e12f0857eaee3c1dbb1fb8b317aa7622b9b5bb0af2f0e68ce60cd7192e8-d_640?region=us",
  "286727709": "https://i.vimeocdn.com/video/721695232-8142785c8c3c6048f3afcf31371536b6b5a3a7da5633d1fb1716d1d9e7915b3f-d_640?region=us",
  "286727786": "https://i.vimeocdn.com/video/721695314-058063c88eabe003bbd624779b2b9475de1d15510c6821dfee1576e70126e34d-d_640?region=us",
  "286727866": "https://i.vimeocdn.com/video/721695386-fb30b871f58181d5d946f7b8bb29c83525277f4f18e40d6f300e037090d5e0d7-d_640?region=us",
  "286727917": "https://i.vimeocdn.com/video/721695428-38c03e313019f46eacdfb7712c8f8b1dc1e52970a38979a18a2c2ec6058ebf48-d_640?region=us",
  "286727955": "https://i.vimeocdn.com/video/721695573-da321e010ac6a5650e89ec1e9dde7117b1d926980f73bb6d585503a8266a11a7-d_640?region=us",
  "286728073": "https://i.vimeocdn.com/video/721695644-5ee6d43ca0c269901ba6ce6ae3db110760299e3327348e6231de3ee5744734ff-d_640?region=us",
  "286728142": "https://i.vimeocdn.com/video/721695679-f33c2bf41045faa9a4a8e814c907ee685923a9b62766df91485d410c45726b35-d_640?region=us",
  "286728178": "https://i.vimeocdn.com/video/721695731-d938f33efe6f2787c68d26db46c7e2fc32562b5e9209df64762904349f249250-d_640?region=us",
  "286728221": "https://i.vimeocdn.com/video/721695775-3c01f5ef033e000a9f0f6948689145d5630d70bd2c7f0ee78382a3ccd273f9f5-d_640?region=us",
  "306292196": "https://i.vimeocdn.com/video/746005678-2e2b3bb3bbd14c34ca42993b445d7ede9a97a49cfdee9d80dff13ad7044fb11f-d_640?region=us",
  "334615998": "https://i.vimeocdn.com/video/2130622825-8d453267b64adeda7f863d577c0d28e5898bc4aa56c3a38c35a6aeefa96788a1-d_640?region=us",
  "343710550": "https://i.vimeocdn.com/video/792980670-9f49687c54117ecbe4febeee15b6a8ffd02613f33d749f2794fa84b5114866f7-d_640?region=us",
  "371704647": "https://i.vimeocdn.com/video/829325558-006fedfe5c9515ee4cf344aa320f99f0f5bab17802c4940e1e4e6a1cfdb9ee1a-d_640?region=us",
  "371704672": "https://i.vimeocdn.com/video/829326430-4e0495dcb922b81f2e057983fa1a8389891d2ab834ebeff2cd8ce49c32a403d2-d_640?region=us",
  "371704689": "https://i.vimeocdn.com/video/829326599-cb11d8ce34b07cb3f3ece635739b2e1aec55311080a19238ed1bd0ee33ded6ac-d_640?region=us",
  "371744962": "https://i.vimeocdn.com/video/829413421-b8d8df58b517cf7098c5de531b64ca9416c576f2b9ad6a641d3eb9080f07a9ba-d_640?region=us",
  "371745605": "https://i.vimeocdn.com/video/829347789-5f1497a13c047fa3623d0ad93de1c1aed7cc3de2d8beadc71d938bcd6b099aae-d_640?region=us",
  "371745632": "https://i.vimeocdn.com/video/829347863-c0e8b89849e1ebaf3331d31970b0a0927f00f4fdc924b9d572a17c3f9ab43f8f-d_640?region=us",
  "371745670": "https://i.vimeocdn.com/video/829347929-7566f9c68faef1f892aa605f404734efb65283105ba09f5ff7e61112ab4aeeeb-d_640?region=us",
  "429384060": "https://i.vimeocdn.com/video/915091195-15b47782a735f1ae110b717163497f94722c13ad6389c5f160368cd09d914c81-d_640?region=us",
  "429384778": "https://i.vimeocdn.com/video/915091487-2547f084262e354506530d285ff373a47be9334cfc91bd4552f8e62e5c7fd92f-d_640?region=us",
  "429385150": "https://i.vimeocdn.com/video/915091984-319bbd867578f61413dadffc3495222e5ba92a0dc035c2ad9b57f3355ae7a3ee-d_640?region=us",
  "432945889": "https://i.vimeocdn.com/video/915088018-d54eb504d58307806ddc4d2bf2fabc8ab98a0a24e62eeebad31e301c6914f109-d_640?region=us",
  "432946376": "https://i.vimeocdn.com/video/915088616-3f9f3dfffe5425ae25cdeca696dd92027b0bc870315640e48918477e27ce5fb3-d_640?region=us",
  "432946669": "https://i.vimeocdn.com/video/915092299-e5639485ed0f6aeef8564133640d24100cc0e0ca2f61e68f6be321fe48a7fad8-d_640?region=us",
  "432948234": "https://i.vimeocdn.com/video/915091591-48bac9a7358dcd72b2e20fb28b059146429bbe6d05ea79ddd1f7799305a4e6ed-d_640?region=us",
  "435654761": "https://i.vimeocdn.com/video/919912508-c67ac27cf4bedc20d1ae870c1b66bddc7e3c5efc25145baef06fbff58216ce9d-d_640?region=us",
  "435655053": "https://i.vimeocdn.com/video/919913023-eb17d09474794b08e61ec8acc840fd33b9a7d36a5206922c9edab68e4b74d89b-d_640?region=us",
  "435655396": "https://i.vimeocdn.com/video/919911093-7c074f5d39a441e8b77e4f950c060f2f5540e330a40bab5eee951c379082898e-d_640?region=us",
  "435655934": "https://i.vimeocdn.com/video/919913281-4860d79522579623c89a91fcff35265a593ce01ecb34ca37a44cd388bb9f8dc5-d_640?region=us",
  "435860958": "https://i.vimeocdn.com/video/920299704-c76768aa7f24e230ecde87addcb6eb82501a99cc468f9353a0b1545a617e481f-d_640?region=us",
  "508194471": "https://i.vimeocdn.com/video/1051815282-d4e9f4e3c60e8ef5acc3b3ba702ddd31a88ff5956eae3238a12b5489c25f5f6b-d_640?region=us",
};

function extractVimeoId(url: string): string {
  const match = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/);
  return match ? match[1] : url.replace(/\D/g, '');
}

interface VimeoEmbedProps {
  url: string;
  className?: string;
  aspectRatio?: string;
  videoWidth?: string;
  style?: React.CSSProperties;
}

export default function VimeoEmbed({ url, className = '', aspectRatio = '16/9', videoWidth, style }: VimeoEmbedProps) {
  const [playing, setPlaying] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoId = extractVimeoId(url);
  const thumb = VIMEO_THUMBS[videoId] || null;
  const embedSrc = `https://player.vimeo.com/video/${videoId}?autoplay=1&badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0`;
  const vimeoPageUrl = `https://vimeo.com/${videoId}`;

  useEffect(() => {
    if (playing) {
      // Show fallback link after 6 seconds if video hasn't started
      fallbackTimerRef.current = setTimeout(() => setShowFallback(true), 6000);
    } else {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      setShowFallback(false);
    }
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [playing]);

  // When style prop is passed, use it directly; otherwise fall back to internal sizing
  const isFullFill = className.includes('w-full') && className.includes('h-full');
  const containerStyle: React.CSSProperties = style ? {
    position: 'relative',
    overflow: 'hidden',
    cursor: playing ? 'default' : 'pointer',
    background: 'transparent',
    ...style,
  } : isFullFill ? {
    position: 'relative',
    overflow: 'hidden',
    background: '#111',
    cursor: playing ? 'default' : 'pointer',
    width: '100%',
    height: '100%',
  } : {
    width: videoWidth || 'min(480px, 55vw)',
    aspectRatio,
    position: 'relative',
    overflow: 'hidden',
    background: '#111',
    cursor: playing ? 'default' : 'pointer',
    flexShrink: 0,
  };

  return (
    <div style={containerStyle} className={className} onClick={!playing ? () => setPlaying(true) : undefined}>
      {playing ? (
        <>
          <iframe
            src={embedSrc}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
          {showFallback && (
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                pointerEvents: 'auto',
              }}
            >
              <a
                href={vimeoPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'inline-block',
                  padding: '5px 12px',
                  background: 'rgba(0,0,0,0.75)',
                  color: '#fff',
                  fontSize: 12.5,
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  textDecoration: 'none',
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(4px)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(20,20,20,0.92)')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,0,0,0.75)')}
              >
                WATCH ON VIMEO ↗
              </a>
            </div>
          )}
        </>
      ) : (
        <>
          {thumb ? (
            <img
              src={thumb}
              alt="Video thumbnail"
              style={{ width: '100%', height: '100%', objectFit: style ? 'contain' : 'cover', display: 'block' }}
              onLoad={() => setThumbLoaded(true)}
              onError={() => setThumbLoaded(true)}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: style ? 'transparent' : '#1a1a1a' }} />
          )}
          {/* Play button overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: thumb ? 'rgba(0,0,0,0.22)' : (style ? 'transparent' : 'rgba(0,0,0,0.5)'),
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 16px rgba(0,0,0,0.45)',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <polygon points="6,3 17,10 6,17" fill="#111" />
              </svg>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
