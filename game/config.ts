export function createPhaserConfig(parent: string) {
  return {
    type: 0,
    width: 800,
    height: 420,
    parent,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 550 },
        debug: false,
      },
    },
    scene: [],
    scale: {
      mode: 3,
      autoCenter: 1,
    },
  };
}
