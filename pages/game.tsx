import dynamic from 'next/dynamic';
import Head from 'next/head';

const GameWrapper = dynamic(() => import('../components/GameWrapper'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', maxWidth: 800, margin: '0 auto',
      height: 420, background: '#1a1a2e', borderRadius: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#EF9F27', fontSize: 18, fontFamily: 'monospace',
    }}>
      Carregando arena...
    </div>
  ),
});

export default function GamePage() {
  return (
    <>
      <Head>
        <title>Gladiator Game</title>
      </Head>
      <main style={{
        minHeight: '100vh',
        background: '#0d0d1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        margin: '0',
      }}>
        <GameWrapper />
      </main>
    </>
  );
}
