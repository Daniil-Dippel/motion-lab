const $ = (id) => document.getElementById(id);

const els = {
  stage: $("stage"),
  object: $("motionObject"),
  objectSelector: $("objectSelector"),
  stateSwitch: $("stateSwitch"),
  objectColor: $("objectColor"),
  stageColor: $("stageColor"),
  textControls: $("textControls"),
  textValue: $("textValue"),
  fontSize: $("fontSize"),
  fontSizeOut: $("fontSizeOut"),

  xRange: $("xRange"),
  yRange: $("yRange"),
  scaleRange: $("scaleRange"),
  rotateRange: $("rotateRange"),
  opacityRange: $("opacityRange"),

  xOut: $("xOut"),
  yOut: $("yOut"),
  scaleOut: $("scaleOut"),
  rotateOut: $("rotateOut"),
  opacityOut: $("opacityOut"),

  durationSelect: $("durationSelect"),
  easingSelect: $("easingSelect"),
  loopToggle: $("loopToggle"),
  alternateToggle: $("alternateToggle"),

  playBtn: $("playBtn"),
  playBtnTop: $("playBtnTop"),
  pauseBtn: $("pauseBtn"),
  replayBtn: $("replayBtn"),
  resetBtn: $("resetBtn"),

  timelineProgress: $("timelineProgress"),
  timeLabel: $("timeLabel"),

  randomChallengeBtn: $("randomChallengeBtn"),
  challengeText: $("challengeText"),
  challengeRules: $("challengeRules")
};

const defaultState = () => ({
  objectType: "square",
  editing: "start",
  color: "#7c5cff",
  stageColor: "#131722",
  text: "MOTION",
  fontSize: 48,
  start: { x: 0, y: 0, scale: 100, rotate: 0, opacity: 100 },
  end: { x: 90, y: 0, scale: 100, rotate: 0, opacity: 100 },
  duration: 1000,
  easing: "ease-out",
  loop: false,
  alternate: false
});

let state = defaultState();
let animation = null;
let rafId = null;
let playStartedAt = 0;
let pausedAt = 0;
let isPaused = false;

const challenges = [
  {
    text: "Сделай появление фигуры так, чтобы она выглядела уверенно и тяжело.",
    rules: "Только Scale + Y • до 1 секунды"
  },
  {
    text: "Сделай так, чтобы объект выглядел испуганным, не используя текст и звук.",
    rules: "Поворот + X/Y • до 1.5 секунды"
  },
  {
    text: "Сделай максимально приятное появление текста MOTION.",
    rules: "Opacity + Scale • без вращения"
  },
  {
    text: "Сделай движение, которое ощущается быстрым, но не дёрганым.",
    rules: "Любая фигура • до 0.8 секунды"
  },
  {
    text: "Сделай объект 'пружинящим', будто он перелетел точку и вернулся.",
    rules: "Используй Overshoot"
  },
  {
    text: "Передай ощущение падения тяжёлого объекта.",
    rules: "Y + Scale • без Rotation"
  },
  {
    text: "Сделай анимацию, которая могла бы быть реакцией кнопки в приложении.",
    rules: "До 0.5 секунды • без больших перемещений"
  },
  {
    text: "Сделай спокойное и дорогое появление заголовка.",
    rules: "Текст • 0.8–1.5 секунды"
  }
];

function currentTransform(s) {
  return `translate3d(${s.x}px, ${s.y}px, 0) scale(${s.scale / 100}) rotate(${s.rotate}deg)`;
}

function updateTriangleColor() {
  if (state.objectType === "triangle") {
    els.object.style.borderBottomColor = state.color;
  } else {
    els.object.style.borderBottomColor = "";
  }
}

function renderObject() {
  els.object.className = `motion-object ${state.objectType}`;

  if (state.objectType === "text") {
    els.object.textContent = state.text || "MOTION";
    els.object.style.fontSize = `${state.fontSize}px`;
    els.object.style.color = state.color;
    els.textControls.classList.remove("hidden");
  } else {
    els.object.textContent = "";
    els.object.style.fontSize = "";
    els.object.style.color = "";
    els.object.style.backgroundColor = state.color;
    els.textControls.classList.add("hidden");
  }

  updateTriangleColor();
  els.stage.style.backgroundColor = state.stageColor;

  const s = state[state.editing];
  els.object.style.transform = currentTransform(s);
  els.object.style.opacity = s.opacity / 100;
}

function syncControls() {
  const s = state[state.editing];

  els.xRange.value = s.x;
  els.yRange.value = s.y;
  els.scaleRange.value = s.scale;
  els.rotateRange.value = s.rotate;
  els.opacityRange.value = s.opacity;

  els.xOut.textContent = `${s.x} px`;
  els.yOut.textContent = `${s.y} px`;
  els.scaleOut.textContent = `${s.scale}%`;
  els.rotateOut.textContent = `${s.rotate}°`;
  els.opacityOut.textContent = `${s.opacity}%`;

  els.objectColor.value = state.color;
  els.stageColor.value = state.stageColor;
  els.textValue.value = state.text;
  els.fontSize.value = state.fontSize;
  els.fontSizeOut.textContent = `${state.fontSize} px`;

  els.durationSelect.value = String(state.duration);
  els.easingSelect.value = state.easing;
  els.loopToggle.checked = state.loop;
  els.alternateToggle.checked = state.alternate;

  document.querySelectorAll("#objectSelector button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.object === state.objectType);
  });

  document.querySelectorAll("#stateSwitch button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.state === state.editing);
  });

  renderObject();
  updateTimeLabel(0);
}

function updateEditingValue(key, value) {
  stopAnimation(false);
  state[state.editing][key] = Number(value);
  syncControls();
}

function stopAnimation(reset = true) {
  if (animation) {
    animation.cancel();
    animation = null;
  }

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  isPaused = false;
  pausedAt = 0;

  if (reset) {
    els.timelineProgress.style.width = "0%";
    updateTimeLabel(0);
    renderObject();
  }
}

function updateTimeLabel(elapsedMs) {
  const total = state.duration / 1000;
  const current = Math.min(elapsedMs / 1000, total);
  els.timeLabel.textContent = `${current.toFixed(2)} / ${total.toFixed(2)} сек`;
}

function trackProgress() {
  if (!playStartedAt) return;

  const now = performance.now();
  const elapsed = now - playStartedAt;
  const duration = state.duration;

  if (state.loop) {
    const local = elapsed % duration;
    const percent = Math.min(100, (local / duration) * 100);
    els.timelineProgress.style.width = `${percent}%`;
    updateTimeLabel(local);
    rafId = requestAnimationFrame(trackProgress);
    return;
  }

  const percent = Math.min(100, (elapsed / duration) * 100);
  els.timelineProgress.style.width = `${percent}%`;
  updateTimeLabel(elapsed);

  if (percent < 100) {
    rafId = requestAnimationFrame(trackProgress);
  } else {
    rafId = null;
  }
}

function playAnimation() {
  stopAnimation(false);

  const start = state.start;
  const end = state.end;

  state.editing = "start";
  syncControls();

  const iterations = state.loop ? Infinity : 1;
  const direction = state.alternate ? "alternate" : "normal";

  animation = els.object.animate(
    [
      {
        transform: currentTransform(start),
        opacity: start.opacity / 100
      },
      {
        transform: currentTransform(end),
        opacity: end.opacity / 100
      }
    ],
    {
      duration: state.duration,
      easing: state.easing,
      fill: "forwards",
      iterations,
      direction
    }
  );

  playStartedAt = performance.now();
  isPaused = false;
  rafId = requestAnimationFrame(trackProgress);

  animation.onfinish = () => {
    if (!state.loop) {
      els.timelineProgress.style.width = "100%";
      updateTimeLabel(state.duration);
    }
  };
}

function pauseAnimation() {
  if (!animation) return;

  if (!isPaused) {
    animation.pause();
    isPaused = true;
    pausedAt = performance.now();

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    els.pauseBtn.textContent = "▶ Продолжить";
  } else {
    animation.play();
    isPaused = false;

    const pauseDuration = performance.now() - pausedAt;
    playStartedAt += pauseDuration;
    els.pauseBtn.textContent = "⏸ Пауза";
    rafId = requestAnimationFrame(trackProgress);
  }
}

function applyPreset(name) {
  stopAnimation();

  const presets = {
    pop: {
      start: { x: 0, y: 0, scale: 30, rotate: 0, opacity: 0 },
      end: { x: 0, y: 0, scale: 100, rotate: 0, opacity: 100 },
      duration: 500,
      easing: "cubic-bezier(0.34,1.56,0.64,1)"
    },
    slide: {
      start: { x: -120, y: 0, scale: 92, rotate: 0, opacity: 0 },
      end: { x: 0, y: 0, scale: 100, rotate: 0, opacity: 100 },
      duration: 800,
      easing: "ease-out"
    },
    spin: {
      start: { x: 0, y: 0, scale: 60, rotate: -180, opacity: 0 },
      end: { x: 0, y: 0, scale: 100, rotate: 0, opacity: 100 },
      duration: 900,
      easing: "ease-out"
    },
    drop: {
      start: { x: 0, y: -140, scale: 85, rotate: 0, opacity: 100 },
      end: { x: 0, y: 70, scale: 112, rotate: 0, opacity: 100 },
      duration: 700,
      easing: "cubic-bezier(.2,.8,.2,1)"
    },
    fade: {
      start: { x: 0, y: 18, scale: 98, rotate: 0, opacity: 0 },
      end: { x: 0, y: 0, scale: 100, rotate: 0, opacity: 100 },
      duration: 1000,
      easing: "ease"
    },
    impact: {
      start: { x: 0, y: -90, scale: 72, rotate: -10, opacity: 100 },
      end: { x: 0, y: 55, scale: 125, rotate: 0, opacity: 100 },
      duration: 500,
      easing: "ease-in"
    }
  };

  const p = presets[name];
  if (!p) return;

  state.start = { ...p.start };
  state.end = { ...p.end };
  state.duration = p.duration;
  state.easing = p.easing;
  state.editing = "start";

  syncControls();
  playAnimation();
}

function resetAll() {
  stopAnimation();
  state = defaultState();
  els.pauseBtn.textContent = "⏸ Пауза";
  syncControls();
}

function randomChallenge() {
  const challenge = challenges[Math.floor(Math.random() * challenges.length)];
  els.challengeText.textContent = challenge.text;
  els.challengeRules.textContent = challenge.rules;

  const card = $("challengeCard");
  card.animate(
    [
      { transform: "scale(.98)", opacity: .55 },
      { transform: "scale(1)", opacity: 1 }
    ],
    { duration: 220, easing: "ease-out" }
  );

  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

els.objectSelector.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-object]");
  if (!btn) return;

  stopAnimation(false);
  state.objectType = btn.dataset.object;
  syncControls();
});

els.stateSwitch.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-state]");
  if (!btn) return;

  stopAnimation(false);
  state.editing = btn.dataset.state;
  syncControls();
});

els.xRange.addEventListener("input", e => updateEditingValue("x", e.target.value));
els.yRange.addEventListener("input", e => updateEditingValue("y", e.target.value));
els.scaleRange.addEventListener("input", e => updateEditingValue("scale", e.target.value));
els.rotateRange.addEventListener("input", e => updateEditingValue("rotate", e.target.value));
els.opacityRange.addEventListener("input", e => updateEditingValue("opacity", e.target.value));

els.objectColor.addEventListener("input", e => {
  state.color = e.target.value;
  renderObject();
});

els.stageColor.addEventListener("input", e => {
  state.stageColor = e.target.value;
  renderObject();
});

els.textValue.addEventListener("input", e => {
  state.text = e.target.value;
  renderObject();
});

els.fontSize.addEventListener("input", e => {
  state.fontSize = Number(e.target.value);
  els.fontSizeOut.textContent = `${state.fontSize} px`;
  renderObject();
});

els.durationSelect.addEventListener("change", e => {
  state.duration = Number(e.target.value);
  updateTimeLabel(0);
});

els.easingSelect.addEventListener("change", e => {
  state.easing = e.target.value;
});

els.loopToggle.addEventListener("change", e => {
  state.loop = e.target.checked;
});

els.alternateToggle.addEventListener("change", e => {
  state.alternate = e.target.checked;
});

els.playBtn.addEventListener("click", playAnimation);
els.playBtnTop.addEventListener("click", playAnimation);
els.pauseBtn.addEventListener("click", pauseAnimation);
els.replayBtn.addEventListener("click", playAnimation);
els.resetBtn.addEventListener("click", resetAll);
els.randomChallengeBtn.addEventListener("click", randomChallenge);

document.querySelectorAll("[data-preset]").forEach(btn => {
  btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
});

syncControls();
