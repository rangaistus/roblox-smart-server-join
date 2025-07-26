const { placeId, gameId } = JSON.parse(document.currentScript.dataset.smartJoin);
setTimeout(() => {
    if (window.Roblox?.GameLauncher?.joinGameInstance) {
        Roblox.GameLauncher.joinGameInstance(placeId, gameId);
    } else {
        alert("Roblox launcher not found.");
    }
}, 500);
