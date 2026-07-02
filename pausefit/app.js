const dailies = [
  {
    id: 1,
    label: "Daily #001",
    topic: "Summer Bloom",
    prompt: "Pause when the flower head sits inside the ring.",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    perfectTime: 2.42,
    winWindow: 0.055,
    outline: {
      x: "47%",
      y: "43%",
      w: "34%",
      h: "22%",
      r: "-4deg",
      radius: "999px"
    }
  },
  {
    id: 2,
    label: "Daily #002",
    topic: "Monday Reset",
    prompt: "Pause when the bright bloom fits the outline.",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    perfectTime: 1.28,
    winWindow: 0.045,
    outline: {
      x: "50%",
      y: "38%",
      w: "30%",
      h: "20%",
      r: "2deg",
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

  els.outline.style.setProperty("--outline-x", daily.outline.x);
  els.outline.style.setProperty("--outline-y", daily.outline.y);
  els.outline.style.setProperty("--outline-w", daily.outline.w);
  els.outline.style.setProperty("--outline-h", daily.outline.h);
  els.outline.style.setProperty("--outline-r", daily.outline.r);
  els.outline.style.setProperty("--outline-radius", daily.outline.radius);

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

async function startGame() {
  if (state.solved) {
    showResult();
    return;
  }

  state.started = true;
  els.startButton.textContent = "Playing";
  els.statusPill.textContent = "Tap to pause";
  els.video.currentTime = 0;

  try {
    await els.video.play();
  } catch {
    els.statusPill.textContent = "Tap start again";
    state.started = false;
    els.startButton.textContent = "Start";
  }
}

function handleTap() {
  if (state.solved) {
    showResult();
    return;
  }

  if (!state.started || els.video.paused) {
    startGame();
    return;
  }

  els.video.pause();
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
  pulseStatus("Miss +2", "bad");
  window.setTimeout(() => {
    if (!state.solved) {
      els.video.play();
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
  renderScore();
  pulseStatus("Loop +1", "");
  els.video.currentTime = 0;
  els.video.play();
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
  els.statusPill.textContent = "Daily complete";
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
  els.statusPill.classList.remove("good", "bad");
  if (type) {
    els.statusPill.classList.add(type);
  }

  els.statusPill.textContent = message;

  window.setTimeout(() => {
    if (!state.solved) {
      els.statusPill.classList.remove("good", "bad");
      els.statusPill.textContent = "Tap to pause";
    }
  }, 620);
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
