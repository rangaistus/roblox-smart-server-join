const languageSelect = document.getElementById("language");

// initialize select
chrome.storage.sync.get("language", ({ language = "en" }) => {
    languageSelect.value = language;
});

// on change, save new language
languageSelect.addEventListener("change", () => {
    chrome.storage.sync.set({ language: languageSelect.value });
});

// if you still want to react live to changes elsewhere:
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.language) {
        languageSelect.value = changes.language.newValue;
    }
});
