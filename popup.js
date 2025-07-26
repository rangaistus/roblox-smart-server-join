const translations = {
    en: {
        heading: "Smart Join",
        languageLabel: "Language:",
    },
    tr: {
        heading: "Akıllı Sunucuya Katıl",
        languageLabel: "Dil:",
    },
    nl: {
        heading: "Slimme Server Betreden",
        languageLabel: "Taal:",
    },
};

const headingEl = document.getElementById("heading");
const langLabelEl = document.getElementById("langLabel");
const languageSelect = document.getElementById("language");

function applyPopupTranslations(lang) {
    const t = translations[lang] || translations.en;
    headingEl.innerText = t.heading;
    langLabelEl.innerText = t.languageLabel;
}

chrome.storage.sync.get("language", ({ language = "en" }) => {
    languageSelect.value = language;
    applyPopupTranslations(language);
});

languageSelect.addEventListener("change", () => {
    const newLang = languageSelect.value;
    chrome.storage.sync.set({ language: newLang });
    applyPopupTranslations(newLang);
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.language) {
        const newLang = changes.language.newValue || "en";
        languageSelect.value = newLang;
        applyPopupTranslations(newLang);
    }
});
