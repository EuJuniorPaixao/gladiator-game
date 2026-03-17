import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  private score: number = 0;
  private won: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score: number; won: boolean }) {
    this.score = data.score ?? 0;
    this.won = data.won ?? false;
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.92);

    // Title
    const titleColor = this.won ? '#1D9E75' : '#e24b4a';
    const titleLabel = this.won ? '🏆 VITÓRIA! MERCADO DOMADO!' : '💀 GAME OVER';
    this.add.text(width / 2, 52, titleLabel, {
      fontSize: '36px', color: titleColor, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Score
    this.add.text(width / 2, 108, `Net Worth Final: $ ${this.score.toLocaleString()}`, {
      fontSize: '22px', color: '#EF9F27', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Ranking header + rows — hidden until the form is submitted
    const rankingTitle = this.add.text(width / 2, 154, '🏅 TOP 5 — HALL DA FAMA', {
      fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const rowTexts: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < 5; i++) {
      rowTexts.push(
        this.add.text(width / 2, 178 + i * 28, '—', {
          fontSize: '15px', color: '#aaaaaa',
        }).setOrigin(0.5).setAlpha(0),
      );
    }

    // Replay button (always visible)
    const replayBtn = this.add.text(width / 2, height - 40, '[ JOGAR NOVAMENTE ]', {
      fontSize: '17px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: '#1a1a2e', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);

    replayBtn.on('pointerover', () => replayBtn.setColor('#EF9F27'));
    replayBtn.on('pointerout',  () => replayBtn.setColor('#ffffff'));
    replayBtn.on('pointerdown', () => this.scene.start('StartScene'));

    // ── Custom DOM input form ──────────────────────────────────────────────
    const formHtml = `
      <div id="name-form" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        background: #0d0d1f;
        border: 2px solid #EF9F27;
        border-radius: 10px;
        padding: 20px 28px;
        box-shadow: 0 0 24px rgba(239,159,39,0.35);
        font-family: monospace;
      ">
        <span style="color:#EF9F27; font-size:13px; font-weight:bold; letter-spacing:1px;">
          ✍&nbsp; INSIRA SEU NOME NO RANKING
        </span>
        <input
          id="name-input"
          type="text"
          maxlength="20"
          placeholder="Seu nome, Gladiador"
          autocomplete="off"
          style="
            width: 210px;
            padding: 8px 12px;
            background: #1a1a2e;
            border: 1.5px solid #EF9F27;
            border-radius: 6px;
            color: #ffffff;
            font-size: 14px;
            font-family: monospace;
            text-align: center;
            outline: none;
          "
        />
        <button
          id="save-btn"
          style="
            width: 210px;
            padding: 9px 0;
            background: #EF9F27;
            border: none;
            border-radius: 6px;
            color: #0d0d1f;
            font-size: 14px;
            font-weight: bold;
            font-family: monospace;
            letter-spacing: 1px;
            cursor: pointer;
          "
        >⚔&nbsp; SALVAR NO RANKING</button>
      </div>
    `;

    const domEl = this.add.dom(width / 2, 238).createFromHTML(formHtml);

    // Focus the input after a frame so Phaser doesn't steal focus
    this.time.delayedCall(80, () => {
      const input = domEl.getChildByID('name-input') as HTMLInputElement | null;
      input?.focus();
    });

    // Listen for clicks on the DOM element
    domEl.addListener('click');
    domEl.on('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.id !== 'save-btn') return;

      const input = domEl.getChildByID('name-input') as HTMLInputElement | null;
      const playerName = input?.value?.trim() || 'Anônimo';

      // Remove the form immediately so the ranking can appear
      domEl.destroy();

      // Reveal ranking area
      rankingTitle.setAlpha(1).setText('🏅 TOP 5 — HALL DA FAMA  (salvando…)');
      rowTexts.forEach(r => r.setAlpha(1));

      this.saveAndShowLeaderboard(playerName, rankingTitle, rowTexts);
    });

    // Clean up DOM element if scene is shut down before the button is clicked
    this.events.once('shutdown', () => { if (domEl.active) domEl.destroy(); });
  }

  private async saveAndShowLeaderboard(
    name: string,
    rankingTitle: Phaser.GameObjects.Text,
    rowTexts: Phaser.GameObjects.Text[],
  ) {
    try {
      const { saveScore, getTopScores } = await import('../../lib/supabase');
      await saveScore(name, this.score);
      const top5 = await getTopScores(5);

      rankingTitle.setText('🏅 TOP 5 — HALL DA FAMA');

      top5.forEach((entry, i) => {
        const medal = ['🥇', '🥈', '🥉', '4.', '5.'][i] ?? `${i + 1}.`;
        const isMe = entry.player_name === name && entry.score === this.score;
        const color = isMe ? '#EF9F27' : i === 0 ? '#FFD700' : '#cccccc';
        rowTexts[i]?.setText(
          `${medal}  ${entry.player_name}  —  $ ${entry.score.toLocaleString()}`,
        ).setColor(color);
      });

      for (let i = top5.length; i < rowTexts.length; i++) {
        rowTexts[i]?.setText('—').setColor('#555555');
      }
    } catch (err) {
      console.error('Leaderboard error:', err);
      rankingTitle.setText('🏅 Não foi possível carregar o ranking');
    }
  }
}
