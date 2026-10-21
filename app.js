(function () {
  "use strict";

  const DATA = Array.isArray(window.ANIME_DATA) ? window.ANIME_DATA : [];
  const ROUND_COUNT = 10;
  const RESULT_FONT = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';
  const RESULT_CARD = {
    width: 1600,
    height: 1695,
    padding: 80,
    gap: 20,
    columns: 5,
    dividerY: 480,
    gridTop: 515,
    coverHeight: 381,
    rowHeight: 537,
    rowGap: 26
  };

  const screens = {
    menu: document.getElementById("screen-menu"),
    game: document.getElementById("screen-game"),
    end: document.getElementById("screen-end")
  };

  const elements = {
    startButton: document.getElementById("start-button"),
    rulesButton: document.getElementById("rules-button"),
    modal: document.getElementById("rules-modal"),
    modalClose: document.getElementById("modal-close"),
    backMenuButton: document.getElementById("back-menu-button"),

    coverImage: document.getElementById("cover-image"),
    roundNumber: document.getElementById("round-number"),
    questionNumber: document.getElementById("question-number"),
    coverIndex: document.getElementById("cover-index"),
    animeTitle: document.getElementById("anime-title"),
    animeStudio: document.getElementById("anime-studio"),
    animeDate: document.getElementById("anime-date"),
    rankStat: document.getElementById("rank-stat"),
    ratingStat: document.getElementById("rating-stat"),
    rankValue: document.getElementById("rank-value"),
    ratingValue: document.getElementById("rating-value"),

    progressLabel: document.getElementById("progress-label"),
    progressbar: document.getElementById("progressbar"),
    progressFill: document.getElementById("progress-fill"),
    currentScore: document.getElementById("current-score"),
    gameHomeButton: document.getElementById("game-home-button"),
    restartButton: document.getElementById("restart-button"),
    restartModal: document.getElementById("restart-modal"),
    restartCancel: document.getElementById("restart-cancel"),
    restartConfirm: document.getElementById("restart-confirm"),

    guessForm: document.getElementById("guess-form"),
    guessInput: document.getElementById("guess-input"),
    guessError: document.getElementById("guess-error"),
    confirmButton: document.getElementById("confirm-button"),
    confirmIndex: document.getElementById("confirm-index"),
    confirmLabel: document.getElementById("confirm-label"),
    confirmArrow: document.getElementById("confirm-arrow"),

    roundResult: document.getElementById("round-result"),
    resultGuess: document.getElementById("result-guess"),
    resultError: document.getElementById("result-error"),
    resultScore: document.getElementById("result-score"),
    resultComment: document.getElementById("result-comment"),

    liveStatus: document.getElementById("live-status"),
    finalScore: document.getElementById("final-score"),
    endTitle: document.getElementById("end-title"),
    endVerdict: document.getElementById("end-verdict"),
    scoreTableBody: document.getElementById("score-table-body"),
    shareButton: document.getElementById("share-button"),
    shareModal: document.getElementById("share-modal"),
    shareTitle: document.getElementById("share-title"),
    sharePreview: document.getElementById("share-preview"),
    shareStatus: document.getElementById("share-status"),
    shareSave: document.getElementById("share-save"),
    shareClose: document.getElementById("share-close")
  };

  const state = {
    rounds: [],
    index: 0,
    total: 0,
    answered: false,
    answers: []
  };

  let lastFocusedElement = null;
  let renderedShareCanvas = null;
  let shareRenderToken = 0;

  function pad(number, length) {
    return String(number).padStart(length, "0");
  }

  function roundTo(value, digits) {
    const factor = Math.pow(10, digits);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function formatScore(value) {
    return Math.max(0, roundTo(value, 2)).toFixed(2);
  }

  function formatOneDecimal(value) {
    return (Math.round(value * 10) / 10).toFixed(1);
  }

  function loadCardImage(source) {
    return new Promise(function (resolve, reject) {
      const image = new Image();
      image.decoding = "async";
      image.onload = function () {
        resolve(image);
      };
      image.onerror = function () {
        reject(new Error("图片加载失败：" + source));
      };
      image.src = source;
    });
  }

  function drawCroppedImage(context, image, x, y, width, height) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }

  function wrapCanvasText(context, text, maxWidth, maxLines) {
    const characters = Array.from(text);
    const lines = [];
    let line = "";

    characters.forEach(function (character) {
      const candidate = line + character;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    });

    if (line) {
      lines.push(line);
    }

    if (lines.length > maxLines) {
      lines.length = maxLines;
      let lastLine = lines[maxLines - 1];
      while (lastLine.length && context.measureText(lastLine + "…").width > maxWidth) {
        lastLine = lastLine.slice(0, -1);
      }
      lines[maxLines - 1] = lastLine + "…";
    }

    return lines;
  }

  async function buildResultCard() {
    if (state.answers.length !== ROUND_COUNT) {
      throw new Error("本局记录不完整");
    }

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const coverImages = await Promise.all(state.answers.map(function (answer) {
      return loadCardImage(answer.cover);
    }));
    const qrImage = await loadCardImage("assets/qr-github.png");

    const canvas = document.createElement("canvas");
    canvas.width = RESULT_CARD.width;
    canvas.height = RESULT_CARD.height;
    const context = canvas.getContext("2d");
    const ink = "#111111";
    const cream = "#f2eee5";

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.textBaseline = "top";
    context.fillStyle = cream;
    context.fillRect(0, 0, RESULT_CARD.width, RESULT_CARD.height);

    context.fillStyle = "rgba(240, 148, 156, 0.34)";
    context.font = "700 240px " + RESULT_FONT;
    context.fillText("bangumi", 48, 22);

    context.fillStyle = ink;
    context.font = "700 112px " + RESULT_FONT;
    context.fillText("动画猜评分", 80, 138);

    context.fillStyle = ink;
    context.font = "700 20px " + RESULT_FONT;
    context.fillText("总分", RESULT_CARD.padding, 312);
    context.font = "700 100px " + RESULT_FONT;
    context.fillText(formatScore(state.total) + "/100", RESULT_CARD.padding, 342);

    const qrSize = 220;
    const qrX = RESULT_CARD.width - RESULT_CARD.padding - qrSize;
    const qrY = RESULT_CARD.padding;
    context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
    context.strokeStyle = ink;
    context.lineWidth = 1;
    context.strokeRect(qrX + 0.5, qrY + 0.5, qrSize - 1, qrSize - 1);
    context.fillStyle = ink;
    context.font = "700 20px " + RESULT_FONT;
    context.fillText("扫码进入动画猜评分", qrX, qrY + qrSize + 16);
    context.font = "400 16px " + RESULT_FONT;
    context.fillText("bangumi rating guesser", qrX, qrY + qrSize + 44);

    context.fillStyle = ink;
    context.fillRect(RESULT_CARD.padding, RESULT_CARD.dividerY, RESULT_CARD.width - RESULT_CARD.padding * 2, 1);

    const cellWidth = (RESULT_CARD.width - RESULT_CARD.padding * 2 - RESULT_CARD.gap * 4) / RESULT_CARD.columns;

    state.answers.forEach(function (answer, index) {
      const column = index % RESULT_CARD.columns;
      const row = Math.floor(index / RESULT_CARD.columns);
      const x = RESULT_CARD.padding + column * (cellWidth + RESULT_CARD.gap);
      const y = RESULT_CARD.gridTop + row * (RESULT_CARD.rowHeight + RESULT_CARD.rowGap);

      drawCroppedImage(context, coverImages[index], x, y, cellWidth, RESULT_CARD.coverHeight);
      context.strokeStyle = ink;
      context.lineWidth = 1;
      context.strokeRect(x + 0.5, y + 0.5, cellWidth - 1, RESULT_CARD.coverHeight - 1);

      context.fillStyle = ink;
      context.font = "700 22px " + RESULT_FONT;
      const titleLines = wrapCanvasText(context, answer.title, cellWidth, 3);
      titleLines.forEach(function (line, lineIndex) {
        context.fillText(line, x, y + RESULT_CARD.coverHeight + 14 + lineIndex * 28);
      });

      const metadataY = y + RESULT_CARD.coverHeight + 14 + 84 + 6;
      context.font = "400 17px " + RESULT_FONT;
      context.fillText(
        "猜测 " + answer.guess.toFixed(1) + " / 实际 " + answer.actual.toFixed(1),
        x,
        metadataY
      );

      context.font = "700 19px " + RESULT_FONT;
      const scorePrefix = answer.score > 0 ? "+" : "";
      context.fillText("本轮得分 " + scorePrefix + answer.score.toFixed(2), x, metadataY + 26);
    });

    return canvas;
  }

  function scoreForGuess(guess, actual) {
    const x = Math.abs(guess - actual);
    if (x >= 3) {
      return 0;
    }
    if (x < 1.5) {
      return 10 - 5 * x;
    }
    return 5 - (5 / 3) * x;
  }

  function randomIndex(max) {
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      const buffer = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / max) * max;
      let value;
      do {
        window.crypto.getRandomValues(buffer);
        value = buffer[0];
      } while (value >= limit);
      return value % max;
    }
    return Math.floor(Math.random() * max);
  }

  function pickRounds(pool, count) {
    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = randomIndex(i + 1);
      const temporary = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temporary;
    }
    return shuffled.slice(0, count);
  }

  function setScreen(name) {
    Object.keys(screens).forEach(function (key) {
      const screen = screens[key];
      const isActive = key === name;
      screen.hidden = !isActive;
      screen.classList.toggle("is-active", isActive);
    });
    window.scrollTo(0, 0);
  }

  function setProgress(completedRounds, currentRound) {
    const percent = (completedRounds / ROUND_COUNT) * 100;
    elements.progressFill.style.width = percent + "%";
    elements.progressbar.setAttribute("aria-valuenow", String(completedRounds));
    elements.progressLabel.textContent = pad(currentRound, 2) + " / " + pad(ROUND_COUNT, 2);
  }

  function setScore(value) {
    elements.currentScore.textContent = formatScore(value);
  }

  function resetStats() {
    elements.rankValue.textContent = "—";
    elements.ratingValue.textContent = "—";
    elements.rankStat.classList.remove("is-revealed");
    elements.ratingStat.classList.remove("is-revealed");
    elements.rankStat.removeAttribute("aria-label");
    elements.ratingStat.removeAttribute("aria-label");
  }

  function resetQuestionForm() {
    state.answered = false;
    elements.guessForm.classList.remove("is-answered");
    elements.guessInput.disabled = false;
    elements.guessInput.value = "";
    elements.guessInput.removeAttribute("aria-invalid");
    elements.guessError.textContent = "";
    elements.roundResult.hidden = true;
    elements.confirmButton.classList.remove("is-next");
    elements.confirmIndex.textContent = "SUBMIT";
    elements.confirmLabel.textContent = "确认";
    elements.confirmArrow.textContent = "→";
    elements.resultGuess.textContent = "—";
    elements.resultError.textContent = "—";
    elements.resultScore.textContent = "—";
    elements.resultComment.textContent = "—";
  }

  function setTitleSize(title) {
    elements.animeTitle.classList.remove("anime-title--medium", "anime-title--long");
    if (title.length > 26) {
      elements.animeTitle.classList.add("anime-title--long");
    } else if (title.length > 16) {
      elements.animeTitle.classList.add("anime-title--medium");
    }
  }

  function preloadCover(anime) {
    if (!anime || !anime.cover) {
      return;
    }
    const image = new Image();
    image.src = anime.cover;
  }

  function renderRound() {
    const anime = state.rounds[state.index];
    if (!anime) {
      return;
    }

    resetQuestionForm();
    resetStats();
    setScore(state.total);
    setProgress(state.index, state.index + 1);

    elements.roundNumber.textContent = pad(state.index + 1, 2);
    elements.questionNumber.textContent = "QUESTION " + pad(state.index + 1, 2);
    elements.coverIndex.textContent = "NO. " + pad(state.index + 1, 3);

    elements.animeTitle.textContent = anime.title;
    setTitleSize(anime.title);
    elements.animeStudio.textContent = anime.studio;
    elements.animeDate.textContent = anime.date;

    elements.coverImage.src = anime.cover;
    elements.coverImage.alt = "《" + anime.title + "》的动画封面";

    const nextRound = state.rounds[state.index + 1];
    if (nextRound) {
      preloadCover(nextRound);
    }

    if (window.matchMedia("(min-width: 900px)").matches) {
      window.setTimeout(function () {
        elements.guessInput.focus({ preventScroll: true });
      }, 80);
    }
  }

  function startGame() {
    if (DATA.length < ROUND_COUNT) {
      return;
    }

    state.rounds = pickRounds(DATA, ROUND_COUNT);
    state.index = 0;
    state.total = 0;
    state.answered = false;
    state.answers = [];

    setScreen("game");
    renderRound();
  }

  function feedbackFor(error) {
    if (error === 0) {
      return "完全命中。你给出了与 Bangumi 完全一致的评分。";
    }
    if (error <= 0.3) {
      return "几乎命中。你对这部作品的评分判断非常稳定。";
    }
    if (error <= 0.8) {
      return "非常接近。方向与力度都拿捏得不错。";
    }
    if (error <= 1.5) {
      return "判断不错。你抓住了大致的评分区间。";
    }
    if (error <= 2.5) {
      return "有些偏差。这部作品的分数比你的直觉更远一些。";
    }
    return "偏离较大。这一题暂时没有命中 Bangumi 的评分区间。";
  }

  function submitGuess() {
    const anime = state.rounds[state.index];
    const raw = elements.guessInput.value.trim();
    const numeric = Number(raw);

    if (raw === "" || !Number.isFinite(numeric)) {
      elements.guessError.textContent = "请先输入一个评分，再点击确认。";
      elements.guessInput.setAttribute("aria-invalid", "true");
      elements.guessInput.focus();
      return;
    }

    if (numeric < 0 || numeric > 10) {
      elements.guessError.textContent = "评分需要在 0.0 到 10.0 之间。";
      elements.guessInput.setAttribute("aria-invalid", "true");
      elements.guessInput.focus();
      return;
    }

    if (Math.abs(numeric * 10 - Math.round(numeric * 10)) > 0.000001) {
      elements.guessError.textContent = "请保留一位小数，例如 8.7。";
      elements.guessInput.setAttribute("aria-invalid", "true");
      elements.guessInput.focus();
      return;
    }

    const guess = roundTo(numeric, 1);
    const actual = anime.rating;
    const error = roundTo(Math.abs(guess - actual), 2);
    const roundScore = roundTo(scoreForGuess(guess, actual), 2);

    state.answered = true;
    state.total = roundTo(state.total + roundScore, 2);
    state.answers.push({
      round: state.index + 1,
      title: anime.title,
      cover: anime.cover,
      guess: guess,
      actual: actual,
      error: error,
      score: roundScore
    });

    elements.guessInput.disabled = true;
    elements.guessInput.removeAttribute("aria-invalid");
    elements.guessError.textContent = "";
    elements.guessForm.classList.add("is-answered");

    elements.rankValue.textContent = "#" + anime.rank;
    elements.ratingValue.textContent = actual.toFixed(1);
    elements.rankStat.classList.add("is-revealed");
    elements.ratingStat.classList.add("is-revealed");
    elements.rankStat.setAttribute("aria-label", "Bangumi 排名第 " + anime.rank + " 名");
    elements.ratingStat.setAttribute("aria-label", "Bangumi 评分 " + actual.toFixed(1) + " 分");

    elements.resultGuess.textContent = guess.toFixed(1);
    elements.resultError.textContent = error.toFixed(2);
    elements.resultScore.textContent = (roundScore > 0 ? "+" : "") + roundScore.toFixed(2);
    elements.resultComment.textContent = feedbackFor(error);
    elements.roundResult.hidden = false;

    setScore(state.total);
    setProgress(state.index + 1, state.index + 1);

    const isLastRound = state.index === ROUND_COUNT - 1;
    elements.confirmButton.classList.add("is-next");
    elements.confirmIndex.textContent = isLastRound ? "RESULTS" : "NEXT ROUND";
    elements.confirmLabel.textContent = isLastRound ? "查看结果" : "下一题";
    elements.confirmArrow.textContent = "→";

    elements.liveStatus.textContent =
      "第 " + (state.index + 1) + " 轮得分 " + roundScore.toFixed(2) +
      " 分，当前总分 " + formatScore(state.total) + " 分。";
  }

  function advance() {
    if (!state.answered) {
      return;
    }
    if (state.index >= ROUND_COUNT - 1) {
      showResults();
      return;
    }
    state.index += 1;
    state.answered = false;
    setScreen("game");
    renderRound();
  }

  function verdictFor(total) {
    if (total >= 90) {
      return "几乎读懂了 Bangumi 的评分语言。";
    }
    if (total >= 75) {
      return "你对评分区间有稳定而准确的判断。";
    }
    if (total >= 60) {
      return "整体方向准确，细节仍有偏差。";
    }
    if (total >= 40) {
      return "有几轮很准，也有几轮失手。";
    }
    return "这次更像一次随机的评分漫游。";
  }

  function buildScoreTable() {
    elements.scoreTableBody.replaceChildren();

    state.answers.forEach(function (answer) {
      const row = document.createElement("tr");

      const roundCell = document.createElement("td");
      roundCell.textContent = pad(answer.round, 2);
      row.appendChild(roundCell);

      const titleCell = document.createElement("td");
      titleCell.textContent = answer.title;
      titleCell.title = answer.title;
      row.appendChild(titleCell);

      const guessCell = document.createElement("td");
      guessCell.textContent = answer.guess.toFixed(1);
      row.appendChild(guessCell);

      const actualCell = document.createElement("td");
      actualCell.textContent = answer.actual.toFixed(1);
      row.appendChild(actualCell);

      const scoreCell = document.createElement("td");
      scoreCell.textContent = (answer.score > 0 ? "+" : "") + answer.score.toFixed(2);
      row.appendChild(scoreCell);

      elements.scoreTableBody.appendChild(row);
    });
  }

  function showResults() {
    elements.finalScore.textContent = formatScore(state.total);
    elements.endVerdict.textContent = verdictFor(state.total);
    buildScoreTable();
    renderedShareCanvas = null;
    setScreen("end");
    elements.liveStatus.textContent = "游戏结束。本局总分 " + formatScore(state.total) + " 分。";
    window.setTimeout(function () {
      elements.endTitle.focus({ preventScroll: true });
    }, 80);
  }

  function returnToMenu() {
    elements.restartModal.hidden = true;
    elements.modal.hidden = true;
    elements.shareModal.hidden = true;
    elements.sharePreview.replaceChildren();
    elements.shareStatus.textContent = "";
    elements.shareSave.disabled = true;
    renderedShareCanvas = null;
    shareRenderToken += 1;
    document.body.classList.remove("modal-open");
    setScreen("menu");
    state.rounds = [];
    state.answers = [];
    state.total = 0;
    state.index = 0;
    state.answered = false;
    setScore(0);
    window.setTimeout(function () {
      elements.startButton.focus({ preventScroll: true });
    }, 80);
  }

  function openRestartDialog() {
    lastFocusedElement = elements.restartButton;
    elements.restartModal.hidden = false;
    document.body.classList.add("modal-open");
    window.setTimeout(function () {
      elements.restartCancel.focus();
    }, 20);
  }

  function closeRestartDialog() {
    if (elements.restartModal.hidden) {
      return;
    }
    elements.restartModal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }

  function confirmRestart() {
    elements.restartModal.hidden = true;
    document.body.classList.remove("modal-open");
    returnToMenu();
  }

  function openShareDialog() {
    if (state.answers.length !== ROUND_COUNT) {
      return;
    }

    lastFocusedElement = elements.shareButton;
    renderedShareCanvas = null;
    elements.sharePreview.replaceChildren();
    elements.shareSave.disabled = true;
    elements.shareStatus.textContent = "正在生成战绩图片…";
    elements.shareModal.hidden = false;
    document.body.classList.add("modal-open");
    const token = shareRenderToken + 1;
    shareRenderToken = token;

    window.setTimeout(function () {
      elements.shareTitle.focus();
    }, 20);

    buildResultCard().then(function (canvas) {
      if (token !== shareRenderToken) {
        return;
      }
      renderedShareCanvas = canvas;
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "本局战绩图片预览");
      elements.sharePreview.replaceChildren(canvas);
      elements.shareStatus.textContent = "";
      elements.shareSave.disabled = false;
    }).catch(function () {
      if (token !== shareRenderToken) {
        return;
      }
      elements.shareStatus.textContent = "战绩图片生成失败，请稍后重试。";
      elements.shareSave.disabled = true;
    });
  }

  function closeShareDialog() {
    if (elements.shareModal.hidden) {
      return;
    }
    shareRenderToken += 1;
    elements.shareModal.hidden = true;
    elements.sharePreview.replaceChildren();
    elements.shareStatus.textContent = "";
    elements.shareSave.disabled = true;
    renderedShareCanvas = null;
    document.body.classList.remove("modal-open");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }

  async function saveShareImage() {
    if (!renderedShareCanvas) {
      return;
    }

    elements.shareSave.disabled = true;
    elements.shareStatus.textContent = "正在准备图片…";

    try {
      const blob = await new Promise(function (resolve, reject) {
        try {
          renderedShareCanvas.toBlob(function (result) {
            if (result) {
              resolve(result);
            } else {
              reject(new Error("图片导出失败"));
            }
          }, "image/png");
        } catch (error) {
          reject(error);
        }
      });

      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "bangumi-rating-" + formatScore(state.total).replace(".", "-") + ".png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
      elements.shareStatus.textContent = "图片已生成，正在下载。";
    } catch (error) {
      elements.shareStatus.textContent = "当前打开方式限制了图片导出，请通过本地服务器或 GitHub Pages 打开后再保存。";
    } finally {
      elements.shareSave.disabled = !renderedShareCanvas;
    }
  }

  function openRules() {
    lastFocusedElement = document.activeElement;
    elements.modal.hidden = false;
    document.body.classList.add("modal-open");
    const panel = elements.modal.querySelector(".modal__panel");
    panel.scrollTop = 0;
    window.setTimeout(function () {
      elements.modalClose.focus();
    }, 20);
  }

  function closeRules() {
    if (elements.modal.hidden) {
      return;
    }
    elements.modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }

  function trapFocusWithin(container, event) {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = Array.prototype.slice.call(
      container.querySelectorAll("button:not([disabled]), a[href]")
    );

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!focusable.includes(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function trapModalFocus(event) {
    trapFocusWithin(elements.modal, event);
  }

  function bindEvents() {
    elements.startButton.addEventListener("click", startGame);
    elements.rulesButton.addEventListener("click", openRules);
    elements.backMenuButton.addEventListener("click", returnToMenu);
    elements.gameHomeButton.addEventListener("click", returnToMenu);
    elements.restartButton.addEventListener("click", openRestartDialog);
    elements.restartCancel.addEventListener("click", closeRestartDialog);
    elements.restartConfirm.addEventListener("click", confirmRestart);
    elements.shareButton.addEventListener("click", openShareDialog);
    elements.shareClose.addEventListener("click", closeShareDialog);
    elements.shareSave.addEventListener("click", saveShareImage);

    elements.modal.querySelectorAll("[data-close-modal]").forEach(function (button) {
      button.addEventListener("click", closeRules);
    });

    elements.restartModal.querySelectorAll("[data-close-restart]").forEach(function (button) {
      button.addEventListener("click", closeRestartDialog);
    });

    elements.shareModal.querySelectorAll("[data-close-share]").forEach(function (button) {
      button.addEventListener("click", closeShareDialog);
    });

    elements.modal.addEventListener("keydown", trapModalFocus);
    elements.restartModal.addEventListener("keydown", function (event) {
      trapFocusWithin(elements.restartModal, event);
    });
    elements.shareModal.addEventListener("keydown", function (event) {
      trapFocusWithin(elements.shareModal, event);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") {
        return;
      }
      if (!elements.shareModal.hidden) {
        closeShareDialog();
      } else if (!elements.restartModal.hidden) {
        closeRestartDialog();
      } else if (!elements.modal.hidden) {
        closeRules();
      }
    });

    elements.guessForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (state.answered) {
        advance();
        return;
      }
      submitGuess();
    });

    elements.guessInput.addEventListener("input", function () {
      if (elements.guessError.textContent) {
        elements.guessError.textContent = "";
      }
      elements.guessInput.removeAttribute("aria-invalid");
    });
  }

  function init() {
    setScore(0);
    bindEvents();
  }

  init();
})();
