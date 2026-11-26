import { applyPageLanguage, languages } from "./i18n.js?v=2";

const requestedLanguage = new URLSearchParams(location.search).get("lang");
const homeLinks = document.querySelectorAll("[data-home-link]");

function renderLanguage(language) {
  const strings = applyPageLanguage(language);
  document.title = `${strings.imprint} · ${strings.siteName}`;
  for (const link of homeLinks) {
    const url = new URL(link.href);
    url.searchParams.set("lang", language);
    link.href = url.href;
  }
}

renderLanguage(languages.includes(requestedLanguage) ? requestedLanguage : "hu");

for (const button of document.querySelectorAll("[data-language]")) {
  button.addEventListener("click", () => {
    const language = button.dataset.language;
    renderLanguage(language);
    const url = new URL(location.href);
    url.searchParams.set("lang", language);
    history.replaceState(null, "", url);
  });
}
