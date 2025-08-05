/* ===========================
   Config / Globals
   =========================== */

const BASE_URL = "https://newsapi.org/v2/everything";

const categories = [
  "technology",
  "sports",
  "politics",
  "india",
  "education",
  "startup",
  "ai",
  "bitcoin",
  "election",
  "cricket",
  "space",
  "weather",
  "stock market",
  "entertainment",
  "health",
];

let page = 1;
let currentQuery = "technology";
let isLoading = false;
let isSavedView = false;

const newsContainer = document.getElementById("newsContainer");
const loader = document.getElementById("loader");
const categoriesContainer = document.getElementById("categories");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const savedNavBtn = document.getElementById("savedNavBtn");
const savedCountBadge = document.getElementById("savedCountBadge");
const homeLink = document.getElementById("homeLink");

const modalEl = document.getElementById("newsModal");
const bsModal = new bootstrap.Modal(modalEl);
const modalTitle = document.getElementById("newsModalTitle");
const modalImage = document.getElementById("newsModalImage");
const modalContent = document.getElementById("newsModalContent");
const modalSource = document.getElementById("newsModalSource");
const modalLink = document.getElementById("newsOriginalLink");

const toggleThemeBtn = document.getElementById("toggleTheme");
const scrollTopBtn = document.getElementById("scrollTopBtn");

const SAVED_KEY = "savedArticles_v1";

/* ===========================
   Initialization
   =========================== */
window.addEventListener("DOMContentLoaded", () => {
  renderCategories();
  loadThemeFromStorage();
  attachHandlers();
  updateSavedCount(); // show count on load
  fetchNews(currentQuery);

  // infinite scroll
  window.addEventListener("scroll", handleScrollInfinite);
  // scroll top button show/hide
  window.addEventListener("scroll", handleScrollTopBtn);
});

/* ===========================
   UI Renderers
   =========================== */
function renderCategories() {
  categoriesContainer.innerHTML = "";
  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline-primary btn-sm text-uppercase";
    btn.innerText = cat;
    btn.onclick = () => {
      isSavedView = false;
      currentQuery = cat;
      page = 1;
      fetchNews(cat);
    };
    categoriesContainer.appendChild(btn);
  });
}

function createArticleCard(article) {
  const col = document.createElement("div");
  col.className = "col-md-4";
  const fallbackImage = `https://placehold.co/600x400?text=No image found`;

  const imgSrc = article.urlToImage || fallbackImage;

  const savedArticles = getSavedArticles();
  const isSaved = savedArticles.some((a) => a.url === article.url);

  col.innerHTML = `
    <div class="card h-100 shadow-sm">
      <img src="${imgSrc}" class="card-img-top" alt="image"/>
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${escapeHtml(article.title || "")}</h5>
        <p class="card-text text-truncate-3">${escapeHtml(
          article.description || ""
        )}</p>
        <div class="mt-auto d-flex justify-content-between align-items-center">
          <div>
            <button class="btn btn-sm btn-outline-primary btn-read">Read More</button>
            <button class="btn btn-sm btn-outline-success btn-save">${
              isSaved ? "Saved" : "Save"
            }</button>
          </div>
          <small class="text-muted">${new Date(
            article.publishedAt
          ).toLocaleString()}</small>
        </div>
      </div>
    </div>
  `;

  // attach listeners
  const readBtn = col.querySelector(".btn-read");
  readBtn.addEventListener("click", () => showModal(article));

  const saveBtn = col.querySelector(".btn-save");
  saveBtn.addEventListener("click", () => {
    toggleSaveArticle(article, saveBtn);
  });

  return col;
}

function displayArticles(articles, append = false) {
  if (!append) newsContainer.innerHTML = "";
  articles.forEach((article) => {
    newsContainer.appendChild(createArticleCard(article));
  });
}

/* ===========================
   Fetching & Infinite Scroll
   =========================== */
async function fetchNews(query, append = false) {
  if (isLoading) return;
  isLoading = true;
  toggleLoader(true);

  const pageSize = 9;
  const url = `/.netlify/functions/news?q=${encodeURIComponent(
    query
  )}&page=${page}`;
  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "ok") {
      console.error("API error:", data);
      if (!append)
        newsContainer.innerHTML =
          '<p class="text-danger">Failed to fetch news.</p>';
      return;
    }

    if (data.articles && data.articles.length) {
      displayArticles(data.articles, append);
    } else if (!append) {
      newsContainer.innerHTML = `<p class="text-muted">No news found for "${query}".</p>`;
    }
  } catch (err) {
    console.error(err);
    if (!append)
      newsContainer.innerHTML =
        '<p class="text-danger">Something went wrong.</p>';
  } finally {
    isLoading = false;
    toggleLoader(false);
  }
}

function handleScrollInfinite() {
  if (isSavedView) return; // don't infinite-load in saved view
  if (
    window.innerHeight + window.scrollY >= document.body.scrollHeight - 120 &&
    !isLoading
  ) {
    page++;
    fetchNews(currentQuery, true);
  }
}

/* ===========================
   Loader
   =========================== */
function toggleLoader(show) {
  loader.classList.toggle("d-none", !show);
  if (show && page === 1) {
    newsContainer.classList.add("d-none");
  } else {
    newsContainer.classList.remove("d-none");
  }
}

/* ===========================
   Modal
   =========================== */
function showModal(article) {
  const fallbackImage = `https://placehold.co/700x400?text=No image found`;
  const imgSrc = article.urlToImage || fallbackImage;
  modalTitle.textContent = article.title || "";
  modalImage.src = imgSrc;
  modalContent.textContent = article.content || article.description || "";
  modalSource.textContent = `Source: ${
    article.source?.name || "Unknown"
  } • ${new Date(article.publishedAt).toLocaleString()}`;
  modalLink.href = article.url || "#";
  bsModal.show();
}

/* ===========================
   Save / Saved Page (localStorage)
   =========================== */
function getSavedArticles() {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setSavedArticles(list) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  updateSavedCount();
}

function toggleSaveArticle(article, buttonEl) {
  const saved = getSavedArticles();
  const exists = saved.find((a) => a.url === article.url);
  if (exists) {
    const next = saved.filter((a) => a.url !== article.url);
    setSavedArticles(next);
    if (buttonEl) buttonEl.innerText = "Save";
  } else {
    // store minimal fields necessary
    const toSave = {
      title: article.title,
      description: article.description,
      urlToImage: article.urlToImage,
      url: article.url,
      source: article.source,
      publishedAt: article.publishedAt,
      content: article.content,
    };
    saved.unshift(toSave);
    setSavedArticles(saved);
    if (buttonEl) buttonEl.innerText = "Saved";
  }

  // If currently in saved view, re-render to reflect change
  if (isSavedView) renderSavedPage();
}

function renderSavedPage() {
  isSavedView = true;
  newsContainer.innerHTML = "";
  const saved = getSavedArticles();
  if (!saved.length) {
    newsContainer.innerHTML = `<p class="text-muted">No saved articles yet.</p>`;
    return;
  }

  saved.forEach((article) => {
    const card = createArticleCard(article);
    // give remove button functionality when in saved view:
    const removeBtn = card.querySelector(".btn-save");
    removeBtn.innerText = "Remove";
    removeBtn.addEventListener("click", () => {
      toggleSaveArticle(article, removeBtn);
    });
    newsContainer.appendChild(card);
  });
}

function updateSavedCount() {
  const saved = getSavedArticles();
  savedCountBadge.textContent = saved.length;
}

/* ===========================
   Theme (dark/light)
   =========================== */
function toggleTheme() {
  const current =
    document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  styleToggleButton(next);
}

function loadThemeFromStorage() {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  styleToggleButton(saved);
}

function styleToggleButton(theme) {
  if (!toggleThemeBtn) return;
  if (theme === "dark") {
    toggleThemeBtn.textContent = "☀️"; // sun to indicate switch to light
    toggleThemeBtn.classList.remove("btn-outline-dark");
    toggleThemeBtn.classList.add("btn-outline-light");
  } else {
    toggleThemeBtn.textContent = "🌙"; // moon to indicate switch to dark
    toggleThemeBtn.classList.remove("btn-outline-light");
    toggleThemeBtn.classList.add("btn-outline-dark");
  }
}

/* ===========================
   Navbar / Search / Views
   =========================== */
function attachHandlers() {
  searchBtn.addEventListener("click", () => {
    const q = searchInput.value.trim();
    if (!q) return;
    isSavedView = false;
    currentQuery = q;
    page = 1;
    fetchNews(currentQuery);
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchBtn.click();
  });

  savedNavBtn.addEventListener("click", () => {
    renderSavedPage();
  });

  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    isSavedView = false;
    page = 1;
    currentQuery = "technology";
    fetchNews(currentQuery);
  });

  toggleThemeBtn.addEventListener("click", toggleTheme);

  // scroll-top click
  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ===========================
   Scroll top button behavior
   =========================== */
function handleScrollTopBtn() {
  if (window.scrollY > 400) {
    scrollTopBtn.style.display = "flex";
  } else {
    scrollTopBtn.style.display = "none";
  }
}

/* ===========================
   Utils
   =========================== */
function escapeHtml(unsafe = "") {
  return String(unsafe)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
