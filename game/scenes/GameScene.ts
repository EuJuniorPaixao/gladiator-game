import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private bears!: Phaser.Physics.Arcade.Group;
  private ghosts!: Phaser.Physics.Arcade.Group;
  private thieves!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private score: number = 0;
  private lives: number = 3;
  private timer: number = 180;
  private timerEvent!: Phaser.Time.TimerEvent;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private heartTexts: Phaser.GameObjects.Text[] = [];
  private jumpsLeft: number = 2;
  private isInvincible: boolean = false;
  private canAttack: boolean = true;
  private bgm!: Phaser.Sound.BaseSound;
  private sfx!: { jump: Phaser.Sound.BaseSound; coin: Phaser.Sound.BaseSound; slash: Phaser.Sound.BaseSound; hit: Phaser.Sound.BaseSound };

  // Tracks textures already processed for white-BG removal (shared across restarts)
  private static readonly processedTextures = new Set<string>();

  constructor() {
    super({ key: 'GameScene' });
  }

  // Remove near-white pixels from a loaded texture using canvas pixel manipulation
  private removeWhiteBg(key: string, tolerance = 40) {
    if (GameScene.processedTextures.has(key)) return;
    const tex = this.textures.get(key);
    if (!tex) return;
    const src = tex.getSourceImage() as HTMLImageElement;
    const cv = document.createElement('canvas');
    cv.width = src.width;
    cv.height = src.height;
    const ctx = cv.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const d = img.data;
    const thresh = 255 - tolerance;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] >= thresh && d[i + 1] >= thresh && d[i + 2] >= thresh) {
        d[i + 3] = 0; // fully transparent
      }
    }
    ctx.putImageData(img, 0, 0);
    this.textures.remove(key);
    this.textures.addCanvas(key, cv);
    GameScene.processedTextures.add(key);
  }

  create() {
    // Reset all state — scene.start() reuses the same instance, so we must reinitialize
    this.score = 0;
    this.lives = 3;
    this.timer = 180;
    this.jumpsLeft = 2;
    this.isInvincible = false;
    this.canAttack = true;
    this.heartTexts = [];
    if (this.timerEvent) this.timerEvent.remove(false);

    // Strip white backgrounds from AI-generated assets (runs once, persists across restarts)
    this.removeWhiteBg('gladiator-attack');

    // Audio — stop any leftover BGM from a previous run then start fresh
    this.sound.stopAll();
    this.bgm = this.sound.add('bgm', { loop: true, volume: 0.3 });
    this.bgm.play();
    this.sfx = {
      jump:  this.sound.add('jump',  { volume: 0.6 }),
      coin:  this.sound.add('coin',  { volume: 0.7 }),
      slash: this.sound.add('slash', { volume: 0.7 }),
      hit:   this.sound.add('hit',   { volume: 0.8 }),
    };

    const WORLD_WIDTH = 6000;
    const WORLD_HEIGHT = 420;

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Background — fixed image, no stretching
    this.add.image(400, 210, 'coliseum-bg')
      .setDisplaySize(800, 420)
      .setScrollFactor(0)
      .setDepth(0);

    // Platforms
    this.createPlatformTexture();
    this.platforms = this.physics.add.staticGroup();
    this.createPlatforms();

    // Player
    this.player = this.physics.add.sprite(80, 200, 'gladiator');
    this.player.setCollideWorldBounds(true);
    this.player.setGravityY(200);
    this.player.setScale(0.18);
    this.player.setDepth(10);
    {
      const pb = this.player.body as Phaser.Physics.Arcade.Body;
      const bw = Math.round(this.player.width * 0.7);
      const bh = Math.round(this.player.height * 0.95);
      pb.setSize(bw, bh);
      pb.setOffset(Math.round((this.player.width - bw) / 2), Math.round(this.player.height * 0.05));
    }

    // Enemies
    this.bears = this.physics.add.group();
    this.ghosts = this.physics.add.group();
    this.thieves = this.physics.add.group();
    this.spawnEnemies();

    // Coins
    this.coins = this.physics.add.group();
    this.spawnCoins();

    // Closing bell — end of level portal (narrow hitbox at the centre of the arch)
    const bell = this.physics.add.staticImage(5820, 355, 'closing-bell').setScale(0.18).setDepth(5);
    {
      const sb = bell.body as Phaser.Physics.Arcade.StaticBody;
      sb.setSize(Math.round(bell.width * 0.1), bell.height);
      sb.setOffset(Math.round(bell.width * 0.45), 0);
    }

    // Colliders
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.bears, this.platforms);
    this.physics.add.collider(this.thieves, this.platforms);

    // Overlaps
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, undefined, this);
    this.physics.add.overlap(this.player, this.bears, this.hitBear, undefined, this);
    this.physics.add.overlap(this.player, this.ghosts, this.hitEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.thieves, this.hitBear, undefined, this);
    this.physics.add.overlap(this.player, bell, this.goToBoss, undefined, this);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // HUD
    this.createHUD();

    // Timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.tickTimer,
      callbackScope: this,
      loop: true,
    });

    // Goal flag
    this.add.rectangle(5910, 350, 8, 80, 0xef9f27).setDepth(5);
    this.add.triangle(5918, 310, 0, 0, 40, 18, 0, 36, 0xe24b4a).setDepth(5);
  }

  private createPlatformTexture() {
    if (this.textures.exists('stone-tile')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Base stone
    g.fillStyle(0x9c8c6e);
    g.fillRect(0, 0, 48, 18);
    // Top highlight
    g.fillStyle(0xc8aa7a);
    g.fillRect(0, 0, 48, 4);
    // Bottom shadow
    g.fillStyle(0x5c4a32);
    g.fillRect(0, 14, 48, 4);
    // Brick seam
    g.fillStyle(0x6e5a3e);
    g.fillRect(23, 4, 2, 10);
    g.generateTexture('stone-tile', 48, 18);
    g.destroy();
  }

  private createPlatforms() {
    const plats = [
      [0, 400, 6000, 20],
      [0, 340, 260, 18], [310, 300, 130, 18], [490, 255, 110, 18],
      [660, 310, 180, 18], [890, 268, 130, 18], [1070, 225, 100, 18], [1220, 275, 150, 18],
      [1430, 320, 95, 18], [1575, 278, 95, 18], [1720, 236, 95, 18], [1865, 194, 200, 18],
      [2130, 298, 110, 18], [2290, 258, 110, 18], [2450, 298, 100, 18], [2600, 328, 190, 18],
      [2860, 278, 170, 18], [3080, 238, 130, 18], [3260, 288, 150, 18],
      [3470, 258, 115, 18], [3635, 298, 125, 18], [3810, 338, 120, 18],
      [3990, 338, 280, 18], [4090, 268, 100, 18], [4330, 308, 170, 18],
      [4560, 288, 75, 18], [4685, 256, 75, 18], [4810, 224, 75, 18], [4935, 256, 75, 18],
      [5070, 296, 190, 18], [5310, 256, 190, 18], [5550, 338, 250, 18],
    ];
    plats.forEach(([x, y, w, h]) => {
      // Invisible physics body
      const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000);
      rect.setVisible(false);
      this.physics.add.existing(rect, true);
      this.platforms.add(rect);
      // Stone tile visual
      this.add.tileSprite(x + w / 2, y + h / 2, w, h, 'stone-tile').setDepth(2);
      // Top edge highlight
      this.add.rectangle(x + w / 2, y + 1, w, 3, 0xd4a55a).setDepth(3);
    });
  }

  private spawnEnemies() {
    // Bears — on the ground
    [
      { x: 180, min: 0, max: 260 },
      { x: 700, min: 660, max: 840 },
      { x: 1240, min: 1220, max: 1370 },
      { x: 2615, min: 2600, max: 2790 },
      { x: 4000, min: 3990, max: 4270 },
      { x: 5075, min: 5070, max: 5260 },
    ].forEach(d => {
      const b = this.bears.create(d.x, 200, 'bear') as Phaser.Physics.Arcade.Sprite;
      b.setScale(0.21);
      b.setDepth(8);
      b.setData({ minX: d.min, maxX: d.max });
      b.setVelocityX(-80);
      const bb = b.body as Phaser.Physics.Arcade.Body;
      const bw = Math.round(b.width * 0.7);
      const bh = Math.round(b.height * 0.95);
      bb.setSize(bw, bh);
      bb.setOffset(Math.round((b.width - bw) / 2), Math.round(b.height * 0.05));
    });

    // Margin thieves — ground patrol at 2.5x bear speed
    [
      { x: 500,  min: 310,  max: 640 },
      { x: 1900, min: 1865, max: 2080 },
      { x: 3300, min: 3260, max: 3410 },
      { x: 4700, min: 4560, max: 4935 },
    ].forEach(d => {
      const t = this.thieves.create(d.x, 200, 'margin-thief') as Phaser.Physics.Arcade.Sprite;
      t.setScale(0.21);
      t.setDepth(8);
      t.setData({ minX: d.min, maxX: d.max });
      t.setVelocityX(-200);
      t.setFlipX(true);
      const tb = t.body as Phaser.Physics.Arcade.Body;
      const tw = Math.round(t.width * 0.7);
      const th = Math.round(t.height * 0.95);
      tb.setSize(tw, th);
      tb.setOffset(Math.round((t.width - tw) / 2), Math.round(t.height * 0.05));
    });

    // Ghosts — floating, no gravity, SCREEN blend removes dark background
    [
      { x: 460, y: 200 }, { x: 1085, y: 165 },
      { x: 2295, y: 185 }, { x: 3480, y: 178 }, { x: 4820, y: 148 },
    ].forEach(d => {
      const g = this.ghosts.create(d.x, d.y, 'ghost') as Phaser.Physics.Arcade.Sprite;
      g.setScale(0.15);
      g.setDepth(8);
      g.setBlendMode(Phaser.BlendModes.SCREEN);
      g.setData({ baseY: d.y, phase: Math.random() * Math.PI * 2 });
      g.body!.setAllowGravity(false);
      const gb = g.body as Phaser.Physics.Arcade.Body;
      const gw = Math.round(g.width * 0.5);
      const gh = Math.round(g.height * 0.7);
      gb.setSize(gw, gh);
      gb.setOffset(Math.round((g.width - gw) / 2), Math.round(g.height * 0.15));
    });
  }

  private spawnCoins() {
    const coinData = [
      {x:50,y:280,f:0},{x:88,y:280,f:0},{x:126,y:280,f:0},
      {x:325,y:248,f:0},{x:363,y:248,f:0},
      {x:545,y:204,f:1},
      {x:680,y:258,f:0},{x:718,y:258,f:0},
      {x:905,y:215,f:1},{x:943,y:215,f:1},
      {x:1090,y:172,f:2},
      {x:1235,y:222,f:0},{x:1273,y:222,f:0},
      {x:1590,y:226,f:1},{x:1628,y:226,f:1},
      {x:1920,y:142,f:2},
      {x:2145,y:246,f:0},{x:2183,y:246,f:0},
      {x:2305,y:206,f:1},
      {x:2620,y:276,f:0},{x:2658,y:276,f:0},
      {x:2875,y:226,f:1},{x:2913,y:226,f:1},
      {x:3095,y:186,f:2},
      {x:3280,y:236,f:0},{x:3318,y:236,f:0},
      {x:3825,y:286,f:1},
      {x:4005,y:286,f:0},{x:4043,y:286,f:0},
      {x:4105,y:216,f:2},
      {x:4345,y:256,f:1},{x:4383,y:256,f:1},
      {x:4697,y:204,f:2},
      {x:4822,y:172,f:2},
      {x:5085,y:244,f:0},{x:5123,y:244,f:0},
      {x:5325,y:204,f:1},{x:5363,y:204,f:1},
      {x:5565,y:286,f:2},
    ];
    coinData.forEach(c => {
      const coin = this.coins.create(c.x, c.y, 'collectibles') as Phaser.Physics.Arcade.Sprite;
      coin.setData('type', c.f);
      coin.setScale(0.05);
      coin.body!.setAllowGravity(false);
      coin.setCrop(c.f * 704, 0, 704, 768);
      (coin.body as Phaser.Physics.Arcade.Body).setSize(500, 600, true);
      this.tweens.add({
        targets: coin, y: c.y - 10,
        duration: 900 + Math.random() * 300,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });
  }

  private createHUD() {
    this.add.rectangle(90, 20, 160, 32, 0x000000, 0.6).setScrollFactor(0).setDepth(50);
    this.scoreText = this.add.text(16, 10, '$ 0', { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setScrollFactor(0).setDepth(51);
    this.add.rectangle(710, 20, 140, 32, 0x000000, 0.6).setScrollFactor(0).setDepth(50);
    this.timerText = this.add.text(648, 10, '⏱ 180s', { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setScrollFactor(0).setDepth(51);
    for (let i = 0; i < 3; i++) {
      const h = this.add.text(330 + i * 28, 8, '❤', {
        fontSize: '22px', color: '#e24b4a',
      }).setScrollFactor(0).setDepth(51).setOrigin(0.5, 0);
      this.heartTexts.push(h);
    }
  }

  private updateHearts() {
    this.heartTexts.forEach((h, i) => {
      h.setText(i < this.lives ? '❤' : '🖤').setAlpha(i < this.lives ? 1 : 0.35);
    });
  }

  private tickTimer() {
    this.timer--;
    this.timerText.setText(`⏱ ${this.timer}s`).setColor(this.timer < 30 ? '#e24b4a' : '#ffffff');
    if (this.timer <= 0) this.endGame(false);
  }

  private collectCoin(_p: any, coin: any) {
    const type = coin.getData('type') as number;
    const pts = type === 2 ? 100 : type === 1 ? 50 : 10;
    this.score += pts;
    this.scoreText.setText('$ ' + this.score.toLocaleString());
    coin.destroy();
    this.sfx.coin.play();
  }

  private hitBear(_p: any, bear: any) {
    if (this.isInvincible) return;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const bearBody = bear.body as Phaser.Physics.Arcade.Body;
    const stomping = playerBody.velocity.y > 0 && playerBody.bottom <= bearBody.top + 16;
    if (stomping) {
      bear.destroy();
      this.score += 30;
      this.scoreText.setText(`$ ${this.score.toLocaleString()}`);
      this.player.setVelocityY(-400);
    } else {
      this.takeDamage();
    }
  }

  private hitEnemy(_p: any, _e: any) {
    if (this.isInvincible) return;
    this.takeDamage();
  }

  private takeDamage() {
    this.lives--;
    this.updateHearts();
    this.isInvincible = true;
    this.player.setPosition(80, 300);
    this.player.setVelocity(0, 0);
    this.tweens.add({
      targets: this.player,
      alpha: 0.15,
      duration: 80,
      yoyo: true,
      repeat: 10,
      onComplete: () => this.player.setAlpha(1),
    });
    this.time.delayedCall(1800, () => {
      this.isInvincible = false;
      this.player.setAlpha(1);
    });
    if (this.lives <= 0) this.endGame(false);
  }

  private goToBoss() {
    if (this.isInvincible) return;
    this.isInvincible = true;
    this.sound.stopAll();
    this.timerEvent.remove(false);
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    const msg = this.add.text(400, 180, '🔔 PREGÃO ENCERRADO!', {
      fontSize: '26px', color: '#EF9F27', fontStyle: 'bold',
      backgroundColor: '#000000cc', padding: { x: 20, y: 12 },
    }).setScrollFactor(0).setDepth(200).setOrigin(0.5);
    this.tweens.add({ targets: msg, alpha: 0, delay: 1600, duration: 400 });
    this.time.delayedCall(2000, () => {
      this.scene.start('BossScene', { score: this.score, lives: this.lives });
    });
  }

  private performAttack() {
    if (!this.canAttack) return;
    this.canAttack = false;

    // Capture movement direction BEFORE texture switch
    const facingLeft = this.player.flipX; // true = left, false = right

    // Attack image naturally faces LEFT.
    // → Attacking RIGHT (facingLeft=false): must flip it  → setFlipX(true)
    // → Attacking LEFT  (facingLeft=true) : show as-is   → setFlipX(false)
    this.player.setTexture('gladiator-attack');
    this.player.setFlipX(!facingLeft);
    this.sfx.slash.play();

    // Hitzone: placed in front of the sword tip, mirrors based on facing
    const facing = facingLeft ? -1 : 1;
    const zoneX = this.player.x + facing * this.player.displayWidth * 0.85;
    const zone = this.add.zone(
      zoneX, this.player.y,
      this.player.displayWidth * 0.9,
      this.player.displayHeight * 0.85,
    );
    this.physics.add.existing(zone);
    (zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Hit bears (+30 pts)
    this.physics.add.overlap(zone, this.bears, (_z, enemy: any) => {
      if (!enemy.active) return;
      enemy.destroy();
      this.score += 30;
      this.scoreText.setText(`$ ${this.score.toLocaleString()}`);
      this.sfx.hit.play();
    });
    // Hit thieves (+20 pts)
    this.physics.add.overlap(zone, this.thieves, (_z, enemy: any) => {
      if (!enemy.active) return;
      enemy.destroy();
      this.score += 20;
      this.scoreText.setText(`$ ${this.score.toLocaleString()}`);
      this.sfx.hit.play();
    });

    // 300ms: destroy zone + restore idle texture (keep same facing direction)
    this.time.delayedCall(300, () => {
      zone.destroy();
      if (this.player.active) {
        this.player.setTexture('gladiator');
        this.player.setFlipX(facingLeft);
      }
    });
    // 500ms: cooldown done
    this.time.delayedCall(500, () => { this.canAttack = true; });
  }

  private endGame(won: boolean) {
    this.bgm.stop();
    this.timerEvent.remove();
    this.scene.start('GameOverScene', { score: this.score, won });
  }

  update() {
    const onGround = this.player.body!.blocked.down;
    if (onGround) this.jumpsLeft = 2;

    const goLeft = this.cursors.left.isDown || this.wasd.left.isDown;
    const goRight = this.cursors.right.isDown || this.wasd.right.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.up);

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.performAttack();

    if (goLeft) { this.player.setVelocityX(-220); this.player.setFlipX(true); }
    else if (goRight) { this.player.setVelocityX(220); this.player.setFlipX(false); }
    else { this.player.setVelocityX(0); }

    if (jump && this.jumpsLeft > 0) {
      this.player.setVelocityY(-480);
      this.jumpsLeft--;
      this.sfx.jump.play();
    }

    if (this.player.y > 430) this.takeDamage();

    this.bears.getChildren().forEach((b: any) => {
      if (b.x <= b.getData('minX')) { b.setVelocityX(80); b.setFlipX(false); }
      if (b.x >= b.getData('maxX')) { b.setVelocityX(-80); b.setFlipX(true); }
    });

    this.thieves.getChildren().forEach((t: any) => {
      if (t.x <= t.getData('minX')) { t.setVelocityX(200); t.setFlipX(false); }
      if (t.x >= t.getData('maxX')) { t.setVelocityX(-200); t.setFlipX(true); }
    });

    this.ghosts.getChildren().forEach((g: any) => {
      const phase = g.getData('phase') + 0.03;
      g.setData('phase', phase);
      g.y = g.getData('baseY') + Math.sin(phase) * 30;
      g.x += Math.sign(this.player.x - g.x) * 0.5;
    });
  }
}
