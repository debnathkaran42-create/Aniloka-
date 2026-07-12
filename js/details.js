/* ANILOKA — MANGA DETAILS PAGE */
(function () {
  if (!AUTH.requireLogin()) return;
  const session = DB.getSession();
  const id = qs("id");
  const manga = DB.getManga(id);

  if (!manga) {
    document.getElementById("details-root").innerHTML = `
      <div class="empty-state">
        <h3>Manga not found</h3>
        <p>This title may have been removed or the link is incorrect.</p>
        <a class="btn btn-primary" href="home.html">Back to Home</a>
      </div>`;
    hidePageLoader();
    return;
  }

  document.title = `${manga.title} — AniLoka`;

  async function setBg(el, value) {
    if (value && value.startsWith("idb://")) {
      const url = await AssetStore.getObjectURL(value.slice(6));
      if (url) el.style.backgroundImage = `url('${url}')`;
    } else if (value) {
      el.style.backgroundImage = `url('${value}')`;
    }
  }
  setBg(document.getElementById("hero-bg"), manga.banner);

  const coverBox = document.getElementById("cover-box");
  const coverIsIDB = (manga.cover || "").startsWith("idb://");
  coverBox.innerHTML = `<img ${coverIsIDB ? `data-src="${manga.cover}"` : `src="${manga.cover}"`} alt="${manga.title}" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden')"><div class="cover-placeholder hidden">${manga.title}</div>`;
  hydrateImages(coverBox);

  document.getElementById("m-title").textContent = manga.title;
  document.getElementById("m-meta").innerHTML = `
    <span><b>Author:</b> ${manga.author}</span>
    <span><b>Artist:</b> ${manga.artist}</span>
    <span><b>Publisher:</b> ${manga.publisher}</span>
    <span><b>Status:</b> ${manga.status}</span>
    <span><b>Year:</b> ${manga.year}</span>
    <span><b>Chapters:</b> ${manga.chapters.length}</span>
    <span class="rating-badge">${icon("star",13)} ${manga.rating}</span>`;
  document.getElementById("m-genres").innerHTML = manga.genres.map(g => `<span>${g}</span>`).join("");
  document.getElementById("m-desc").textContent = manga.description;

  const firstCh = manga.chapters[0];
  const progress = DB.getProgress(session.uid)[manga.id];
  const readHref = progress
    ? `reader.html?id=${manga.id}&ch=${progress.chapterId}`
    : `reader.html?id=${manga.id}&ch=${firstCh?.id || ""}`;
  document.getElementById("read-now-btn").href = readHref;
  document.getElementById("read-now-btn").textContent = progress ? "Continue Reading" : "Read Now";

  /* ---- Favorite / bookmark state ---- */
  const lib = DB.getLibrary(session.uid);
  const favBtn = document.getElementById("fav-btn");
  function syncFavBtn() { favBtn.classList.toggle("active", lib.favorites.includes(manga.id)); }
  syncFavBtn();
  favBtn.addEventListener("click", () => {
    Object.assign(lib, DB.toggleFavorite(session.uid, manga.id));
    syncFavBtn();
    toast(lib.favorites.includes(manga.id) ? "Added to favorites" : "Removed from favorites", "success");
  });

  document.getElementById("library-select").addEventListener("change", (e) => {
    DB.setStatus(session.uid, manga.id, e.target.value || null);
    toast("Library updated", "success");
  });
  const curStatus = ["reading", "completed", "planToRead"].find(s => lib[s]?.includes(manga.id)) || "";
  document.getElementById("library-select").value = curStatus;

  document.getElementById("share-btn").addEventListener("click", async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: manga.title, url }); } catch (e) {} }
    else { await navigator.clipboard.writeText(url); toast("Link copied to clipboard", "success"); }
  });

  /* ---- Chapters (paid chapters lock unless Premium or already purchased) ---- */
  const chapterList = document.getElementById("chapter-list");

  function renderChapters() {
    const bookmarks = DB.getLibrary(session.uid).bookmarks[manga.id] || [];
    chapterList.innerHTML = manga.chapters.map(ch => {
      const unlocked = DB.canAccessChapter(session.uid, manga.id, ch);
      const paidBadge = ch.paid ? `<span class="paid-badge">${unlocked ? "Unlocked" : "Paid"}</span>` : "";
      const left = `
        <span class="ch-num">${String(ch.number).padStart(2, "0")}</span>
        <span>
          <div class="ch-title">${ch.title}${paidBadge}</div>
          <div class="ch-date">${ch.date}</div>
        </span>`;

      if (unlocked) {
        return `
        <div class="chapter-row">
          <a class="ch-left" href="reader.html?id=${manga.id}&ch=${ch.id}" style="flex:1;">${left}</a>
          <button class="bookmark-btn ${bookmarks.includes(ch.id) ? "active" : ""}" data-ch="${ch.id}" title="Bookmark chapter">${icon(bookmarks.includes(ch.id) ? "bookmarkFilled" : "bookmark", 16)}</button>
        </div>`;
      }
      return `
        <div class="chapter-row locked">
          <button class="ch-left" data-buy="${ch.id}" style="flex:1; background:none; border:none; text-align:left; cursor:pointer;">${left}</button>
          <span class="price-tag" data-buy="${ch.id}" style="cursor:pointer;">${icon("lock",12)} ₹${Number(ch.price || 0).toFixed(2)}</span>
        </div>`;
    }).join("") || `<div class="empty-state"><p>No chapters yet.</p></div>`;

    chapterList.querySelectorAll(".bookmark-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        DB.toggleBookmark(session.uid, manga.id, btn.dataset.ch);
        renderChapters();
      });
    });
    chapterList.querySelectorAll("[data-buy]").forEach(el => {
      el.addEventListener("click", () => openChapterCheckout(el.dataset.buy));
    });
  }

  function openChapterCheckout(chapterId) {
    const ch = manga.chapters.find(c => c.id === chapterId);
    if (!ch) return;

    const openedReal = openRazorpayCheckout({
      amountRupees: Number(ch.price || 0),
      description: `${manga.title} — ${ch.title}`,
      prefillEmail: session.email,
      onSuccess: () => {
        DB.purchaseChapter(session.uid, manga.id, ch.id);
        toast(`Unlocked "${ch.title}"`, "success");
        renderChapters();
      }
    });
    if (openedReal) return;

    // Free default: real UPI payment page (QR + manual admin verification)
    window.location.href = `payment.html?type=chapter&mangaId=${manga.id}&ch=${ch.id}`;
  }

  renderChapters();

  // If the reader bounced the user back here for a locked chapter, open checkout for it automatically
  const lockedChId = qs("locked");
  if (lockedChId) openChapterCheckout(lockedChId);

  /* ---- Recommendations ---- */
  const recs = DB.getAllManga().filter(m => m.id !== manga.id).slice(0, 8);
  renderRail("rail-recs", recs);

  /* ---- Reviews (local only) ---- */
  const REVIEWS_KEY = "aniloka_reviews_" + manga.id;
  function loadReviews() { return DB._read(REVIEWS_KEY, []); }
  function renderReviews() {
    const reviews = loadReviews();
    document.getElementById("review-list").innerHTML = reviews.length
      ? reviews.map(r => `
        <div class="review-item">
          <div class="rev-head"><span>${escapeHTML(r.user)}</span><span>${icon("star",12)} ${r.rating}</span></div>
          <div class="rev-body">${escapeHTML(r.text)}</div>
        </div>`).join("")
      : `<div class="empty-state"><p>No reviews yet. Be the first to share your thoughts.</p></div>`;
  }
  renderReviews();

  document.getElementById("review-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = document.getElementById("review-text").value.trim();
    const rating = document.getElementById("review-rating").value;
    if (!text) return;
    const reviews = loadReviews();
    reviews.unshift({ user: session.username, text, rating, at: Date.now() });
    DB._write(REVIEWS_KEY, reviews);
    document.getElementById("review-text").value = "";
    renderReviews();
    toast("Review posted", "success");
  });

  /* ---- Tabs ---- */
  document.querySelectorAll(".details-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".details-tabs button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById("panel-" + btn.dataset.tab).classList.remove("hidden");
    });
  });

  initNav("");
  initTopnavSearch();
  hidePageLoader();
})();
