(function () {
  "use strict";


  /* =========================================================
     Settings
     Read from the "EDIT HERE" block in index.html.
     Any broken value falls back to a safe default.
     ========================================================= */

  const DEFAULTS = {
    question: "Do you trust me?",
    threat: "",
    sadNo: "",
    sadDis: "",
    wish: "",
    wish2: "",
    callText: "Call me",
    phone: "",
    rainOpacity: 0.55,
    screenDim: 0.9,
    dodgeNo: true
  };

  let raw = {};

  try {
    raw = JSON.parse(document.getElementById("config").textContent) || {};
  } catch (error) {
    raw = {};
  }

  const CONFIG = {};

  Object.keys(DEFAULTS).forEach(function (key) {
    const fallback = DEFAULTS[key];
    const value = raw[key];

    CONFIG[key] = (typeof value === typeof fallback) ? value : fallback;
  });

  // keep only digits and "+" in the phone number
  CONFIG.phone = String(CONFIG.phone).replace(/[^\d+]/g, "").slice(0, 20);

  function clamp01(n) {
    return Math.min(1, Math.max(0, Number(n) || 0));
  }

  document.documentElement.style.setProperty("--rain-op", String(clamp01(CONFIG.rainOpacity)));
  document.documentElement.style.setProperty("--dim", String(clamp01(CONFIG.screenDim)));



  /* =========================================================
     Sound: chiptune "Happy Birthday"
     The melody is public domain (a US court invalidated the
     last copyright claim in 2015, settled in 2016).
     ========================================================= */

  const TEMPO = 116;
  const BEAT = 60 / TEMPO;

  const NOTE = {
    C4: 261.63,
    D4: 293.66,
    E4: 329.63,
    F4: 349.23,
    G4: 392.00,
    A4: 440.00,
    Bb4: 466.16,
    C5: 523.25
  };

  // [frequency, length in beats]
  const MELODY = [
    [NOTE.C4, 0.5], [NOTE.C4, 0.5], [NOTE.D4, 1], [NOTE.C4, 1], [NOTE.F4, 1], [NOTE.E4, 2],
    [NOTE.C4, 0.5], [NOTE.C4, 0.5], [NOTE.D4, 1], [NOTE.C4, 1], [NOTE.G4, 1], [NOTE.F4, 2],
    [NOTE.C4, 0.5], [NOTE.C4, 0.5], [NOTE.C5, 1], [NOTE.A4, 1], [NOTE.F4, 1], [NOTE.E4, 1], [NOTE.D4, 2],
    [NOTE.Bb4, 0.5], [NOTE.Bb4, 0.5], [NOTE.A4, 1], [NOTE.F4, 1], [NOTE.G4, 1], [NOTE.F4, 3]
  ];

  // [frequency, start beat, length in beats]
  const BASS = [
    [NOTE.F4 / 2, 0, 3],
    [NOTE.C4 / 2, 6, 3],
    [NOTE.F4 / 2, 12, 3],
    [NOTE.Bb4 / 2, 19, 3],
    [NOTE.C4 / 2, 22, 2]
  ];

  // song length in beats, plus a short pause before it repeats
  const LOOP = MELODY.reduce(function (total, note) { return total + note[1]; }, 0) + 2;

  let audio = null;
  let master = null;
  let songTimer = null;
  let playing = false;
  let muted = false;


  function setupAudio() {
    if (audio) return;

    audio = new (window.AudioContext || window.webkitAudioContext)();

    master = audio.createGain();
    master.gain.value = 0.0001;

    const lowpass = audio.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 5200;

    master.connect(lowpass);
    lowpass.connect(audio.destination);

    master.gain.exponentialRampToValueAtTime(0.45, audio.currentTime + 0.6);
  }


  function wakeAudio() {
    setupAudio();

    if (audio.state === "suspended") {
      audio.resume();
    }
  }


  // play one short note
  function blip(freq, at, beats, wave, volume) {
    const length = Math.max(beats * BEAT * 0.86, 0.09);
    const peak = volume || 0.16;

    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = wave || "square";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
    gain.gain.setValueAtTime(peak, at + length * 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);

    osc.connect(gain);
    gain.connect(master);

    osc.start(at);
    osc.stop(at + length + 0.03);
  }


  // queue the whole song once, then again when it ends
  function playSongOnce() {
    const start = audio.currentTime + 0.12;
    let time = start;

    MELODY.forEach(function (note) {
      blip(note[0], time, note[1], "square", 0.17);
      time += note[1] * BEAT;
    });

    BASS.forEach(function (note) {
      blip(note[0], start + note[1] * BEAT, note[2], "triangle", 0.13);
    });

    songTimer = setTimeout(function () {
      if (playing) playSongOnce();
    }, LOOP * BEAT * 1000);
  }


  function musicOn() {
    wakeAudio();

    // bring the volume back up — musicOff() fades it to near silent
    const now = audio.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.45, now + 0.4);

    clearTimeout(songTimer);
    playing = true;
    playSongOnce();
  }


  function musicOff() {
    playing = false;
    clearTimeout(songTimer);

    if (master) {
      master.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.3);
    }
  }


  // small sound effects
  function sfx(kind) {
    if (muted) return;

    wakeAudio();

    // the volume was faded by a replay — restore it
    if (!playing && master.gain.value < 0.1) {
      master.gain.cancelScheduledValues(audio.currentTime);
      master.gain.setValueAtTime(0.45, audio.currentTime);
    }

    const t = audio.currentTime;

    if (kind === "click") {
      blip(880, t, 0.18, "square", 0.06);
    }

    if (kind === "deny") {
      blip(180, t, 0.5, "sawtooth", 0.1);
      blip(120, t + 0.1, 0.7, "sawtooth", 0.09);
    }

    if (kind === "alarm") {
      [0, 0.16, 0.32].forEach(function (delay) {
        blip(660, t + delay, 0.3, "square", 0.08);
      });
    }
  }



  /* =========================================================
     Typing effect
     ========================================================= */

  function type(element, text, speed, done) {
    const letters = Array.from(text);
    let i = 0;

    element.textContent = "";

    (function step() {
      if (i <= letters.length) {
        element.textContent = letters.slice(0, i).join("");
        i++;
        setTimeout(step, speed);
      } else if (done) {
        done();
      }
    })();
  }



  /* =========================================================
     Screens
     ========================================================= */

  const SCREENS = {
    trust: document.getElementById("s-trust"),
    hack: document.getElementById("s-hack"),
    run: document.getElementById("s-run"),
    party: document.getElementById("s-party")
  };

  function show(name) {
    Object.values(SCREENS).forEach(function (screen) {
      screen.classList.add("hidden");
    });

    SCREENS[name].classList.remove("hidden");
  }



  /* =========================================================
     Popup message
     ========================================================= */

  const veil = document.getElementById("veil");
  const retryBtn = document.getElementById("retryBtn");

  let retryTarget = "trust";

  function sad(message, goBackTo, title) {
    document.getElementById("boxMsg").textContent = message;
    document.getElementById("boxTitle").textContent = title || "error";

    retryTarget = goBackTo;

    veil.classList.add("show");
    retryBtn.focus();
    sfx("deny");
  }

  retryBtn.addEventListener("click", function () {
    veil.classList.remove("show");
    sfx("click");

    if (retryTarget === "trust") {
      startTrust();
    } else {
      startHack();
    }
  });



  /* =========================================================
     Buttons
     ========================================================= */

  const yesBtn = document.getElementById("yesBtn");
  const noBtn = document.getElementById("noBtn");
  const agreeBtn = document.getElementById("agreeBtn");
  const disagreeBtn = document.getElementById("disagreeBtn");



  /* =========================================================
     NO and DISAGREE run away
     After the first click, when the pointer gets close they
     hide, then pop up at a random spot anywhere on the page —
     never on top of YES / AGREE and never near the pointer.
     ========================================================= */

  const RUNNERS = [
    { button: noBtn, avoid: yesBtn },
    { button: disagreeBtn, avoid: agreeBtn }
  ];

  const NEAR = 28;   // how close (px) the pointer can get before it runs
  const PAD = 16;    // keep this far (px) from the screen edges

  // a button starts running only after it has been clicked once
  const armed = new Set();


  function resetRunner(button) {
    button.classList.remove("hide");
    button.style.transform = "";
  }


  function overlaps(a, b, margin) {
    return a.left < b.right + margin &&
           a.right > b.left - margin &&
           a.top < b.bottom + margin &&
           a.bottom > b.top - margin;
  }


  function canRun(button) {
    return CONFIG.dodgeNo &&
           armed.has(button) &&
           button.offsetParent !== null &&                       // its screen is visible
           !button.classList.contains("hide") &&                 // not already jumping
           button.parentElement.classList.contains("show") &&    // buttons have appeared
           !veil.classList.contains("show");                     // no popup open
  }


  function runAway(runner, pointerX, pointerY) {
    const button = runner.button;

    if (!canRun(button)) return;

    const current = button.getBoundingClientRect();

    // where the button sits with no offset
    const savedOffset = button.style.transform;
    button.style.transform = "";
    const home = button.getBoundingClientRect();
    button.style.transform = savedOffset;

    const width = home.width;
    const height = home.height;
    const maxX = Math.max(PAD, innerWidth - width - PAD);
    const maxY = Math.max(PAD, innerHeight - height - PAD);
    const avoid = runner.avoid.getBoundingClientRect();
    const farEnough = Math.min(innerWidth, innerHeight) * 0.35;

    // try random spots until one is far from the pointer and clear of the other button
    let x = PAD;
    let y = PAD;

    for (let attempt = 0; attempt < 80; attempt++) {
      x = PAD + Math.random() * (maxX - PAD);
      y = PAD + Math.random() * (maxY - PAD);

      const spot = { left: x, top: y, right: x + width, bottom: y + height };
      const distance = Math.hypot(x + width / 2 - pointerX, y + height / 2 - pointerY);

      if (distance > farEnough && !overlaps(spot, avoid, 24) && !overlaps(spot, current, 0)) {
        break;
      }
    }

    // vanish from under the pointer...
    button.classList.add("hide");

    // ...and pop up somewhere else
    setTimeout(function () {
      const dx = Math.round(x - home.left);
      const dy = Math.round(y - home.top);

      button.style.transform = "translate(" + dx + "px, " + dy + "px)";
      button.classList.remove("hide");
    }, 200);
  }


  // mouse / pen: run as soon as the pointer comes close
  document.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch") return;

    RUNNERS.forEach(function (runner) {
      if (!canRun(runner.button)) return;

      const box = runner.button.getBoundingClientRect();
      const close =
        event.clientX > box.left - NEAR &&
        event.clientX < box.right + NEAR &&
        event.clientY > box.top - NEAR &&
        event.clientY < box.bottom + NEAR;

      if (close) {
        runAway(runner, event.clientX, event.clientY);
      }
    });
  }, { passive: true });


  RUNNERS.forEach(function (runner) {
    runner.button.addEventListener("mouseenter", function (event) {
      runAway(runner, event.clientX, event.clientY);
    });

    // phones: a tap makes it run instead of pressing it
    runner.button.addEventListener("touchstart", function (event) {
      if (!CONFIG.dodgeNo || !armed.has(runner.button)) return;

      event.preventDefault();

      const touch = event.touches[0];
      runAway(runner, touch.clientX, touch.clientY);
    }, { passive: false });
  });


  // put the buttons back in place if the window size changes
  addEventListener("resize", function () {
    RUNNERS.forEach(function (runner) {
      resetRunner(runner.button);
    });
  });



  /* =========================================================
     Screen 1: "Do you trust me?"
     ========================================================= */

  function startTrust() {
    show("trust");

    const choices = document.getElementById("c1");
    const sub = document.getElementById("sub1");

    choices.classList.remove("show");
    sub.classList.remove("show");
    resetRunner(noBtn);

    type(document.getElementById("q1"), CONFIG.question, 55, function () {
      setTimeout(function () {
        sub.classList.add("show");
        choices.classList.add("show");
      }, 260);
    });
  }

  yesBtn.addEventListener("click", function () {
    sfx("click");
    startHack();
  });

  noBtn.addEventListener("click", function () {
    armed.add(noBtn);
    sad(CONFIG.sadNo, "trust", "rejected");
  });



  /* =========================================================
     Screen 2: "Can I hack your phone?"
     ========================================================= */

  function startHack() {
    show("hack");

    const choices = document.getElementById("c2");
    const sub = document.getElementById("sub2");

    choices.classList.remove("show");
    sub.classList.remove("show");
    resetRunner(disagreeBtn);

    type(document.getElementById("q2"), CONFIG.threat, 48, function () {
      sfx("alarm");

      setTimeout(function () {
        sub.classList.add("show");
        choices.classList.add("show");
      }, 300);
    });
  }

  disagreeBtn.addEventListener("click", function () {
    armed.add(disagreeBtn);
    sad(CONFIG.sadDis, "hack", "access denied");
  });

  agreeBtn.addEventListener("click", function () {
    sfx("click");
    startRun();   // this click is what unlocks audio in the browser
  });



  /* =========================================================
     Screen 3: the fake hack
     ========================================================= */

  // [text, result]
  const TASKS = [
    ["requesting device handshake", "ok"],
    ["bypassing lock screen", "ok"],
    ["reading contacts — 412 entries", "ok"],
    ["downloading gallery — 1,284 files", "ok"],
    ["scanning private messages", "ok"],
    ["locating device", "warn"],
    ["extracting browser history", "ok"],
    ["uploading everything to my server", "ok"],
    ["ERR: payload is not a phone", "err"],
    ["ERR: target identified as a PERSON", "err"],
    ["rerouting...", "warn"]
  ];

  const LABELS = {
    ok: "[ OK ]",
    warn: "[ ?? ]",
    err: "[FAIL]"
  };

  const runLog = document.getElementById("runLog");
  const barFill = document.getElementById("barFill");
  const barEmpty = document.getElementById("barEmpty");
  const barPct = document.getElementById("barPct");

  const BAR_WIDTH = 56;


  function drawBar(percent) {
    const filled = Math.round(percent / 100 * BAR_WIDTH);

    barFill.textContent = "#".repeat(filled);
    barEmpty.textContent = "-".repeat(Math.max(0, BAR_WIDTH - filled));
    barPct.textContent = String(percent).padStart(3, " ") + "%";
  }


  function addLogRow(text, kind, clock) {
    const row = document.createElement("div");
    row.className = "row";

    // built from text nodes (never innerHTML), so no text can turn into code
    const time = document.createElement("span");
    time.className = "t";
    time.textContent = "[" + (clock / 1000).toFixed(3).padStart(6, "0") + "]";

    const tag = document.createElement("span");
    tag.className = kind;
    tag.textContent = LABELS[kind];

    row.append(time, " " + text + " ", tag);
    runLog.appendChild(row);

    requestAnimationFrame(function () {
      row.classList.add("show");
    });
  }


  function startRun() {
    show("run");
    runLog.replaceChildren();
    drawBar(0);

    let i = 0;
    let clock = 0;

    (function step() {
      if (i >= TASKS.length) {
        setTimeout(party, 700);
        return;
      }

      const text = TASKS[i][0];
      const kind = TASKS[i][1];

      clock += 70 + Math.random() * 110;
      addLogRow(text, kind, clock);
      drawBar(Math.round((i + 1) / TASKS.length * 100));
      sfx(kind === "err" ? "deny" : "click");

      i++;

      // slow down near the end for drama
      setTimeout(step, i > 7 ? 620 : 300 + Math.random() * 140);
    })();
  }



  /* =========================================================
     Screen 4: Happy Birthday
     ========================================================= */

  const CAKE = [
    "      *   *   *   *   *",
    "      |   |   |   |   |",
    "  ╔═══════════════════════╗",
    "  ║░░░░░░░░░░░░░░░░░░░░░░░║",
    "  ╠═══════════════════════╣",
    "  ║                       ║",
    "  ╚═══════════════════════╝"
  ];

  const cake = document.getElementById("cake");
  const wish = document.getElementById("wish");
  const wish2 = document.getElementById("wish2");
  const muteBtn = document.getElementById("muteBtn");
  const rainCanvas = document.getElementById("rain");
  const scrim = document.getElementById("scrim");
  const partyStack = SCREENS.party.querySelector(".stack");

  let flameTimer = null;


  // every "*" becomes a flame we can animate
  function drawCake() {
    cake.textContent = "";

    CAKE.forEach(function (line, lineIndex) {
      line.split("*").forEach(function (part, partIndex) {
        if (partIndex > 0) {
          const flame = document.createElement("span");
          flame.className = "fl";
          flame.textContent = "*";
          cake.append(flame);
        }

        cake.append(part);
      });

      if (lineIndex < CAKE.length - 1) {
        cake.append("\n");
      }
    });
  }


  function flickerFlames() {
    const shapes = ["*", "'", ".", "*", "·"];

    flameTimer = setInterval(function () {
      cake.querySelectorAll(".fl").forEach(function (flame) {
        flame.textContent = shapes[Math.floor(Math.random() * shapes.length)];
      });
    }, 220);
  }


  function party() {
    show("party");
    partyStack.classList.add("glitch");

    drawCake();
    if (!flameTimer) flickerFlames();

    rainCanvas.classList.add("on");
    scrim.classList.add("on");
    startRain();

    muteBtn.classList.add("show");
    if (!muted) musicOn();

    wish2.textContent = CONFIG.wish2;
    wish2.classList.remove("show");

    type(wish, CONFIG.wish, 38, function () {
      setTimeout(function () {
        wish2.classList.add("show");
      }, 260);
    });
  }


  // the "call me" button
  const callBtn = document.getElementById("callBtn");

  callBtn.textContent = CONFIG.callText;

  if (CONFIG.phone) {
    callBtn.href = "tel:" + CONFIG.phone;
  } else {
    callBtn.removeAttribute("href");
  }

  callBtn.addEventListener("click", function () {
    sfx("click");
  });


  // start everything over
  document.getElementById("replayBtn").addEventListener("click", function () {
    musicOff();

    rainCanvas.classList.remove("on");
    scrim.classList.remove("on");
    stopRain();

    clearInterval(flameTimer);
    flameTimer = null;

    muteBtn.classList.remove("show");
    partyStack.classList.remove("glitch");

    armed.clear();
    startTrust();
  });


  muteBtn.addEventListener("click", function () {
    muted = !muted;
    muteBtn.textContent = muted ? "SOUND: OFF" : "SOUND: ON";

    if (muted) {
      musicOff();
    } else {
      musicOn();
    }
  });



  /* =========================================================
     Falling character rain
     ========================================================= */

  const rain = rainCanvas.getContext("2d");
  const GLYPHS = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ<>/\\|{}[]*#$%&@";
  const COLUMN = 16;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let columns = [];
  let raining = false;
  let frame = null;


  function sizeRain() {
    const scale = Math.min(devicePixelRatio || 1, 2);

    rainCanvas.width = innerWidth * scale;
    rainCanvas.height = innerHeight * scale;
    rain.setTransform(scale, 0, 0, scale, 0, 0);

    // each column starts at a random height above the screen
    columns = Array.from({ length: Math.ceil(innerWidth / COLUMN) }, function () {
      return Math.random() * -innerHeight;
    });
  }


  function drawRain() {
    if (!raining || reduceMotion) {
      stopRain();
      return;
    }

    // a see-through fill leaves fading trails
    rain.fillStyle = "rgba(5, 7, 5, 0.14)";
    rain.fillRect(0, 0, innerWidth, innerHeight);
    rain.font = "13px 'JetBrains Mono', monospace";

    columns.forEach(function (y, i) {
      rain.fillStyle = Math.random() > 0.96 ? "#bdf5c2" : "#22b32d";
      rain.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], i * COLUMN, y);

      columns[i] = (y > innerHeight + Math.random() * 400) ? 0 : y + COLUMN;
    });

    frame = requestAnimationFrame(drawRain);
  }


  function startRain() {
    raining = true;
    if (frame) cancelAnimationFrame(frame);
    drawRain();
  }


  function stopRain() {
    raining = false;
    if (frame) cancelAnimationFrame(frame);
    frame = null;
  }


  sizeRain();
  addEventListener("resize", sizeRain);



  /* =========================================================
     Go!
     ========================================================= */

  startTrust();

})();
