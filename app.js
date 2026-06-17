/* =================================================================
   National Geographic · Epic Forts — Fort Builder
   Vanilla JS. No dependencies. Works offline & prints clean.
   ================================================================= */
(function () {
  "use strict";

  /* ---------- KIT DEFINITION ---------------------------------------
     The official Epic Forts manifest. Each part has an SVG glyph,
     a friendly name, an accent colour, and how many ship in the box. */
  const KIT = [
    {
      id: "wall",
      name: "Wall Panel",
      total: 12,
      color: "#c8a26a",
      svg:
        '<svg viewBox="0 0 64 64"><rect x="6" y="14" width="52" height="38" rx="2" fill="#c8a26a" stroke="#1a1a1a" stroke-width="2.5"/>' +
        '<line x1="6" y1="27" x2="58" y2="27" stroke="#1a1a1a" stroke-width="2"/><line x1="6" y1="40" x2="58" y2="40" stroke="#1a1a1a" stroke-width="2"/>' +
        '<line x1="23" y1="14" x2="23" y2="27" stroke="#1a1a1a" stroke-width="2"/><line x1="41" y1="27" x2="41" y2="40" stroke="#1a1a1a" stroke-width="2"/>' +
        '<line x1="23" y1="40" x2="23" y2="52" stroke="#1a1a1a" stroke-width="2"/></svg>',
    },
    {
      id: "roof",
      name: "Roof Panel",
      total: 8,
      color: "#d92b1f",
      svg:
        '<svg viewBox="0 0 64 64"><polygon points="32,10 60,30 54,30 54,52 10,52 10,30 4,30" fill="#d92b1f" stroke="#1a1a1a" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<line x1="32" y1="10" x2="32" y2="52" stroke="#1a1a1a" stroke-width="1.5" opacity="0.5"/>' +
        '<polygon points="32,16 50,30 14,30" fill="#fff" opacity="0.18"/></svg>',
    },
    {
      id: "door",
      name: "Door",
      total: 4,
      color: "#7a5230",
      svg:
        '<svg viewBox="0 0 64 64"><rect x="14" y="10" width="36" height="46" rx="2" fill="#7a5230" stroke="#1a1a1a" stroke-width="2.5"/>' +
        '<rect x="20" y="16" width="24" height="34" rx="1" fill="none" stroke="#1a1a1a" stroke-width="1.6" opacity="0.6"/>' +
        '<circle cx="42" cy="34" r="2.4" fill="#ffcc00" stroke="#1a1a1a" stroke-width="1"/></svg>',
    },
    {
      id: "tunnel",
      name: "Tunnel",
      total: 6,
      color: "#2f7d4f",
      svg:
        '<svg viewBox="0 0 64 64"><path d="M8 46 V30 a24 18 0 0 1 48 0 V46" fill="#2f7d4f" stroke="#1a1a1a" stroke-width="2.5"/>' +
        '<path d="M20 46 V32 a12 10 0 0 1 24 0 V46" fill="#173d27"/>' +
        '<line x1="8" y1="46" x2="56" y2="46" stroke="#1a1a1a" stroke-width="2.5"/></svg>',
    },
    {
      id: "clip",
      name: "Connector Clip",
      total: 24,
      color: "#ffcc00",
      svg:
        '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="16" fill="#ffcc00" stroke="#1a1a1a" stroke-width="2.5"/>' +
        '<circle cx="32" cy="32" r="6" fill="#1a1a1a"/>' +
        '<rect x="29" y="4" width="6" height="12" rx="2" fill="#ffcc00" stroke="#1a1a1a" stroke-width="2"/>' +
        '<rect x="29" y="48" width="6" height="12" rx="2" fill="#ffcc00" stroke="#1a1a1a" stroke-width="2"/>' +
        '<rect x="4" y="29" width="12" height="6" rx="2" fill="#ffcc00" stroke="#1a1a1a" stroke-width="2"/>' +
        '<rect x="48" y="29" width="12" height="6" rx="2" fill="#ffcc00" stroke="#1a1a1a" stroke-width="2"/></svg>',
    },
  ];

  const KIT_BY_ID = Object.fromEntries(KIT.map((p) => [p.id, p]));
  const GRID = 32; // survey grid size in px
  const PIECE = 72; // placed piece footprint
  const STORAGE_KEY = "epicforts.build.v1";

  /* ---------- STATE ------------------------------------------------ */
  // pieces: [{ uid, type, x, y, rot }]
  let state = { pieces: [], snap: true };
  let selectedUid = null;
  let uidSeq = 1;

  /* ---------- DOM refs --------------------------------------------- */
  const $ = (s) => document.querySelector(s);
  const canvas = $("#canvas");
  const palette = $("#palette");
  const checklist = $("#checklist");
  const emptyHint = $("#canvas-empty");

  /* ================================================================
     PALETTE
     ================================================================ */
  function renderPalette() {
    const used = countByType();
    palette.innerHTML = "";
    KIT.forEach((part) => {
      const left = part.total - (used[part.id] || 0);
      const card = document.createElement("div");
      card.className = "piece-card" + (left <= 0 ? " depleted" : "");
      card.draggable = left > 0;
      card.dataset.type = part.id;
      card.innerHTML =
        '<span class="piece-left">' + Math.max(left, 0) + "</span>" +
        '<div class="piece-svg">' + part.svg + "</div>" +
        '<div class="piece-name">' + part.name + "</div>";

      card.addEventListener("dragstart", (e) => {
        if (left <= 0) { e.preventDefault(); return; }
        e.dataTransfer.setData("text/plain", part.id);
        e.dataTransfer.effectAllowed = "copy";
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));

      // Tap-to-place fallback (touch / no-drag): place near centre.
      card.addEventListener("dblclick", () => {
        if (left <= 0) return;
        const r = canvas.getBoundingClientRect();
        addPiece(part.id, r.width / 2 - PIECE / 2, r.height / 2 - PIECE / 2);
      });
      palette.appendChild(card);
    });
  }

  /* ================================================================
     CHECKLIST + COUNTS
     ================================================================ */
  const checkSvg =
    '<svg viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';

  function renderChecklist() {
    const used = countByType();
    checklist.innerHTML = "";
    KIT.forEach((part) => {
      const n = used[part.id] || 0;
      const li = document.createElement("li");
      if (n > 0) li.classList.add("done");
      li.innerHTML =
        '<span class="check-box">' + checkSvg + "</span>" +
        '<span class="check-name">' + part.name + "</span>" +
        '<span class="check-count"><strong>' + n + "</strong> / " + part.total + "</span>";
      checklist.appendChild(li);
    });

    const placed = state.pieces.length;
    const totalKit = KIT.reduce((s, p) => s + p.total, 0);
    $("#total-count").textContent = placed + " / " + totalKit;
    $("#progress-fill").style.width = (totalKit ? (placed / totalKit) * 100 : 0) + "%";
    $("#stage-coords").textContent =
      "FIELD SITE · " + placed + " PART" + (placed === 1 ? "" : "S");

    renderPrintList(used);
  }

  function renderPrintList(used) {
    const list = $("#print-list");
    list.innerHTML = "";
    KIT.forEach((part) => {
      const n = used[part.id] || 0;
      const li = document.createElement("li");
      li.innerHTML =
        "<span>" + part.name + "</span><span>" + n + " / " + part.total + " used</span>";
      list.appendChild(li);
    });
  }

  function countByType() {
    const c = {};
    state.pieces.forEach((p) => (c[p.type] = (c[p.type] || 0) + 1));
    return c;
  }

  function remaining(type) {
    const used = countByType()[type] || 0;
    return KIT_BY_ID[type].total - used;
  }

  /* ================================================================
     CANVAS — placing & rendering pieces
     ================================================================ */
  function snap(v) {
    return state.snap ? Math.round(v / GRID) * GRID : Math.round(v);
  }

  function clamp(v, max) {
    return Math.max(0, Math.min(v, max));
  }

  function addPiece(type, x, y) {
    if (remaining(type) <= 0) {
      toast("Out of " + KIT_BY_ID[type].name + "s — check the manifest!");
      return;
    }
    const piece = {
      uid: uidSeq++,
      type,
      x: clamp(snap(x), canvas.clientWidth - PIECE),
      y: clamp(snap(y), canvas.clientHeight - PIECE),
      rot: 0,
    };
    state.pieces.push(piece);
    renderPiece(piece);
    afterChange();
  }

  function renderPiece(piece) {
    const part = KIT_BY_ID[piece.type];
    const el = document.createElement("div");
    el.className = "placed";
    el.dataset.uid = piece.uid;
    el.style.left = piece.x + "px";
    el.style.top = piece.y + "px";
    el.innerHTML =
      '<div class="piece-inner" style="transform:rotate(' + piece.rot + 'deg)">' +
      part.svg +
      "</div>" +
      '<div class="placed-tools">' +
        '<button class="rot" title="Rotate"><svg viewBox="0 0 24 24"><path d="M12 6V3L8 7l4 4V8a4 4 0 11-4 4H6a6 6 0 106-6z"/></svg></button>' +
        '<button class="del" title="Remove"><svg viewBox="0 0 24 24"><path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z"/></svg></button>' +
      "</div>";
    el.querySelector(".piece-inner").style.width = "100%";
    el.querySelector(".piece-inner").style.height = "100%";

    el.querySelector(".rot").addEventListener("click", (e) => {
      e.stopPropagation();
      piece.rot = (piece.rot + 45) % 360;
      el.querySelector(".piece-inner").style.transform = "rotate(" + piece.rot + "deg)";
      afterChange();
    });
    el.querySelector(".del").addEventListener("click", (e) => {
      e.stopPropagation();
      removePiece(piece.uid);
    });

    attachDrag(el, piece);
    canvas.appendChild(el);
  }

  function removePiece(uid) {
    state.pieces = state.pieces.filter((p) => p.uid !== uid);
    const el = canvas.querySelector('.placed[data-uid="' + uid + '"]');
    if (el) el.remove();
    if (selectedUid === uid) selectedUid = null;
    afterChange();
  }

  function selectPiece(uid) {
    selectedUid = uid;
    canvas.querySelectorAll(".placed").forEach((el) => {
      el.classList.toggle("selected", el.dataset.uid == uid);
    });
  }

  /* ---------- Pointer-based dragging of placed pieces -------------- */
  function attachDrag(el, piece) {
    let startX, startY, originX, originY, moved;

    el.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".placed-tools")) return; // let tool buttons work
      e.preventDefault();
      selectPiece(piece.uid);
      el.classList.add("dragging");
      el.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;
      originX = piece.x;
      originY = piece.y;
      moved = false;
    });

    el.addEventListener("pointermove", (e) => {
      if (startX === undefined) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      piece.x = clamp(snap(originX + dx), canvas.clientWidth - PIECE);
      piece.y = clamp(snap(originY + dy), canvas.clientHeight - PIECE);
      el.style.left = piece.x + "px";
      el.style.top = piece.y + "px";
    });

    const end = (e) => {
      if (startX === undefined) return;
      startX = undefined;
      el.classList.remove("dragging");
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      if (moved) persist();
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  /* ---------- Drag-and-drop from palette --------------------------- */
  canvas.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    canvas.classList.add("drop-active");
  });
  canvas.addEventListener("dragleave", (e) => {
    if (e.target === canvas) canvas.classList.remove("drop-active");
  });
  canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    canvas.classList.remove("drop-active");
    const type = e.dataTransfer.getData("text/plain");
    if (!KIT_BY_ID[type]) return;
    const r = canvas.getBoundingClientRect();
    addPiece(type, e.clientX - r.left - PIECE / 2, e.clientY - r.top - PIECE / 2);
  });

  // Click empty canvas → deselect
  canvas.addEventListener("pointerdown", (e) => {
    if (e.target === canvas || e.target.classList.contains("canvas-grid")) {
      selectedUid = null;
      canvas.querySelectorAll(".placed.selected").forEach((el) =>
        el.classList.remove("selected")
      );
    }
  });

  // Keyboard: Delete removes selected
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && selectedUid != null) {
      const tag = (document.activeElement.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      e.preventDefault();
      removePiece(selectedUid);
    }
  });

  /* ================================================================
     CHANGE / PERSISTENCE
     ================================================================ */
  function afterChange() {
    emptyHint.classList.toggle("hidden", state.pieces.length > 0);
    renderPalette();
    renderChecklist();
    persist();
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function rebuildCanvas() {
    canvas.querySelectorAll(".placed").forEach((el) => el.remove());
    uidSeq = 1;
    state.pieces.forEach((p) => {
      p.uid = uidSeq++;
      renderPiece(p);
    });
    $("#snap-toggle").checked = state.snap;
    emptyHint.classList.toggle("hidden", state.pieces.length > 0);
    renderPalette();
    renderChecklist();
  }

  /* ================================================================
     SAVE / SHARE / LOAD
     ================================================================ */
  function encodeState() {
    const min = {
      s: state.snap ? 1 : 0,
      p: state.pieces.map((p) => [p.type, p.x, p.y, p.rot]),
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(min))));
  }

  function decodeState(str) {
    try {
      const min = JSON.parse(decodeURIComponent(escape(atob(str))));
      return {
        snap: min.s !== 0,
        pieces: (min.p || [])
          .filter((a) => KIT_BY_ID[a[0]])
          .map((a) => ({ uid: 0, type: a[0], x: a[1], y: a[2], rot: a[3] || 0 })),
      };
    } catch (_) {
      return null;
    }
  }

  function doShare() {
    const url =
      location.origin + location.pathname + "#build=" + encodeState();
    const finish = (ok) =>
      toast(ok ? "Shareable link copied to clipboard!" : "Copy this link: " + url);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => finish(true), () => finish(false));
    } else {
      finish(false);
    }
    history.replaceState(null, "", "#build=" + encodeState());
  }

  function doSave() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "epic-fort-blueprint.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    toast("Blueprint saved to your device!");
  }

  function loadInitial() {
    // 1) URL hash takes priority (shared link)
    const m = location.hash.match(/build=([^&]+)/);
    if (m) {
      const s = decodeState(m[1]);
      if (s) { state = s; rebuildCanvas(); toast("Loaded a shared build!"); return; }
    }
    // 2) localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s && Array.isArray(s.pieces)) { state = s; rebuildCanvas(); return; }
      }
    } catch (_) {}
    // 3) fresh
    rebuildCanvas();
  }

  /* ================================================================
     UI WIRING
     ================================================================ */
  $("#snap-toggle").addEventListener("change", (e) => {
    state.snap = e.target.checked;
    persist();
    toast(state.snap ? "Grid snap ON" : "Grid snap OFF — freehand mode");
  });

  $("#btn-clear").addEventListener("click", () => {
    if (state.pieces.length === 0) return;
    if (confirm("Clear the entire build site? This cannot be undone.")) {
      state.pieces = [];
      selectedUid = null;
      rebuildCanvas();
      persist();
      toast("Site cleared — ready for a new expedition.");
    }
  });

  $("#btn-share").addEventListener("click", doShare);
  $("#btn-save").addEventListener("click", doSave);
  $("#btn-print").addEventListener("click", () => window.print());

  // Help modal
  const modal = $("#help-modal");
  $("#btn-help").addEventListener("click", () => (modal.hidden = false));
  $("#help-close").addEventListener("click", () => (modal.hidden = true));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) modal.hidden = true;
  });

  /* ---------- Toast ------------------------------------------------ */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------- Boot ------------------------------------------------- */
  loadInitial();
})();
