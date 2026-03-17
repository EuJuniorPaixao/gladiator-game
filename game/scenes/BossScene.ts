import Phaser from 'phaser';

export class BossScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private minotaur!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private score: number = 0;
  private lives: number = 3;
  private bossHp: number = 3;
  private jumpsLeft: number = 2;
  private isInvincible: boolean = false;
  private bossCharging: boolean = false;
  private canAttack: boolean = true;
  private heartTexts: Phaser.GameObjects.Text[] = [];
  private bossHpText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private bgmBoss!: Phaser.Sound.BaseSound;
  private sfx!: { jump: Phaser.Sound.BaseSound; slash: Phaser.Sound.BaseSound; hit: Phaser.Sound.BaseSound };

  constructor() {
    super({ key: 'BossScene' });
  }

  init(data: { score?: number; lives?: number }) {
    this.score = data.score ?? 0;
    this.lives = data.lives ?? 3;
    this.bossHp = 3;
    this.jumpsLeft = 2;
    this.isInvincible = false;
    this.bossCharging = false;
    this.canAttack = true;
    this.heartTexts = [];
  }

  private removeWhiteBg(key: string, tolerance = 40) {
    const tex = this.textures.get(key);
    if (!tex) return;
    const src = tex.getSourceImage();
    // If the source is already an HTMLCanvasElement the texture was already
    // processed by GameScene (or a previous BossScene run) — skip.
    if (src instanceof HTMLCanvasElement) return;
    const imgEl = src as HTMLImageElement;
    const cv = document.createElement('canvas');
    cv.width = imgEl.width;
    cv.height = imgEl.height;
    const ctx = cv.getContext('2d')!;
    ctx.drawImage(imgEl, 0, 0);
    const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
    const d = imgData.data;
    const thresh = 255 - tolerance;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] >= thresh && d[i + 1] >= thresh && d[i + 2] >= thresh) {
        d[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    this.textures.remove(key);
    this.textures.addCanvas(key, cv);
  }

  create() {
    const W = 800, H = 420;

    // Strip white bg from attack sprite (safe to call even if already done)
    this.removeWhiteBg('gladiator-attack');

    // Audio — stop any leftover BGM then start boss track
    this.sound.stopAll();
    this.bgmBoss = this.sound.add('bgm-boss', { loop: true, volume: 0.35 });
    this.bgmBoss.play();
    this.sfx = {
      jump:  this.sound.add('jump',  { volume: 0.6 }),
      slash: this.sound.add('slash', { volume: 0.7 }),
      hit:   this.sound.add('hit',   { volume: 0.8 }),
    };

    // Background
    this.add.image(W / 2, H / 2, 'boss-room-bg').setDisplaySize(W, H).setDepth(0);

    // World bounds
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.setBounds(0, 0, W, H);

    // Ground platform
    this.platforms = this.physics.add.staticGroup();
    const groundRect = this.add.rectangle(W / 2, H - 10, W, 20, 0x9c8c6e);
    this.physics.add.existing(groundRect, true);
    this.platforms.add(groundRect);
    this.add.rectangle(W / 2, H - 19, W, 3, 0xd4a55a).setDepth(3);

    // Player
    this.player = this.physics.add.sprite(100, H - 80, 'gladiator');
    this.player.setScale(0.18);
    this.player.setCollideWorldBounds(true);
    this.player.setGravityY(200);
    this.player.setDepth(10);
    {
      const pb = this.player.body as Phaser.Physics.Arcade.Body;
      const bw = Math.round(this.player.width * 0.7);
      const bh = Math.round(this.player.height * 0.95);
      pb.setSize(bw, bh);
      pb.setOffset(Math.round((this.player.width - bw) / 2), Math.round(this.player.height * 0.05));
    }

    // Minotaur boss
    this.minotaur = this.physics.add.sprite(650, H - 80, 'minotaur');
    this.minotaur.setScale(0.26);
    this.minotaur.setCollideWorldBounds(true);
    this.minotaur.setGravityY(200);
    this.minotaur.setDepth(10);
    this.minotaur.setFlipX(true);
    {
      const mb = this.minotaur.body as Phaser.Physics.Arcade.Body;
      const bw = Math.round(this.minotaur.width * 0.65);
      const bh = Math.round(this.minotaur.height * 0.9);
      mb.setSize(bw, bh);
      mb.setOffset(Math.round((this.minotaur.width - bw) / 2), Math.round(this.minotaur.height * 0.08));
    }

    // Colliders
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.minotaur, this.platforms);

    // Overlap: stomp detection
    this.physics.add.overlap(this.player, this.minotaur, this.handlePlayerMinotaurOverlap, undefined, this);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // HUD
    this.createHUD();

    // Start boss charge loop after short delay
    this.time.delayedCall(1200, () => this.startCharge(), [], this);
  }

  private createHUD() {
    this.add.rectangle(90, 20, 160, 32, 0x000000, 0.65).setScrollFactor(0).setDepth(50);
    this.scoreText = this.add.text(16, 10, `$ ${this.score.toLocaleString()}`, {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(51);

    for (let i = 0; i < 3; i++) {
      const h = this.add.text(330 + i * 28, 8, '❤', {
        fontSize: '22px', color: '#e24b4a',
      }).setScrollFactor(0).setDepth(51).setOrigin(0.5, 0);
      this.heartTexts.push(h);
    }

    this.bossHpText = this.add.text(400, 396, '👹  ❤❤❤', {
      fontSize: '16px', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5, 1).setDepth(51);

    this.add.text(400, 8, '⚔  BATALHA FINAL  —  MINOTAURO DA VOLATILIDADE', {
      fontSize: '11px', color: '#EF9F27',
    }).setOrigin(0.5, 0).setDepth(51);
  }

  private updateHearts() {
    this.heartTexts.forEach((h, i) => {
      h.setText(i < this.lives ? '❤' : '🖤').setAlpha(i < this.lives ? 1 : 0.35);
    });
  }

  private updateBossHp() {
    const hearts = '❤'.repeat(this.bossHp) + '🖤'.repeat(3 - this.bossHp);
    this.bossHpText.setText(`👹  ${hearts}`);
  }

  // Boss charge: dash toward player → stop 2s → repeat
  private startCharge() {
    if (!this.minotaur?.active) return;
    this.bossCharging = true;
    const dir = this.player.x < this.minotaur.x ? -1 : 1;
    this.minotaur.setVelocityX(dir * 340);
    this.minotaur.setFlipX(dir > 0);

    this.time.delayedCall(1100, () => {
      if (!this.minotaur?.active) return;
      this.minotaur.setVelocityX(0);
      this.bossCharging = false;
      this.time.delayedCall(2000, () => this.startCharge(), [], this);
    }, [], this);
  }

  // Player touches minotaur — stomp = boss takes damage, else player takes damage
  private handlePlayerMinotaurOverlap(_p: any, mino: any) {
    if (this.isInvincible) return;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const minoBody = mino.body as Phaser.Physics.Arcade.Body;
    const stomping = playerBody.velocity.y > 0 && playerBody.bottom <= minoBody.top + 16;

    if (stomping) {
      this.player.setVelocityY(-420);
      this.damageMinotaur();
    } else {
      this.takeDamage();
    }
  }

  // Sword attack — identical logic to GameScene.performAttack(), targets minotaur
  private performAttack() {
    if (!this.canAttack) return;
    if (!this.minotaur?.active) return;
    this.canAttack = false;

    const facingLeft = this.player.flipX;
    this.player.setTexture('gladiator-attack');
    this.player.setFlipX(!facingLeft);
    this.sfx.slash.play();

    const facing = facingLeft ? -1 : 1;
    const zoneX = this.player.x + facing * this.player.displayWidth * 0.85;
    const zone = this.add.zone(
      zoneX, this.player.y,
      this.player.displayWidth * 0.9,
      this.player.displayHeight * 0.85,
    );
    this.physics.add.existing(zone);
    (zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Check overlap with minotaur
    this.physics.add.overlap(zone, this.minotaur, () => {
      if (!this.minotaur?.active) return;
      zone.destroy();
      this.damageMinotaur();
    });

    this.time.delayedCall(300, () => {
      if (zone.active) zone.destroy();
      if (this.player.active) {
        this.player.setTexture('gladiator');
        this.player.setFlipX(facingLeft);
      }
    });
    this.time.delayedCall(500, () => { this.canAttack = true; });
  }

  // Minotaur loses 1 HP — red tint blink + camera shake; 0 HP → boss dies
  private damageMinotaur() {
    this.bossHp--;
    this.updateBossHp();
    this.sfx.hit.play();
    this.cameras.main.shake(120, 0.012);
    this.minotaur.setTint(0xff0000);
    this.time.delayedCall(200, () => {
      if (this.minotaur?.active) this.minotaur.clearTint();
    });

    if (this.bossHp <= 0) {
      this.bossDied();
    }
  }

  private bossDied() {
    this.minotaur.destroy();
    this.bgmBoss.stop();
    this.cameras.main.shake(300, 0.02);

    this.add.text(400, 180, '🏆 VITÓRIA! MERCADO DOMADO!', {
      fontSize: '24px', color: '#EF9F27', fontStyle: 'bold',
      backgroundColor: '#000000cc', padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setDepth(200);

    this.time.delayedCall(2200, () => {
      this.scene.start('GameOverScene', { score: this.score, won: true });
    });
  }

  private takeDamage() {
    this.lives--;
    this.updateHearts();
    if (this.lives <= 0) {
      this.bgmBoss.stop();
      this.scene.start('GameOverScene', { score: this.score, won: false });
      return;
    }
    this.isInvincible = true;
    this.tweens.add({
      targets: this.player, alpha: 0.2,
      duration: 80, yoyo: true, repeat: 10,
      onComplete: () => this.player.setAlpha(1),
    });
    this.time.delayedCall(1600, () => {
      this.isInvincible = false;
      this.player.setAlpha(1);
    });
  }

  update() {
    if (!this.player.active) return;

    const onGround = this.player.body!.blocked.down;
    if (onGround) this.jumpsLeft = 2;

    const goLeft  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const goRight = this.cursors.right.isDown || this.wasd.right.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.up);

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.performAttack();

    if (goLeft)       { this.player.setVelocityX(-220); this.player.setFlipX(true); }
    else if (goRight) { this.player.setVelocityX(220);  this.player.setFlipX(false); }
    else              { this.player.setVelocityX(0); }

    if (jump && this.jumpsLeft > 0) {
      this.player.setVelocityY(-480);
      this.jumpsLeft--;
      this.sfx.jump.play();
    }

    if (this.player.y > 430) this.takeDamage();
  }
}
