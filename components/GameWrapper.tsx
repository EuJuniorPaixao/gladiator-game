import { useEffect, useRef } from 'react';

interface GameWrapperProps {
  onGameOver?: (score: number) => void;
  onWin?: (score: number) => void;
}

export default function GameWrapper({ onGameOver, onWin }: GameWrapperProps) {
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: any = null;

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default;
      const { BootScene } = await import('../game/scenes/BootScene');
      const { StartScene } = await import('../game/scenes/StartScene');
      const { GameScene } = await import('../game/scenes/GameScene');
      const { BossScene } = await import('../game/scenes/BossScene');
      const { GameOverScene } = await import('../game/scenes/GameOverScene');

      if (gameRef.current || !containerRef.current) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 420,
        parent: containerRef.current,
        backgroundColor: '#1a1a2e',
        pixelArt: false,
        antialias: true,
        dom: {
          createContainer: true,
        },
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 550 },
            debug: false,
          },
        },
        scene: [BootScene, StartScene, GameScene, BossScene, GameOverScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 800,
          height: 420,
        },
      };

      game = new Phaser.Game(config);
      gameRef.current = game;

      game.registry.set('onGameOver', onGameOver);
      game.registry.set('onWin', onWin);
    };

    initPhaser();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        maxWidth: '100vw',
        height: '100vh',
        display: 'block',
      }}
    />
  );
}
