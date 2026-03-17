import Phaser from 'phaser';

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Dark background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    // Subtle vignette border
    const border = this.add.graphics();
    border.lineStyle(3, 0xef9f27, 0.6);
    border.strokeRect(10, 10, width - 20, height - 20);

    // Title
    this.add.text(width / 2, height / 2 - 90, '⚔  GLADIATOR GAME', {
      fontSize: '44px',
      color: '#EF9F27',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 2 - 32, 'BULL MARKET ARENA', {
      fontSize: '16px',
      color: 'rgba(255,255,255,0.45)',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Hint line
    this.add.text(width / 2, height / 2 + 16, 'Derrote inimigos • Colete moedas • Vença o Minotauro', {
      fontSize: '12px',
      color: 'rgba(255,255,255,0.3)',
    }).setOrigin(0.5);

    // Blinking start prompt
    const startText = this.add.text(width / 2, height / 2 + 70, '▶   Clique para Iniciar   ◀', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0.1,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Controls hint
    this.add.text(width / 2, height - 24, '← → / A D  mover   ↑ / W / ESPAÇO  pular / atacar', {
      fontSize: '11px',
      color: 'rgba(255,255,255,0.25)',
    }).setOrigin(0.5);

    const startGame = () => this.scene.start('GameScene');

    this.input.on('pointerdown', startGame);
    this.input.keyboard!.once('keydown-ENTER', startGame);
    this.input.keyboard!.once('keydown-SPACE', startGame);
  }
}
