/**
 * MobileView Component
 * Minimal, consistent type scale — all 15px
 */

export default function MobileView() {
  const base: React.CSSProperties = {
    fontSize: 14,
    letterSpacing: '-0.01em',
    lineHeight: 1.5,
    color: '#000',
    fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",
    margin: 0,
  };

  const muted: React.CSSProperties = {
    ...base,
    opacity: 0.4,
  };

  const link: React.CSSProperties = {
    ...base,
    textDecoration: 'none',
    display: 'block',
  };

  const divider: React.CSSProperties = {
    borderTop: '1px solid rgba(0,0,0,0.12)',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        color: '#000',
        fontFamily: "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif",
        padding: '48px 24px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
      }}
    >
      {/* Name + intro */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ ...base, fontWeight: 600 }}>(Bruno Nakano)</p>
        <p style={{ ...base, fontWeight: 600 }}>
          This site is desktop only. Come back on a computer.
        </p>
      </div>

      <div style={divider} />

      {/* Contact links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <a href="mailto:hello@brunonakano.com" style={link}>hello@brunonakano.com</a>
        <a href="https://www.linkedin.com/in/brunonakano" target="_blank" rel="noopener noreferrer" style={link}>LinkedIn ↗</a>
      </div>
    </div>
  );
}
