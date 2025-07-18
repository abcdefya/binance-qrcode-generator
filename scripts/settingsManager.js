let autoShowQR = true;
let showTransferInfo = true;

function initializeSettings() {
  chrome.storage.sync.get({
    autoShowQR: true,
    showTransferInfo: true
  }, (settings) => {
    autoShowQR = settings.autoShowQR;
    showTransferInfo = settings.showTransferInfo;
  });
}

function setupMessageListener(removeQRCallback) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SETTINGS_CHANGED') {
      if (message.settings.hasOwnProperty('autoShowQR')) {
        autoShowQR = message.settings.autoShowQR;
        if (!autoShowQR) {
          removeQRCallback();
        }
      }
      if (message.settings.hasOwnProperty('showTransferInfo')) {
        showTransferInfo = message.settings.showTransferInfo;
      }
      sendResponse({ success: true });
    }
    return true;
  });
}

function getAutoShowQR() {
  return autoShowQR;
}

function getShowTransferInfo() {
  return showTransferInfo;
}

export { initializeSettings, setupMessageListener, getAutoShowQR, getShowTransferInfo }; 