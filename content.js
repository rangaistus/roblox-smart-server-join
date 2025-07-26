(async function() {
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

  const language = await new Promise(resolve => {
    chrome.storage.sync.get(['language'], function(data) {
      resolve(data.language || 'en');
    });
  });

  const translations = {
    en: {
      joinSmart: "Join Smart Server",
      noPlaceId: "Could not find placeId.",
      noServer: "No suitable server found."
    },
    tr: {
      joinSmart: "Akıllı Sunucuya Katıl",
      noPlaceId: "Oyun kimliği bulunamadı.",
      noServer: "Uygun sunucu bulunamadı."
    },
    nl: {
      joinSmart: "Slimme Server Betreden",
      noPlaceId: "Kon geen plaats-ID vinden.",
      noServer: "Geen geschikte server gevonden."
    }
  };

  const t = translations[language];

  try {
    const container = await waitForElement(".game-details-play-button-container");

    // Create the button
    const joinButton = document.createElement("button");
    joinButton.innerText = t.joinSmart;
    joinButton.style.marginTop = "10px";
    joinButton.style.width = "100%";
    joinButton.style.padding = "10px";
    joinButton.style.fontSize = "14px";
    joinButton.style.backgroundColor = "#335fff";
    joinButton.style.border = "none";
    joinButton.style.borderRadius = "6px";
    joinButton.style.cursor = "pointer";
    joinButton.style.fontWeight = "bold";

    container.parentElement.insertBefore(joinButton, container.nextSibling);

    joinButton.onclick = async () => {
      const placeIdMatch = window.location.href.match(/games\/(\d+)/);
      if (!placeIdMatch) return alert(t.noPlaceId);
      const placeId = placeIdMatch[1];

      const userId = await getCurrentUserId();
      const friends = await getFriendUserIds(userId);
      const servers = await getPublicServers(placeId);

      const bestServer = servers
        .filter(s => !s.players?.some(p => friends.includes(p.id)))
        .sort((a, b) => a.ping - b.ping)[0];

      if (!bestServer) return alert(t.noServer);

      const url = `roblox://join?placeId=${placeId}&gameId=${bestServer.id}`;
      window.location.href = url;
    };
  } catch (e) {
    console.error("Failed to inject smart join button:", e);
  }

  async function getCurrentUserId() {
    const res = await fetch("https://users.roblox.com/v1/users/authenticated", {
      credentials: "include"
    });
    const data = await res.json();
    return data.id;
  }

  async function getFriendUserIds(userId) {
    const res = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends`, {
      credentials: "include"
    });
    const data = await res.json();
    return data.data.map(f => f.id);
  }

  async function getPublicServers(placeId) {
    let servers = [];
    let cursor = null;
    do {
      const url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      servers = servers.concat(data.data);
      cursor = data.nextPageCursor;
    } while (cursor && servers.length < 300);
    return servers;
  }
})();