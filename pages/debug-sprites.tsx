export default function DebugSprites() {
  const sheets = [
    { name: 'gladiator-sprite', file: '/assets/sprites/player/gladiator-sprite.png' },
    { name: 'bear-enemy-sprite', file: '/assets/sprites/enemies/bear-enemy-sprite.png' },
    { name: 'fomo-ghost-sprite', file: '/assets/sprites/enemies/fomo-ghost-sprite.png' },
    { name: 'centurion-spread-sprite', file: '/assets/sprites/enemies/centurion-spread-sprite.png' },
    { name: 'collectibles-items', file: '/assets/sprites/collectibles/collectibles-items.png' },
  ];
  return (
    <div style={{ background: '#111', minHeight: '100vh', padding: 20 }}>
      <h1 style={{ color: '#EF9F27', fontFamily: 'monospace' }}>Sprite Sheet Debug</h1>
      {sheets.map(s => (
        <div key={s.name} style={{ marginBottom: 40 }}>
          <h2 style={{ color: '#fff', fontFamily: 'monospace', fontSize: 14 }}>{s.name}</h2>
          <img src={s.file} style={{ maxWidth: '100%', border: '1px solid #333', display: 'block' }} />
        </div>
      ))}
    </div>
  );
}
