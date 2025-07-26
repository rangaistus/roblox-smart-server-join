(async function () {
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                const el = document.querySelector(selector);
                if (el) {
                    clearInterval(interval);
                    resolve(el);
                }
            }, 100);
            setTimeout(() => {
                clearInterval(interval);
                reject(new Error("Element not found: " + selector));
            }, timeout);
        });
    }

    const translations = {
        en: {
            joinSmart: "Join Smart Server",
            noPlaceId: "Could not find placeId.",
            noServer: "No suitable server found.",
            launcherNotFound: "Roblox launcher not found."
        },
        tr: {
            joinSmart: "Akıllı Sunucuya Katıl",
            noPlaceId: "Oyun kimliği bulunamadı.",
            noServer: "Uygun sunucu bulunamadı.",
            launcherNotFound: "Roblox başlatıcısı bulunamadı."
        },
        nl: {
            joinSmart: "Slimme Server Betreden",
            noPlaceId: "Kon geen plaats-ID vinden.",
            noServer: "Geen geschikte server gevonden.",
            launcherNotFound: "Roblox launcher niet gevonden."
        }
    };

    // 1) load initial language and get its `t`
    const initialLang = await new Promise(r =>
        chrome.storage.sync.get(['language'], data => r(data.language || 'en'))
    );
    let t = translations[initialLang];

    // 2) set up listener so changing the dropdown updates our button live
    let joinBtn;
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.language) {
            const newLang = changes.language.newValue || 'en';
            t = translations[newLang];
            if (joinBtn) joinBtn.innerText = t.joinSmart;
        }
    });

    // 3) now wait for the play-button container, then create *one* button
    try {
        const container = await waitForElement(".game-details-play-button-container");

        joinBtn = document.createElement("button");
        joinBtn.innerText = t.joinSmart;
        Object.assign(joinBtn.style, {
            marginTop: "10px",
            width: "100%",
            padding: "10px",
            fontSize: "14px",
            backgroundColor: "#335fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold"
        });

        container.parentElement.insertBefore(joinBtn, container.nextSibling);

        joinBtn.addEventListener('click', async () => {
            const m = window.location.pathname.match(/\/games\/(\d+)/);
            if (!m) return alert(t.noPlaceId);
            const placeId = m[1];

            try {
                const userId = await getCurrentUserId();
                const friendIds = await getFriendUserIds(userId);
                const best = await findBestServer(placeId, friendIds);
                if (!best) return alert(t.noServer);

                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('inject.js');
                script.dataset.smartJoin = JSON.stringify({ placeId, gameId: best.id });
                document.body.appendChild(script);

            } catch (err) {
                console.error("Smart-join failed", err);
                alert(t.noServer);
            }
        });

    } catch (e) {
        console.error("Failed to inject smart join button:", e);
    }

    async function getCurrentUserId() {
        const res = await fetch("https://users.roblox.com/v1/users/authenticated", { credentials: "include" });
        return (await res.json()).id;
    }

    async function getFriendUserIds(userId) {
        const res = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends`, { credentials: "include" });
        return (await res.json()).data.map(f => f.id);
    }

    async function findBestServer(placeId, friendIds) {
        let cursor = null;
        let backoff = 500;

        do {
            const url = new URL(`https://games.roblox.com/v1/games/${placeId}/servers/Public`);
            url.searchParams.set("limit", "100");
            if (cursor) url.searchParams.set("cursor", cursor);

            const res = await fetch(url);
            if (res.status === 429) {
                await new Promise(r => setTimeout(r, backoff));
                backoff = Math.min(10000, backoff * 2);
                continue;
            }
            backoff = 500;

            const { data, nextPageCursor } = await res.json();
            const openNoFriend = data.filter(s =>
                Array.isArray(s.playerTokens) &&
                s.playerTokens.length < s.maxPlayers &&
                !s.playerTokens.some(tok => friendIds.includes(tok))
            );

            if (openNoFriend.length) {
                return openNoFriend.sort((a, b) => a.ping - b.ping)[0];
            }

            cursor = nextPageCursor;
            await new Promise(r => setTimeout(r, 300));
        } while (cursor);

        throw new Error("No suitable server found");
    }

})();
