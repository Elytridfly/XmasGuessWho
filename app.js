(function () {
  const DRAW_COUNT = 10;
  const board = document.getElementById("board");
  const redrawButton = document.getElementById("redraw");

  let pool = [];
  let loaded = false;

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char];
    });
  }

  function showMessage(text) {
    board.classList.add("is-message");
    board.replaceChildren();
    const message = document.createElement("p");
    message.className = "status";
    message.textContent = text;
    board.appendChild(message);
  }

  function renderCard(card) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "Hidden card");

    button.innerHTML = `
      <div class="card-inner">
        <div class="face front">
          <img alt="" src="${escapeHtml(card.image)}" />
        </div>
        <div class="face back">
          <div>
            <p>Revealed</p>
            <h2>${escapeHtml(card.name)}</h2>
          </div>
        </div>
      </div>
    `;

    button.addEventListener("click", () => {
      const flipped = button.classList.toggle("is-flipped");
      button.setAttribute("aria-pressed", String(flipped));
      button.setAttribute("aria-label", flipped ? card.name : "Hidden card");
    });

    return button;
  }

  function drawHand() {
    if (!loaded) return;
    if (!pool.length) {
      showMessage("No images were found in the Drive folder.");
      return;
    }

    board.classList.remove("is-message");
    const hand = shuffle(pool).slice(0, DRAW_COUNT);
    board.replaceChildren();
    hand.forEach((card) => board.appendChild(renderCard(card)));
  }

  async function loadPool() {
    showMessage("Shuffling the deck…");
    redrawButton.disabled = true;

    try {
      const response = await fetch("/api/cards");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not load the card deck.");
      }
      pool = data.cards || [];
      loaded = true;
      drawHand();
    } catch (error) {
      loaded = false;
      showMessage(
        error.message ||
          "Could not load images from Google Drive. Check that the folder is shared with anyone who has the link."
      );
    } finally {
      redrawButton.disabled = false;
    }
  }

  redrawButton.addEventListener("click", () => {
    if (loaded) drawHand();
    else loadPool();
  });

  loadPool();
})();
