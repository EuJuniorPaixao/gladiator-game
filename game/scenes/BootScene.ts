import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Background
    this.load.image('coliseum-bg', '/assets/sprites/background/coliseum-bg.png');
    this.load.image('boss-room-bg', '/assets/sprites/background/boss-room-bg.png');

    // Player
    this.load.image('gladiator', '/assets/gladiator-idle.png');
    this.load.image('gladiator-attack', '/assets/gladiator-attack.png');

    // Enemies
    this.load.image('bear', '/assets/bear-idle.png');
    this.load.image('ghost', '/assets/ghost-idle.png');
    this.load.image('margin-thief', '/assets/margin-thief-idle.png');
    this.load.image('minotaur', '/assets/minotaur-idle.png');

    // Collectibles
    this.load.image('collectibles', '/assets/sprites/collectibles/collectibles-items.png');

    // UI
    this.load.image('ui-hearts', '/assets/sprites/ui/ui-hearts.png');
    this.load.image('ui-panel-bg', '/assets/sprites/ui/ui-panel-bg.png');
    this.load.image('ui-score-time', '/assets/sprites/ui/ui-score-time.png');
    this.load.image('ui-logo-buttons', '/assets/sprites/ui/ui-logo-buttons.png');
    this.load.image('closing-bell', '/assets/sprites/ui/closing-bell.png');

    // Audio
    this.load.audio('bgm',      '/assets/audio/bgm.mp3');
    this.load.audio('bgm-boss', '/assets/audio/bgm-boss.mp3');
    this.load.audio('jump',  '/assets/audio/jump.mp3');
    this.load.audio('coin',  '/assets/audio/coin.mp3');
    this.load.audio('slash', '/assets/audio/slash.mp3');
    this.load.audio('hit',   '/assets/audio/hit.mp3');

    // Loading bar
    const bar = this.add.graphics();
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0x1a1a2e);
      bar.fillRect(0, 0, width, height);
      bar.fillStyle(0xef9f27);
      bar.fillRect(width / 4, height / 2 - 10, (width / 2) * value, 20);
      bar.fillStyle(0x333333);
      bar.fillRect(width / 4, height / 2 - 10, width / 2, 20);
      bar.fillStyle(0xef9f27);
      bar.fillRect(width / 4, height / 2 - 10, (width / 2) * value, 20);
    });
  }

  create() {
    this.scene.start('StartScene');
  }
}
