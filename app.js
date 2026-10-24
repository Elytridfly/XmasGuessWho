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

  function folderIdFrom(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const fromUrl = text.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (fromUrl) return fromUrl[1];
    return text;
  }

  function nameFromFile(filename) {
    return filename
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function imageUrl(fileId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(
      fileId
    )}&sz=w1000`;
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

  async function listFolderImages(folderId, apiKey) {
    const files = [];
    let pageToken = "";

    do {
      const query = `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`;
      const params = new URLSearchParams({
        q: query,
        fields: "nextPageToken,files(id,name,mimeType)",
        pageSize: "1000",
        key: apiKey,
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
      });
      if (pageToken) params.set("pageToken", pageToken);

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`
      );
      const data = await response.json();
      if (!response.ok) {
        const reason = data.error && data.error.message;
        throw new Error(reason || "Could not read the Drive folder.");
      }

      files.push(...(data.files || []));
      pageToken = data.nextPageToken || "";
    } while (pageToken);

    return files.map((file) => ({
      id: file.id,
      name: nameFromFile(file.name) || "Mystery",
      image: imageUrl(file.id),
    }));
  }

  async function loadPool() {
    const config = window.DRIVE_CONFIG || {};
    const folderId = folderIdFrom(config.folder);
    const apiKey = String(config.apiKey || "").trim();

    if (!folderId || !apiKey) {
      showMessage(
        "Add your Google Drive folder link and API key in config.js to load the cards."
      );
      return;
    }

    showMessage("Shuffling the deck…");
    redrawButton.disabled = true;

    try {
      pool = await listFolderImages(folderId, apiKey);
      loaded = true;
      drawHand();
    } catch (error) {
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
