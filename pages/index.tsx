import Head from 'next/head';
import { useRouter } from 'next/router';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  return (
    <>
      <Head><title>Gladiator Game</title></Head>
      <main style={{
        minHeight: '100vh', background: '#0d0d1a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 32,
      }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/assets/sprites/ui/ui-logo-buttons.png"
            style={{ maxWidth: 420, width: '90%' }} alt="Gladiator Game" />
        </div>
        <button onClick={() => router.push('/game')} style={{
          background: '#EF9F27', color: '#1a1a2e', border: 'none',
          borderRadius: 10, padding: '14px 48px', fontSize: 20,
          fontWeight: 'bold', cursor: 'pointer', letterSpacing: 2,
        }}>
          ⚔ JOGAR
        </button>
      </main>
    </>
  );
}
