const dailies = [
  {
    id: 1,
    label: "Daily #001",
    topic: "Test Clip",
    prompt: "Tap Start first. Then pause when the flower head matches the yellow flower outline.",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    perfectTime: 2.42,
    winWindow: 0.18,
    testClip: true,
    outline: {
      type: "flower",
      x: "49%",
      y: "41%",
      w: "47%",
      h: "32%",
      r: "0deg",
      radius: "999px"
    }
  },
  {
    id: 2,
    label: "Daily #002",
    topic: "Test Clip",
    prompt: "Tap Start first. Then pause when the flower head matches the yellow flower outline.",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    perfectTime: 1.28,
    winWindow: 0.18,
    testClip: true,
    outline: {
      type: "flower",
      x: "52%",
      y: "39%",
      w: "46%",
      h: "31%",
      r: "0deg",
      radius: "999px"
    }
  }
];

const els = {
  dailyLabel: document.querySelector("#dailyLabel"),
  muteButton: document.querySelector("#muteButton"),
  muteIcon: document.querySelector("#muteIcon"),
  scoreValue: document.querySelector("#scoreValue"),
  loopValue: document.querySelector("#loopValue"),
  missValue: document.querySelector("#missValue"),
  video: document.querySelector("#challengeVideo"),
  stage: document.querySelector("#videoStage"),
  outline: document.querySelector("#targetOutline"),
  tapShield: document.querySelector("#tapShield"),
  statusPill: document.querySelector("#statusPill"),
  topicName: document.querySelector("#topicName"),
  hintText: document.querySelector("#hintText"),
  startButton: document.querySelector("#startButton"),
  testBadge: document.querySelector("#testBadge"),
  stepStart: document.querySelector("#stepStart"),
  stepWatch: document.querySelector("#stepWatch"),
  stepTap: document.querySelector("#stepTap"),
  dialog: document.querySelector("#resultDialog"),
  resultDaily: document.querySelector("#resultDaily"),
  resultTitle: document.querySelector("#resultTitle"),
  resultScore: document.querySelector("#resultScore"),
  resultLoops: document.querySelector("#resultLoops"),
  resultMisses: document.querySelector("#resultMisses"),
  shareText: document.querySelector("#shareText"),
  shareButton: document.querySelector("#shareButton"),
  copyButton: document.querySelector("#copyButton"),
  closeResultButton: document.querySelector("#closeResultButton")
};

const today = new Date();
const dayNumber = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
const daily = dailies[dayNumber % dailies.length];

const state = {
  started: false,
  solved: false,
  loops: 0,
  misses: 0,
  score: 0,
  lastLoopTime: 0,
  canTap: false,
  shareText: ""
};

function setupDaily() {
  els.dailyLabel.textContent = daily.label;
  els.topicName.textContent = daily.topic;
  els.hintText.textContent = daily.prompt;
  els.video.src = daily.videoUrl;
  els.video.loop = false;
  els.video.muted = true;
  els.muteIcon.textContent = "🔇";
  els.testBadge.hidden = !daily.testClip;
  setStatus("Tap Start to arm", "idle");
  renderSteps("start");

  renderOutline(daily.outline);

  const stored = localStorage.getItem(storageKey());
  if (stored) {
    try {
      const result = JSON.parse(stored);
      Object.assign(state, result, { started: false, solved: true });
      renderScore();
      showStoredResult();
      return;
    } catch {
      localStorage.removeItem(storageKey());
    }
  }

  renderScore();
}

function storageKey() {
  return `pausefit:${daily.label}`;
}

function renderOutline(outline) {
  els.outline.className = `outline outline--${outline.type || "box"}`;
  els.outline.style.setProperty("--outline-x", outline.x);
  els.outline.style.setProperty("--outline-y", outline.y);
  els.outline.style.setProperty("--outline-w", outline.w);
  els.outline.style.setProperty("--outline-h", outline.h);
  els.outline.style.setProperty("--outline-r", outline.r);
  els.outline.style.setProperty("--outline-radius", outline.radius);

  if (outline.type === "flower") {
    els.outline.innerHTML = `
      <svg class="outline-svg" viewBox="0 0 200 160" aria-hidden="true" focusable="false">
        <g class="flower-guide" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="100" cy="34" rx="28" ry="31" />
          <ellipse cx="142" cy="53" rx="28" ry="31" transform="rotate(48 142 53)" />
          <ellipse cx="154" cy="98" rx="28" ry="31" transform="rotate(100 154 98)" />
          <ellipse cx="100" cy="118" rx="31" ry="28" />
          <ellipse cx="46" cy="98" rx="28" ry="31" transform="rotate(80 46 98)" />
          <ellipse cx="58" cy="53" rx="28" ry="31" transform="rotate(-48 58 53)" />
          <circle cx="100" cy="78" r="27" />
        </g>
      </svg>
    `;
    return;
  }

  els.outline.innerHTML = "";
}

async function startGame() {
  if (state.solved) {
    showResult();
    return;
  }

  state.started = true;
  state.canTap = false;
  els.startButton.textContent = "Playing";
  els.startButton.disabled = true;
  setStatus("Loading video", "idle");
  renderSteps("watch");
  els.video.currentTime = 0;

  try {
    await els.video.play();
    state.canTap = true;
    setStatus("Now tap to pause", "");
    renderSteps("tap");
  } catch {
    els.statusPill.textContent = "Tap start again";
    state.started = false;
    state.canTap = false;
    els.startButton.textContent = "Start";
    els.startButton.disabled = false;
    renderSteps("start");
  }
}

function handleTap() {
  if (state.solved) {
    showResult();
    return;
  }

  if (!state.started) {
    setStatus("Tap Start first", "idle");
    return;
  }

  if (!state.canTap || els.video.paused) {
    setStatus("Tap not enabled yet", "idle");
    return;
  }

  els.video.pause();
  state.canTap = false;
  const delta = Math.abs(els.video.currentTime - daily.perfectTime);
  const didWin = delta <= daily.winWindow;

  if (didWin) {
    state.solved = true;
    pulseStatus("Locked in", "good");
    finishDaily();
    return;
  }

  state.misses += 1;
  state.score += 2;
  renderScore();
  pulseStatus(`${els.video.currentTime < daily.perfectTime ? "Too early" : "Too late"} +2`, "bad");
  window.setTimeout(() => {
    if (!state.solved) {
      els.video.play();
      state.canTap = true;
    }
  }, 520);
}

function handleLoop() {
  if (!state.started || state.solved) {
    return;
  }

  const now = performance.now();
  if (now - state.lastLoopTime < 400) {
    return;
  }

  state.lastLoopTime = now;
  state.loops += 1;
  state.score += 1;
  state.canTap = false;
  renderScore();
  pulseStatus("Loop +1", "");
  els.video.currentTime = 0;
  els.video.play().then(() => {
    state.canTap = true;
  });
}

function finishDaily() {
  const result = {
    loops: state.loops,
    misses: state.misses,
    score: state.score,
    shareText: buildShareText()
  };

  localStorage.setItem(storageKey(), JSON.stringify(result));
  state.shareText = result.shareText;
  els.startButton.textContent = "Result";
  els.startButton.disabled = false;
  renderSteps("done");
  window.setTimeout(showResult, 500);
}

function buildShareText() {
  const loopBlocks = "⬛".repeat(Math.min(state.loops, 8)) || "🟩";
  const missBlocks = "🟥".repeat(Math.min(state.misses, 8)) || "🟩";

  return [
    `PauseFit ${daily.label}`,
    `Score: ${state.score}`,
    `Loops: ${state.loops}  Misses: ${state.misses}`,
    "",
    loopBlocks,
    missBlocks
  ].join("\n");
}

function buildCopyText() {
  return `${state.shareText || buildShareText()}\n${window.location.href.split("#")[0]}`;
}

function renderScore() {
  els.scoreValue.textContent = state.score;
  els.loopValue.textContent = state.loops;
  els.missValue.textContent = state.misses;
}

function showStoredResult() {
  els.startButton.textContent = "Result";
  els.startButton.disabled = false;
  setStatus("Daily complete", "good");
  renderSteps("done");
}

function showResult() {
  const text = state.shareText || buildShareText();
  els.resultDaily.textContent = daily.label;
  els.resultTitle.textContent = state.solved ? "Solved" : "Result";
  els.resultScore.textContent = state.score;
  els.resultLoops.textContent = `${state.loops} ${state.loops === 1 ? "loop" : "loops"}`;
  els.resultMisses.textContent = `${state.misses} ${state.misses === 1 ? "miss" : "misses"}`;
  els.shareText.textContent = text;

  if (!els.dialog.open) {
    els.dialog.showModal();
  }
}

function pulseStatus(message, type) {
  setStatus(message, type);

  window.setTimeout(() => {
    if (!state.solved) {
      setStatus(state.canTap ? "Now tap to pause" : "Tap disabled", state.canTap ? "" : "idle");
    }
  }, 620);
}

function setStatus(message, type) {
  els.statusPill.classList.remove("good", "bad", "idle");
  if (type) {
    els.statusPill.classList.add(type);
  }

  els.statusPill.textContent = message;
}

function renderSteps(activeStep) {
  for (const step of [els.stepStart, els.stepWatch, els.stepTap]) {
    step.classList.remove("active", "done");
  }

  if (activeStep === "start") {
    els.stepStart.classList.add("active");
    return;
  }

  if (activeStep === "watch") {
    els.stepStart.classList.add("done");
    els.stepWatch.classList.add("active");
    return;
  }

  if (activeStep === "tap") {
    els.stepStart.classList.add("done");
    els.stepWatch.classList.add("done");
    els.stepTap.classList.add("active");
    return;
  }

  if (activeStep === "done") {
    els.stepStart.classList.add("done");
    els.stepWatch.classList.add("done");
    els.stepTap.classList.add("done");
  }
}

async function shareResult() {
  const text = state.shareText || buildShareText();
  const url = window.location.href.split("#")[0];

  if (navigator.share) {
    await navigator.share({
      title: `PauseFit ${daily.label}`,
      text,
      url
    });
    return;
  }

  await copyText(buildCopyText());
  els.shareButton.textContent = "Copied";
  window.setTimeout(() => {
    els.shareButton.textContent = "Share";
  }, 1100);
}

async function copyText(text) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

els.startButton.addEventListener("click", startGame);
els.tapShield.addEventListener("click", handleTap);
els.tapShield.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handleTap();
  }
});
els.video.addEventListener("ended", handleLoop);
els.muteButton.addEventListener("click", () => {
  els.video.muted = !els.video.muted;
  els.muteIcon.textContent = els.video.muted ? "🔇" : "🔊";
});
els.shareButton.addEventListener("click", shareResult);
els.copyButton.addEventListener("click", async () => {
  await copyText(buildCopyText());
  els.copyButton.textContent = "Copied";
  window.setTimeout(() => {
    els.copyButton.textContent = "Copy Text";
  }, 1100);
});
els.closeResultButton.addEventListener("click", () => els.dialog.close());

setupDaily();
