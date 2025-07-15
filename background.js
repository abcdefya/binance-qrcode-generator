chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ isEnabled: true });
  });