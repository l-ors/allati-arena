// Dramatic reward chest opening animation with light rays, particles, coins, gems, and card reveals
function playChestOpeningAnimation(rewards, onComplete) {
  let modal = document.getElementById('chest-animation-overlay');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'chest-animation-overlay';
    modal.className = 'chest-anim-overlay';
    document.body.appendChild(modal);
  }
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <canvas id="chest-rays-canvas"></canvas>
    <div class="chest-stage" id="chest-stage">
      <div class="chest-box-wrap" id="chest-box-wrap">
        <div class="chest-box chest-${rewards.chest.type}">
          <div class="chest-lid"></div>
          <div class="chest-base"></div>
          <div class="chest-lock"></div>
        </div>
      </div>
      <div class="chest-instruction" id="chest-hint">Tap chest to open!</div>
      <div class="chest-reveal-card hidden" id="chest-reveal-card"></div>
      <div class="chest-rewards-summary hidden" id="chest-summary"></div>
    </div>
  `;

  const canvas = document.getElementById('chest-rays-canvas');
  const ctx = canvas.getContext('2d');
  let animId = null;
  let chestOpened = false;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Particle system for rays and sparkle burst
  const particles = [];
  let rayAngle = 0;

  function renderRays() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 - 20;

    if (chestOpened) {
      // Rotating radial god rays
      rayAngle += 0.015;
      const numRays = 16;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rayAngle);
      for (let i = 0; i < numRays; i++) {
        const a1 = (i / numRays) * Math.PI * 2;
        const a2 = a1 + (Math.PI / numRays) * 0.55;
        const grad = ctx.createRadialGradient(0, 0, 30, 0, 0, 450);
        grad.addColorStop(0, 'rgba(255, 230, 100, 0.45)');
        grad.addColorStop(0.5, 'rgba(255, 180, 50, 0.18)');
        grad.addColorStop(1, 'rgba(255, 150, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 450, a1, a2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Sparkle burst particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.life -= 0.016;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    animId = requestAnimationFrame(renderRays);
  }
  animId = requestAnimationFrame(renderRays);

  function spawnBurst(cx, cy, count, colors) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: 3 + Math.random() * 3.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0
      });
    }
  }

  // Steps to reveal:
  // 1. Gold
  // 2. Gems (if any)
  // 3..N. Cards
  const revealSteps = [];
  if (rewards.gold) {
    revealSteps.push({ type: 'gold', amount: rewards.gold });
  }
  if (rewards.gems) {
    revealSteps.push({ type: 'gems', amount: rewards.gems });
  }
  for (const id in rewards.cards) {
    revealSteps.push({
      type: 'card',
      id,
      count: rewards.cards[id],
      isNew: rewards.newCards && rewards.newCards.includes(id)
    });
  }

  let currentStepIdx = -1;

  const boxWrap = document.getElementById('chest-box-wrap');
  const hint = document.getElementById('chest-hint');
  const revealCard = document.getElementById('chest-reveal-card');
  const summary = document.getElementById('chest-summary');

  boxWrap.addEventListener('click', () => {
    if (chestOpened) return;
    chestOpened = true;
    boxWrap.classList.add('opened');
    hint.textContent = 'Tap anywhere to reveal rewards!';
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    spawnBurst(cx, cy, 50, ['#ffd32a', '#ff9f1a', '#2ed573', '#ffffff', '#00d2d3']);
    setTimeout(nextReveal, 400);
  });

  modal.addEventListener('click', (e) => {
    if (!chestOpened) return;
    if (summary.classList.contains('hidden') === false) return; // on summary screen
    nextReveal();
  });

  function nextReveal() {
    currentStepIdx++;
    if (currentStepIdx >= revealSteps.length) {
      showSummary();
      return;
    }

    const step = revealSteps[currentStepIdx];
    revealCard.classList.remove('hidden');
    revealCard.className = 'chest-reveal-card pop-in';
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (step.type === 'gold') {
      spawnBurst(cx, cy, 30, ['#ffc93c', '#ffa801', '#fff']);
      revealCard.innerHTML = `
        <div class="reveal-reward-item gold">
          <span class="icon big-reward-icon" data-icon="gold"></span>
          <div class="reveal-title">+${step.amount} Gold!</div>
        </div>
      `;
      applyIcons(revealCard);
    } else if (step.type === 'gems') {
      spawnBurst(cx, cy, 35, ['#2ed573', '#7bed9f', '#fff']);
      revealCard.innerHTML = `
        <div class="reveal-reward-item gems">
          <span class="icon big-reward-icon" data-icon="gem"></span>
          <div class="reveal-title">+${step.amount} Gems!</div>
        </div>
      `;
      applyIcons(revealCard);
    } else if (step.type === 'card') {
      const card = CARDS[step.id];
      const rarity = RARITIES[card.rarity];
      const dpr = window.devicePixelRatio || 1;
      const burstColors = rarity.name.includes('Legend')
        ? ['#00d2d3', '#ff9f1a', '#e056fd', '#ffffff']
        : rarity.name.includes('Epik')
        ? ['#a55ee0', '#8854d0', '#ffffff']
        : ['#6fa8dc', '#f0a030', '#ffffff'];

      spawnBurst(cx, cy, 40, burstColors);

      revealCard.innerHTML = `
        <div class="reveal-card-frame" style="border-color: ${rarity.color}">
          ${step.isNew ? '<span class="new-card-badge">ÚJ KÁRTYA! / NEW!</span>' : ''}
          <div class="reveal-card-header">
            <h4>${card.name}</h4>
            <span class="rarity-pill" style="background: ${rarity.color}">${rarity.name}</span>
          </div>
          <canvas width="${90 * dpr}" height="${90 * dpr}"></canvas>
          <div class="reveal-card-count">+${step.count} Cards</div>
          ${card.ability ? `<div class="reveal-ability">⚡ ${card.ability}</div>` : ''}
        </div>
      `;
      drawCardPortrait(revealCard.querySelector('canvas'), step.id);
    }
  }

  function showSummary() {
    revealCard.classList.add('hidden');
    boxWrap.classList.add('hidden');
    hint.classList.add('hidden');
    summary.classList.remove('hidden');

    const dpr = window.devicePixelRatio || 1;
    let cardsHtml = '';
    for (const id in rewards.cards) {
      const card = CARDS[id];
      const rarity = RARITIES[card.rarity];
      cardsHtml += `
        <div class="summary-card-tile" style="border-color: ${rarity.color}">
          <canvas class="sum-cv" data-id="${id}" width="${50 * dpr}" height="${50 * dpr}"></canvas>
          <span>${card.name}</span>
          <b>+${rewards.cards[id]}</b>
        </div>
      `;
    }

    summary.innerHTML = `
      <div class="summary-box">
        <h2>${chestName(rewards.chest)} Opened!</h2>
        <div class="summary-currencies">
          ${rewards.gold ? `<div class="sum-pill gold"><span class="icon" data-icon="gold"></span> +${rewards.gold}</div>` : ''}
          ${rewards.gems ? `<div class="sum-pill gem"><span class="icon" data-icon="gem"></span> +${rewards.gems}</div>` : ''}
        </div>
        <div class="summary-cards-grid">${cardsHtml}</div>
        <button class="big-btn collect-btn" id="btn-anim-collect">Collect Rewards!</button>
      </div>
    `;
    applyIcons(summary);

    summary.querySelectorAll('.sum-cv').forEach(c => {
      drawCardPortrait(c, c.dataset.id);
    });

    document.getElementById('btn-anim-collect').addEventListener('click', (e) => {
      e.stopPropagation();
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
      modal.classList.add('hidden');
      if (onComplete) onComplete();
    });
  }
}
