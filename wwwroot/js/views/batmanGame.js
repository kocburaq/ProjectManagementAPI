/* ============================================================
   GOTHAM RUNNER — Chrome dinozor oyununun birebir mekaniği,
   tamamen Batman evrenine uyarlanmış hali.

   Dinozor      -> Joker (koşan karakter)
   Kaktüs       -> Gotham gargoyle heykelleri (küçük/büyük, 1-3'lü gruplar)
   Pterodaktil  -> Süzülen Batman (3 farklı yükseklikte)
   Bulutlar     -> Gotham sisi
   Gündüz/Gece  -> Alacakaranlık / gece + ay + bat-signal
   Zıpla: SPACE veya ↑ (ya da dokun)   Eğil: ↓
   ============================================================ */

const W = 900;          // mantıksal genişlik
const H = 260;          // mantıksal yükseklik
const GROUND_Y = 202;   // zemin çizgisi

const HI_KEY = "gotham-runner-hi";

/* --- Dino oyunuyla aynı fizik sabitleri --- */
const GRAVITY = 0.62;
const JUMP_V = -11.2;
const DUCK_GRAVITY = 1.9;     // eğilirken hızlı düşüş
const START_SPEED = 6;
const MAX_SPEED = 13.5;
const ACCEL = 0.001;          // dino ile aynı: her karede hıza eklenen değer
const SCORE_COEF = 0.025;     // dino ile aynı puanlama katsayısı
const NIGHT_EVERY = 700;      // her 700 puanda gündüz/gece değişimi
const CLEAR_TIME = 3000;      // başta engelsiz mesafe (ms)

export function renderBatmanGame(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Gotham Runner</h1>
        <div class="page-subtitle">
          Joker kaçıyor, Batman peşinde. <strong>SPACE</strong> / <strong>↑</strong> zıpla &middot;
          <strong>↓</strong> eğil &middot; mobilde ekrana dokun.
        </div>
      </div>
      <div class="page-actions">
        <button id="game-sound-btn" class="btn btn-ghost" type="button">🔊 Ses Açık</button>
        <button id="game-restart-btn" class="btn btn-primary" type="button">Yeniden Başlat</button>
      </div>
    </div>

    <div class="card game-card">
      <div class="game-stage">
        <canvas id="gotham-runner" width="${W}" height="${H}" aria-label="Gotham Runner oyunu"></canvas>

        <div id="game-overlay" class="game-overlay is-visible">
          <div class="game-overlay-emblem"></div>
          <div class="game-overlay-title">Gotham Runner</div>
          <div class="game-overlay-text">Başlamak için <strong>SPACE</strong>'e bas ya da ekrana dokun</div>
        </div>
      </div>

      <div class="game-hud">
        <div class="game-hud-item"><span class="game-hud-label">Puan</span><span id="game-score">0</span></div>
        <div class="game-hud-item"><span class="game-hud-label">Rekor</span><span id="game-hi">0</span></div>
        <div class="game-hud-item"><span class="game-hud-label">Hız</span><span id="game-speed">1.0x</span></div>
      </div>
    </div>
  `;

  startGame(container);
}

/* ============================================================
   OYUN
   ============================================================ */
function startGame(root) {
  const canvas = root.querySelector("#gotham-runner");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const overlayEl = root.querySelector("#game-overlay");
  const scoreEl = root.querySelector("#game-score");
  const hiEl = root.querySelector("#game-hi");
  const speedEl = root.querySelector("#game-speed");
  const soundBtn = root.querySelector("#game-sound-btn");
  const restartBtn = root.querySelector("#game-restart-btn");

  /* --- Retina ölçekleme --- */
  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }
  fitCanvas();

  /* --- Durum --- */
  let hiScore = readHiScore();
  hiEl.textContent = pad(hiScore);

  let state, sound = true, audioCtx = null, rafId = null, alive = true;

  function newState() {
    return {
      phase: "ready",           // ready | running | over
      t: 0,
      speed: START_SPEED,
      distance: 0,
      score: 0,
      obstacles: [],
      clouds: seedClouds(),
      bumps: seedBumps(),
      stars: seedStars(),
      nextSpawnAt: 600,
      night: 0,                 // 0 = alacakaranlık, 1 = gece
      nightTarget: 0,
      nextNightAt: NIGHT_EVERY,
      moonPhase: 0,
      flashUntil: 0,            // çarpışma flaşı
      joker: {
        x: 70,
        y: GROUND_Y,
        vy: 0,
        jumping: false,
        ducking: false,
        frame: 0,
      },
    };
  }
  state = newState();

  /* ---------- Girdi ---------- */
  function jump() {
    const j = state.joker;
    if (state.phase === "ready") {
      state.phase = "running";
      overlayEl.classList.remove("is-visible");
    }
    if (state.phase === "over") return;
    if (!j.jumping) {
      j.jumping = true;
      j.ducking = false;
      j.vy = JUMP_V;
      beep(620, 0.07);
    }
  }

  function duck(on) {
    if (state.phase !== "running") return;
    const j = state.joker;
    j.ducking = on;
    if (on && j.jumping) j.vy += DUCK_GRAVITY * 3; // havadayken hızlı in
  }

  function restart() {
    const keepHi = hiScore;
    state = newState();
    state.phase = "running";
    hiScore = keepHi;
    overlayEl.classList.remove("is-visible");
    overlayEl.innerHTML = "";
  }

  function onKeyDown(e) {
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.code === "Space" || e.code === "ArrowUp" || e.key === " " || e.key === "ArrowUp") {
      e.preventDefault();
      if (state.phase === "over") restart();
      else jump();
    } else if (e.code === "ArrowDown" || e.key === "ArrowDown") {
      e.preventDefault();
      duck(true);
    }
  }

  function onKeyUp(e) {
    if (e.code === "ArrowDown" || e.key === "ArrowDown") duck(false);
  }

  function onPointerDown(e) {
    e.preventDefault();
    if (state.phase === "over") restart();
    else jump();
  }

  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointerdown", onPointerDown);
  overlayEl.addEventListener("pointerdown", onPointerDown);
  restartBtn.addEventListener("click", restart);
  soundBtn.addEventListener("click", () => {
    sound = !sound;
    soundBtn.textContent = sound ? "🔊 Ses Açık" : "🔇 Ses Kapalı";
  });

  /* ---------- Ses ---------- */
  function beep(freq, dur, type = "square") {
    if (!sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (_) { /* ses desteklenmiyorsa sessizce geç */ }
  }

  /* ---------- Ana döngü ---------- */
  let last = performance.now();

  function loop(now) {
    // Görünüm değiştiyse (router innerHTML'i temizlediyse) kendini kapat
    if (!canvas.isConnected) { teardown(); return; }

    const dt = Math.min((now - last) / (1000 / 60), 3); // 60fps normalize
    last = now;

    update(dt, now);
    draw(now);

    rafId = requestAnimationFrame(loop);
  }

  function update(dt, now) {
    const s = state;
    const j = s.joker;

    if (s.phase === "running") {
      s.t += dt * (1000 / 60);
      s.speed = Math.min(MAX_SPEED, s.speed + ACCEL * dt);
      s.distance += s.speed * dt;

      const prevScore = s.score;
      s.score = Math.floor(s.distance * SCORE_COEF);
      if (Math.floor(prevScore / 100) !== Math.floor(s.score / 100) && s.score > 0) {
        beep(920, 0.09, "sine"); // her 100 puanda dino gibi bip
      }

      /* Gündüz / gece döngüsü */
      if (s.score >= s.nextNightAt) {
        s.nightTarget = s.nightTarget === 0 ? 1 : 0;
        s.nextNightAt += NIGHT_EVERY;
        if (s.nightTarget === 1) s.moonPhase = (s.moonPhase + 1) % 7;
      }
      s.night += (s.nightTarget - s.night) * 0.02 * dt;

      /* Engel üretimi */
      if (s.t > CLEAR_TIME && s.distance > s.nextSpawnAt) {
        s.obstacles.push(makeObstacle(s.speed, s.score));
        const gap = 320 + Math.random() * 260 + (MAX_SPEED - s.speed) * 22;
        s.nextSpawnAt = s.distance + gap;
      }
    }

    /* Joker fiziği */
    if (s.phase !== "over") {
      j.frame += dt * (s.phase === "running" ? s.speed * 0.55 : 0.9);
      if (j.jumping) {
        j.vy += (j.ducking ? DUCK_GRAVITY : GRAVITY) * dt;
        j.y += j.vy * dt;
        if (j.y >= GROUND_Y) {
          j.y = GROUND_Y;
          j.vy = 0;
          j.jumping = false;
        }
      }
    }

    /* Engeller & çarpışma */
    for (let i = s.obstacles.length - 1; i >= 0; i--) {
      const o = s.obstacles[i];
      o.x -= s.speed * dt * (o.type === "batman" ? 1.28 : 1);
      o.frame += dt * 0.22;
      if (o.x + o.w < -60) s.obstacles.splice(i, 1);
      else if (s.phase === "running" && hits(jokerBox(j), obstacleBox(o))) {
        gameOver(now);
      }
    }

    /* Arka plan */
    const bgSpeed = s.phase === "running" ? s.speed : 0;
    s.clouds.forEach((c) => {
      c.x -= bgSpeed * c.z * 0.14 * dt;
      if (c.x < -c.w) { c.x = W + Math.random() * 220; c.y = 24 + Math.random() * 70; }
    });
    s.bumps.forEach((b) => {
      b.x -= bgSpeed * dt;
      if (b.x < -20) b.x += W + 40;
    });

    /* HUD */
    scoreEl.textContent = pad(s.score);
    hiEl.textContent = pad(hiScore);
    speedEl.textContent = (s.speed / START_SPEED).toFixed(1) + "x";
  }

  function gameOver(now) {
    const s = state;
    s.phase = "over";
    s.flashUntil = now + 140;
    beep(200, 0.28, "sawtooth");
    setTimeout(() => beep(120, 0.35, "sawtooth"), 130);

    if (s.score > hiScore) {
      hiScore = s.score;
      writeHiScore(hiScore);
    }

    overlayEl.innerHTML = `
      <div class="game-overlay-emblem"></div>
      <div class="game-overlay-title game-over-title">Yakalandın</div>
      <div class="game-overlay-score">${pad(s.score)} <span>puan</span></div>
      <div class="game-overlay-text">
        ${s.score >= hiScore && s.score > 0 ? "Yeni rekor! " : ""}
        <strong>SPACE</strong>'e bas ya da ekrana dokun
      </div>
    `;
    overlayEl.classList.add("is-visible");
  }

  /* ---------- Çizim ---------- */
  function draw(now) {
    const s = state;
    const n = clamp(s.night, 0, 1);

    /* Gökyüzü */
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, mix("#1b2338", "#04060c", n));
    sky.addColorStop(0.55, mix("#2a2036", "#080c16", n));
    sky.addColorStop(1, mix("#3a2a2a", "#0d1220", n));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    drawStars(n);
    drawMoon(n);
    drawSignal(n);
    drawSkyline(n);
    s.clouds.forEach((c) => drawFog(c, n));
    drawGround(n);

    s.obstacles.forEach((o) => {
      if (o.type === "batman") drawBatman(o);
      else drawGargoyle(o);
    });

    drawJoker(s.joker, s.phase);

    /* Çarpışma flaşı */
    if (now < s.flashUntil) {
      ctx.fillStyle = "rgba(255,210,63,0.35)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawStars(n) {
    if (n < 0.05) return;
    ctx.save();
    ctx.globalAlpha = n * 0.9;
    state.stars.forEach((st) => {
      ctx.fillStyle = "#dfe7ff";
      ctx.globalAlpha = n * (0.35 + 0.45 * Math.abs(Math.sin(state.t / 700 + st.p)));
      ctx.fillRect(st.x, st.y, st.s, st.s);
    });
    ctx.restore();
  }

  function drawMoon(n) {
    if (n < 0.08) return;
    const x = 760, y = 52, r = 17;
    ctx.save();
    ctx.globalAlpha = n;
    ctx.fillStyle = "#f3ecd0";
    ctx.shadowColor = "rgba(243,236,208,0.55)";
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // faz (dino oyunundaki ay fazları gibi)
    const ph = state.moonPhase;
    if (ph !== 3) {
      ctx.fillStyle = mix("#1b2338", "#04060c", n);
      ctx.beginPath();
      ctx.arc(x + (ph - 3) * 7, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* Uzaktaki bat-signal */
  function drawSignal(n) {
    if (n < 0.25) return;
    ctx.save();
    ctx.globalAlpha = (n - 0.25) * 0.9;
    const g = ctx.createLinearGradient(120, 175, 90, 20);
    g.addColorStop(0, "rgba(255,210,63,0.30)");
    g.addColorStop(1, "rgba(255,210,63,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(118, 176);
    ctx.lineTo(132, 176);
    ctx.lineTo(178, 18);
    ctx.lineTo(58, 18);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = (n - 0.25) * 1.1;
    ctx.fillStyle = "rgba(255,226,122,0.85)";
    ctx.beginPath();
    ctx.arc(118, 34, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(4,6,12,0.85)";
    batPath(ctx, 106, 28, 24);
    ctx.fill();
    ctx.restore();
  }

  /* Gotham silüeti */
  function drawSkyline(n) {
    const base = GROUND_Y - 2;
    ctx.save();
    ctx.fillStyle = mix("#141a29", "#070b14", n);
    const towers = [
      [-10, 62, 46], [40, 96, 34], [80, 44, 52], [136, 120, 40], [182, 70, 30],
      [216, 104, 44], [266, 52, 36], [306, 88, 48], [360, 128, 34], [400, 60, 42],
      [448, 96, 30], [484, 46, 50], [540, 112, 38], [584, 72, 44], [634, 100, 34],
      [674, 54, 46], [726, 86, 40], [772, 118, 36], [814, 64, 48], [868, 92, 44],
    ];
    towers.forEach(([x, h, w], i) => {
      ctx.fillRect(x, base - h, w, h);
      // çatı sivrisi
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(x + w / 2 - 5, base - h);
        ctx.lineTo(x + w / 2, base - h - 16);
        ctx.lineTo(x + w / 2 + 5, base - h);
        ctx.closePath();
        ctx.fill();
      }
    });
    // pencere ışıkları
    ctx.fillStyle = `rgba(255,210,63,${0.10 + 0.28 * n})`;
    towers.forEach(([x, h, w], i) => {
      for (let wy = base - h + 8; wy < base - 6; wy += 11) {
        for (let wx = x + 5; wx < x + w - 5; wx += 9) {
          if ((wx * 7 + wy * 13 + i * 31) % 5 < 2) ctx.fillRect(wx, wy, 3, 4);
        }
      }
    });
    ctx.restore();
  }

  function drawFog(c, n) {
    ctx.save();
    ctx.globalAlpha = 0.14 + 0.1 * (1 - n);
    ctx.fillStyle = mix("#8fa0c0", "#3c4664", n);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w, c.w * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x + c.w * 0.55, c.y + 4, c.w * 0.65, c.w * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGround(n) {
    /* asfalt */
    ctx.fillStyle = mix("#20283c", "#0b1120", n);
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    /* zemin çizgisi */
    ctx.strokeStyle = mix("#5d6a8c", "#39435f", n);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 1);
    ctx.lineTo(W, GROUND_Y + 1);
    ctx.stroke();

    /* çatlaklar / çakıl (dino oyunundaki zemin dokusu) */
    ctx.fillStyle = mix("#48536f", "#2a3350", n);
    state.bumps.forEach((b) => ctx.fillRect(b.x, GROUND_Y + 5 + b.o, b.w, 2));

    /* sarı yol şeridi */
    ctx.fillStyle = `rgba(255,210,63,${0.18 + 0.12 * n})`;
    const off = -(state.distance % 60);
    for (let x = off; x < W; x += 60) ctx.fillRect(x, GROUND_Y + 26, 26, 2);
  }

  /* ---------- Joker (dinozorun yerine) ---------- */
  function drawJoker(j, phase) {
    const duck = j.ducking && !j.jumping;
    const run = Math.floor(j.frame) % 2 === 0;
    ctx.save();
    ctx.translate(j.x, j.y);

    const dead = phase === "over";

    if (duck) {
      /* --- Eğilmiş Joker --- */
      // mor palto
      ctx.fillStyle = "#6b2fa0";
      roundRect(ctx, 0, -30, 64, 30, 6); ctx.fill();
      // yeşil yelek
      ctx.fillStyle = "#2fbf6b";
      roundRect(ctx, 10, -26, 30, 20, 4); ctx.fill();
      // baş (öne uzanmış)
      ctx.fillStyle = "#f2ead9";
      ctx.beginPath(); ctx.arc(56, -22, 11, 0, Math.PI * 2); ctx.fill();
      // yeşil saç
      ctx.fillStyle = "#3ddc84";
      ctx.beginPath(); ctx.arc(46, -27, 10, Math.PI * 0.6, Math.PI * 1.9); ctx.fill();
      // sırıtış
      ctx.strokeStyle = "#c8102e"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(58, -21, 5, 0.15, Math.PI - 0.15); ctx.stroke();
      // bacaklar
      ctx.fillStyle = "#3a1a5e";
      ctx.fillRect(run ? 6 : 16, -6, 9, 6);
      ctx.fillRect(run ? 30 : 22, -6, 9, 6);
      ctx.restore();
      return;
    }

    /* --- Ayakta / zıplayan Joker --- */
    // bacaklar
    ctx.fillStyle = "#3a1a5e";
    if (j.jumping) {
      ctx.fillRect(8, -18, 10, 18);
      ctx.fillRect(24, -14, 10, 14);
    } else if (run) {
      ctx.fillRect(6, -18, 10, 18);
      ctx.fillRect(26, -12, 10, 12);
    } else {
      ctx.fillRect(10, -12, 10, 12);
      ctx.fillRect(24, -18, 10, 18);
    }
    // ayakkabı
    ctx.fillStyle = "#241038";
    ctx.fillRect(4, -4, 16, 4);
    ctx.fillRect(24, -4, 16, 4);

    // mor palto
    ctx.fillStyle = "#6b2fa0";
    roundRect(ctx, 4, -46, 36, 30, 5); ctx.fill();
    // palto etekleri
    ctx.beginPath();
    ctx.moveTo(4, -20); ctx.lineTo(-4, -8); ctx.lineTo(10, -16); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(40, -20); ctx.lineTo(48, -8); ctx.lineTo(34, -16); ctx.closePath(); ctx.fill();

    // yeşil yelek + turuncu gömlek
    ctx.fillStyle = "#2fbf6b";
    roundRect(ctx, 12, -43, 20, 22, 3); ctx.fill();
    ctx.fillStyle = "#e0762a";
    ctx.fillRect(19, -43, 6, 16);

    // kollar
    ctx.fillStyle = "#6b2fa0";
    if (j.jumping) { ctx.fillRect(-2, -46, 8, 16); ctx.fillRect(38, -50, 8, 18); }
    else if (run)  { ctx.fillRect(0, -42, 8, 16); ctx.fillRect(36, -38, 8, 16); }
    else           { ctx.fillRect(0, -38, 8, 16); ctx.fillRect(36, -42, 8, 16); }

    // baş
    ctx.fillStyle = "#f2ead9";
    ctx.beginPath(); ctx.arc(22, -58, 12, 0, Math.PI * 2); ctx.fill();

    // yeşil dağınık saç
    ctx.fillStyle = "#3ddc84";
    ctx.beginPath(); ctx.arc(22, -62, 12.5, Math.PI * 1.05, Math.PI * 2.05); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -60); ctx.lineTo(0, -70); ctx.lineTo(12, -66); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(34, -60); ctx.lineTo(44, -70); ctx.lineTo(32, -66); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, -72); ctx.lineTo(24, -82); ctx.lineTo(28, -71); ctx.closePath(); ctx.fill();

    // gözler
    ctx.fillStyle = "#141018";
    if (dead) {
      ctx.lineWidth = 2; ctx.strokeStyle = "#141018";
      ctx.beginPath(); ctx.moveTo(15, -62); ctx.lineTo(21, -56); ctx.moveTo(21, -62); ctx.lineTo(15, -56);
      ctx.moveTo(25, -62); ctx.lineTo(31, -56); ctx.moveTo(31, -62); ctx.lineTo(25, -56); ctx.stroke();
    } else {
      ctx.fillRect(16, -62, 3, 5);
      ctx.fillRect(26, -62, 3, 5);
    }

    // kırmızı sırıtış
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(22, -55, 7, dead ? Math.PI : 0.15, dead ? Math.PI * 2 : Math.PI - 0.15);
    ctx.stroke();

    ctx.restore();
  }

  /* ---------- Gargoyle (kaktüsün yerine) ---------- */
  function drawGargoyle(o) {
    ctx.save();
    ctx.translate(o.x, GROUND_Y);
    for (let i = 0; i < o.count; i++) {
      const gx = i * (o.unit + 6);
      const h = o.gh;
      const w = o.gw;

      // taş gövde
      const g = ctx.createLinearGradient(gx, -h, gx, 0);
      g.addColorStop(0, "#5a6377");
      g.addColorStop(1, "#2b3242");
      ctx.fillStyle = g;

      // kaide
      ctx.fillRect(gx - 3, -8, w + 6, 8);
      // oturan gövde
      roundRect(ctx, gx + w * 0.16, -h * 0.62, w * 0.68, h * 0.62, 4); ctx.fill();
      // baş
      ctx.beginPath();
      ctx.arc(gx + w * 0.5, -h * 0.72, w * 0.24, 0, Math.PI * 2);
      ctx.fill();
      // boynuzlar
      ctx.beginPath();
      ctx.moveTo(gx + w * 0.34, -h * 0.82); ctx.lineTo(gx + w * 0.28, -h * 0.98); ctx.lineTo(gx + w * 0.44, -h * 0.86); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(gx + w * 0.66, -h * 0.82); ctx.lineTo(gx + w * 0.72, -h * 0.98); ctx.lineTo(gx + w * 0.56, -h * 0.86); ctx.closePath(); ctx.fill();
      // katlanmış kanatlar
      ctx.beginPath();
      ctx.moveTo(gx + w * 0.14, -h * 0.60);
      ctx.lineTo(gx - w * 0.12, -h * 0.86);
      ctx.lineTo(gx + w * 0.06, -h * 0.20);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(gx + w * 0.86, -h * 0.60);
      ctx.lineTo(gx + w * 1.12, -h * 0.86);
      ctx.lineTo(gx + w * 0.94, -h * 0.20);
      ctx.closePath(); ctx.fill();

      // parlayan kırmızı gözler
      ctx.fillStyle = "#ff2f45";
      ctx.shadowColor = "rgba(255,47,69,0.9)";
      ctx.shadowBlur = 8;
      ctx.fillRect(gx + w * 0.38, -h * 0.75, 3, 3);
      ctx.fillRect(gx + w * 0.56, -h * 0.75, 3, 3);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  /* ---------- Süzülen Batman (pterodaktilin yerine) ---------- */
  function drawBatman(o) {
    const flap = Math.floor(o.frame) % 2 === 0;
    ctx.save();
    ctx.translate(o.x, o.y);

    // pelerin
    ctx.fillStyle = "#0b0f1c";
    ctx.beginPath();
    if (flap) {
      ctx.moveTo(30, 4);
      ctx.quadraticCurveTo(4, -16, -18, -6);
      ctx.quadraticCurveTo(2, 6, 6, 18);
      ctx.quadraticCurveTo(30, 22, 30, 4);
      ctx.moveTo(30, 4);
      ctx.quadraticCurveTo(56, -16, 78, -6);
      ctx.quadraticCurveTo(58, 6, 54, 18);
      ctx.quadraticCurveTo(30, 22, 30, 4);
    } else {
      ctx.moveTo(30, 4);
      ctx.quadraticCurveTo(6, 6, -16, 16);
      ctx.quadraticCurveTo(6, 16, 8, 24);
      ctx.quadraticCurveTo(30, 24, 30, 4);
      ctx.moveTo(30, 4);
      ctx.quadraticCurveTo(54, 6, 76, 16);
      ctx.quadraticCurveTo(54, 16, 52, 24);
      ctx.quadraticCurveTo(30, 24, 30, 4);
    }
    ctx.fill();

    // gövde
    ctx.fillStyle = "#171d2c";
    roundRect(ctx, 22, 0, 16, 24, 4); ctx.fill();

    // sarı amblem
    ctx.fillStyle = "#ffd23f";
    batPath(ctx, 24, 7, 12);
    ctx.fill();

    // başlık + kulaklar
    ctx.fillStyle = "#0b0f1c";
    ctx.beginPath(); ctx.arc(30, -2, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(24, -6); ctx.lineTo(22, -16); ctx.lineTo(29, -7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(36, -6); ctx.lineTo(38, -16); ctx.lineTo(31, -7); ctx.closePath(); ctx.fill();

    // parlayan beyaz gözler
    ctx.fillStyle = "#eaf2ff";
    ctx.shadowColor = "rgba(234,242,255,0.9)";
    ctx.shadowBlur = 7;
    ctx.fillRect(25, -3, 4, 2.5);
    ctx.fillRect(33, -3, 4, 2.5);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  /* ---------- Temizlik ---------- */
  function teardown() {
    if (!alive) return;
    alive = false;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("pointerdown", onPointerDown);
    if (audioCtx && audioCtx.close) audioCtx.close().catch(() => {});
  }

  rafId = requestAnimationFrame(loop);
}

/* ============================================================
   YARDIMCILAR
   ============================================================ */
function makeObstacle(speed, score) {
  // Batman ancak 400 puandan sonra (dino'da pterodaktil gibi) gelir
  const canFly = score > 400 && Math.random() < 0.28;

  if (canFly) {
    // Üstteki ikisinin altından eğilerek geçilir, en alttakinin üstünden zıplanır
    const heights = [GROUND_Y - 80, GROUND_Y - 56, GROUND_Y - 26];
    return {
      type: "batman",
      x: W + 40,
      y: heights[Math.floor(Math.random() * heights.length)],
      w: 62,
      h: 30,
      frame: 0,
    };
  }

  const big = Math.random() < 0.45;
  const count = big
    ? 1 + Math.floor(Math.random() * 2)
    : 1 + Math.floor(Math.random() * 3);
  const gw = big ? 34 : 24;
  const gh = big ? 66 : 44;
  const unit = gw + (big ? 8 : 4);

  return {
    type: "gargoyle",
    x: W + 30,
    y: GROUND_Y,
    gw, gh, count, unit,
    w: count * unit,
    h: gh,
    frame: 0,
  };
}

function jokerBox(j) {
  if (j.ducking && !j.jumping) return { x: j.x + 4, y: j.y - 28, w: 56, h: 26 };
  return { x: j.x + 6, y: j.y - 66, w: 34, h: 66 };
}

function obstacleBox(o) {
  if (o.type === "batman") return { x: o.x + 6, y: o.y - 8, w: 58, h: 30 };
  return { x: o.x + 3, y: o.y - o.gh, w: o.w - 8, h: o.gh - 4 };
}

function hits(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function seedClouds() {
  return Array.from({ length: 5 }, () => ({
    x: Math.random() * W,
    y: 22 + Math.random() * 70,
    w: 26 + Math.random() * 34,
    z: 0.5 + Math.random(),
  }));
}

function seedBumps() {
  return Array.from({ length: 42 }, () => ({
    x: Math.random() * W,
    w: 4 + Math.random() * 16,
    o: Math.random() * 22,
  }));
}

function seedStars() {
  return Array.from({ length: 46 }, () => ({
    x: Math.random() * W,
    y: Math.random() * 130,
    s: Math.random() < 0.8 ? 1.5 : 2.5,
    p: Math.random() * 6,
  }));
}

/* Yarasa amblemi yolu (yeniden kullanılabilir) */
function batPath(ctx, x, y, w) {
  const s = w / 200;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(100, 10);
  ctx.bezierCurveTo(96, 10, 93, 14, 92, 20);
  ctx.bezierCurveTo(84, 10, 68, 4, 52, 6);
  ctx.bezierCurveTo(56, 12, 56, 18, 52, 22);
  ctx.bezierCurveTo(40, 14, 20, 14, 8, 24);
  ctx.bezierCurveTo(22, 24, 30, 32, 30, 42);
  ctx.bezierCurveTo(30, 48, 28, 52, 24, 56);
  ctx.bezierCurveTo(36, 52, 48, 54, 56, 62);
  ctx.bezierCurveTo(60, 54, 68, 50, 76, 52);
  ctx.lineTo(70, 64);
  ctx.lineTo(82, 58);
  ctx.lineTo(88, 68);
  ctx.lineTo(94, 58);
  ctx.lineTo(106, 64);
  ctx.lineTo(100, 52);
  ctx.bezierCurveTo(108, 50, 116, 54, 120, 62);
  ctx.bezierCurveTo(128, 54, 140, 52, 152, 56);
  ctx.bezierCurveTo(148, 52, 146, 48, 146, 42);
  ctx.bezierCurveTo(146, 32, 154, 24, 168, 24);
  ctx.bezierCurveTo(156, 14, 136, 14, 124, 22);
  ctx.bezierCurveTo(120, 18, 120, 12, 124, 6);
  ctx.bezierCurveTo(108, 4, 92, 10, 84, 20);
  ctx.bezierCurveTo(83, 14, 80, 10, 76, 10);
  ctx.closePath();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * clamp(t, 0, 1)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function pad(n) { return String(n).padStart(5, "0"); }

function readHiScore() {
  try { return parseInt(localStorage.getItem(HI_KEY) || "0", 10) || 0; }
  catch (_) { return 0; }
}

function writeHiScore(v) {
  try { localStorage.setItem(HI_KEY, String(v)); } catch (_) { /* yoksay */ }
}
