import { loadCatalog, matchingItems, sheetUrl } from "./catalog.js";
import { languages, localized, messages } from "./i18n.js";
import { createMap } from "./map.js";

const params = new URLSearchParams(location.search);
const demo = params.get("demo") === "1";
const requestedLanguage = params.get("lang");
let language = languages.includes(requestedLanguage) ? requestedLanguage : "hu";
let view = params.get("view") === "map" ? "map" : "catalog";
let strings = messages[language];
let numberFormat = new Intl.NumberFormat(language);
let loadStatus = "loading";
let items = [];
let searchTimer;

const byId = (id) => document.getElementById(id);
const filterForm = byId("filters");
const fields = {
  search: byId("search"),
  category: byId("category"),
  locality: byId("locality"),
  type: byId("type"),
};
const resetFilters = byId("reset-filters");
const listPanel = byId("list-panel");
const resultsLayout = byId("results-layout");
const cards = byId("cards");
const listMessage = byId("list-message");
const mapMessage = byId("map-mode-message");
const detailDialog = byId("detail-dialog");
const detailContent = byId("detail-content");
const tileNotice = byId("tile-notice");
const viewLinks = document.querySelectorAll("[data-view]");
const languageButtons = document.querySelectorAll("[data-language]");
const map = createMap(byId("map"), byId("fit-map"), tileNotice, showDetails, strings);

function label(values) {
  return localized(values, language);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function action(text, callback, className = "button") {
  const button = element("button", className, text);
  button.type = "button";
  button.addEventListener("click", callback);
  return button;
}

function link(text, destination, className) {
  const anchor = element("a", className, text);
  anchor.href = destination;
  return anchor;
}

function previewUrl(enabled) {
  const url = new URL(location.href);
  if (enabled) url.searchParams.set("demo", "1");
  else url.searchParams.delete("demo");
  url.hash = "explore";
  return url.href;
}

function setLanguage(next) {
  language = next;
  strings = messages[language];
  numberFormat = new Intl.NumberFormat(language);
  document.documentElement.lang = language;
  document.title = strings.siteName;
  document.querySelector('meta[name="description"]').content = strings.heroDescription;
  document.querySelectorAll("[data-text]").forEach((node) => {
    node.textContent = strings[node.dataset.text];
  });
  document.querySelectorAll("[data-aria]").forEach((node) => {
    node.setAttribute("aria-label", strings[node.dataset.aria]);
  });
  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  });
  fields.search.placeholder = strings.searchPlaceholder;
  if (map) map.setLabels(strings);
  else tileNotice.textContent = strings.mapError;
  byId("exit-demo").href = previewUrl(false);
  updateFilterOptions();
  renderResults({ fit: false });
}

function setView(next) {
  const changed = view !== next;
  view = next;
  listPanel.hidden = view === "map";
  resultsLayout.classList.toggle("map-view", view === "map");
  viewLinks.forEach((anchor) => {
    if (anchor.dataset.view === view) anchor.setAttribute("aria-current", "true");
    else anchor.removeAttribute("aria-current");
  });
  updateMessages(lastVisible);
  if (changed && map) map.fitItems();
}

function updateSelect(select, keyFor, labelFor, defaultLabel) {
  const selected = select.value;
  const options = new Map();
  for (const item of items) {
    const key = keyFor(item);
    if (key && !options.has(key)) options.set(key, label(labelFor(item)));
  }
  const sorted = [...options].sort((left, right) => left[1].localeCompare(right[1], language));
  select.replaceChildren(new Option(defaultLabel, ""), ...sorted.map(([key, text]) => new Option(text, key)));
  select.value = options.has(selected) ? selected : "";
  select.disabled = !options.size;
}

function updateFilterOptions() {
  updateSelect(fields.category, (item) => item.categoryKey, (item) => item.category, strings.allOptions);
  updateSelect(fields.locality, (item) => item.localityKey, (item) => item.locality, strings.allOptions);
  fields.search.disabled = items.length === 0;
  fields.type.disabled = items.length === 0;
}

function makePhoto(item, className) {
  const photo = element("img", className);
  photo.alt = label(item.imageAlt);
  photo.loading = "lazy";
  photo.decoding = "async";
  photo.addEventListener("error", () => photo.remove(), { once: true });
  photo.src = item.image;
  return photo;
}

function itemMetadata(item) {
  const metadata = element("div", "item-meta");
  metadata.append(element("span", "category-label", label(item.category) || strings[item.kind]));
  if (label(item.locality)) metadata.append(element("span", "item-locality", label(item.locality)));
  return metadata;
}

function showOnMap(item) {
  if (!map) return;
  setView("map");
  updateUrl();
  byId("map-panel").scrollIntoView();
  map.focusItem(item.key);
}

function makeCard(item) {
  const card = element("li", "place-card");
  if (item.image) card.append(makePhoto(item, "card-photo"));
  const body = element("div", "card-body");
  const heading = element("h3", "card-title");
  heading.append(action(label(item.name), () => showDetails(item), "title-button"));
  body.append(itemMetadata(item), heading);
  const description = label(item.description);
  if (description) body.append(element("p", "card-description", description));
  if (item.geometry && map) {
    body.append(action(strings.viewOnMap, () => showOnMap(item), "text-button map-action"));
  }
  card.append(body);
  return card;
}

function imageCredit(item) {
  const credit = element("p", "photo-credit");
  credit.append(strings.credits + " · ");
  if (item.imageSource) credit.append(link(item.imageAuthor || strings.credits, item.imageSource));
  else credit.append(item.imageAuthor || "");
  if (item.imageLicense) {
    if (item.imageAuthor || item.imageSource) credit.append(" · ");
    credit.append(item.imageLicenseUrl ? link(item.imageLicense, item.imageLicenseUrl) : item.imageLicense);
  }
  return credit;
}

function showDetails(item) {
  detailContent.replaceChildren();
  if (item.image) detailContent.append(makePhoto(item, "dialog-photo"));
  const body = element("div", "dialog-body");
  const title = element("h2", "", label(item.name));
  title.id = "detail-title";
  body.append(itemMetadata(item), title);
  if (label(item.description)) body.append(element("p", "dialog-description", label(item.description)));
  const actions = element("div", "dialog-actions");
  if (item.geometry && map) {
    actions.append(action(strings.viewOnMap, () => {
      detailDialog.close();
      showOnMap(item);
    }, "button primary"));
  }
  if (item.website) actions.append(link(strings.website, item.website, "button"));
  if (actions.childElementCount) body.append(actions);
  if (item.image && (item.imageAuthor || item.imageSource || item.imageLicense)) body.append(imageCredit(item));
  detailContent.append(body);
  detailDialog.showModal();
}

function displayMessage(container, title, body, actions = []) {
  container.replaceChildren();
  container.hidden = !title;
  if (!title) return;
  if (body) container.append(element("h3", "", title), element("p", "", body));
  else container.append(element("p", "", title));
  if (actions.length) container.append(...actions);
}

function updateMessages(visible) {
  const target = view === "map" ? mapMessage : listMessage;
  const inactive = view === "map" ? listMessage : mapMessage;
  displayMessage(inactive);
  if (loadStatus === "loading") {
    displayMessage(target, strings.loading);
  } else if (loadStatus === "error") {
    const actions = [action(strings.retry, refreshCatalog, "button primary")];
    if (!demo) actions.push(link(strings.demoLink, previewUrl(true), "button"));
    displayMessage(target, strings.errorTitle, strings.errorBody, actions);
  } else if (!items.length) {
    const actions = demo ? [] : [link(strings.demoLink, previewUrl(true), "button primary")];
    displayMessage(target, strings.emptyTitle, strings.emptyBody, actions);
  } else if (!visible.length) {
    displayMessage(target, strings.noResultsTitle, strings.noResultsBody, [
      action(strings.reset, () => filterForm.reset(), "button"),
    ]);
  } else if (view === "map" && !visible.some((item) => item.geometry)) {
    displayMessage(target, strings.noGeometry);
  } else {
    displayMessage(target);
  }
}

let lastVisible = [];
function renderResults({ fit = true } = {}) {
  const filters = Object.fromEntries(Object.entries(fields).map(([name, control]) => [name, control.value]));
  resetFilters.disabled = !Object.values(filters).some(Boolean);
  const visible = matchingItems(items, filters);
  lastVisible = visible;
  const mappedCount = visible.filter((item) => item.geometry).length;
  byId("result-count").textContent = loadStatus === "ready"
    ? strings.count(numberFormat.format(visible.length), visible.length)
    : "";
  byId("mapped-count").textContent = loadStatus === "ready" && visible.length
    ? strings.mapped(numberFormat.format(mappedCount), numberFormat.format(visible.length))
    : "";
  cards.replaceChildren(...visible.map(makeCard));
  map?.setItems(visible, (item) => label(item.name), (item) => label(item.locality), fit);
  updateMessages(visible);
}

async function refreshCatalog() {
  loadStatus = "loading";
  renderResults({ fit: false });
  const url = demo ? new URL("./data/demo.csv", document.baseURI) : sheetUrl;
  try {
    items = await loadCatalog(url, document.baseURI);
    loadStatus = "ready";
  } catch (error) {
    console.warn("Catalog loading failed", error);
    loadStatus = "error";
  }
  updateFilterOptions();
  renderResults();
}

function updateUrl() {
  const url = new URL(location.href);
  url.searchParams.set("lang", language);
  if (view === "map") url.searchParams.set("view", view);
  else url.searchParams.delete("view");
  history.replaceState(null, "", url);
  byId("exit-demo").href = previewUrl(false);
}

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimeout(searchTimer);
  renderResults();
});
filterForm.addEventListener("reset", (event) => {
  event.preventDefault();
  clearTimeout(searchTimer);
  Object.values(fields).forEach((control) => { control.value = ""; });
  renderResults();
});
filterForm.addEventListener("change", (event) => {
  if (event.target.tagName === "SELECT") {
    clearTimeout(searchTimer);
    renderResults();
  }
});
fields.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderResults, 180);
});
viewLinks.forEach((anchor) => anchor.addEventListener("click", () => {
  setView(anchor.dataset.view);
  updateUrl();
}));
languageButtons.forEach((button) => button.addEventListener("click", () => {
  if (language === button.dataset.language) return;
  setLanguage(button.dataset.language);
  updateUrl();
}));

byId("demo-notice").hidden = !demo;
byId("sheet-link").href = sheetUrl;
setView(view);
setLanguage(language);
refreshCatalog();
