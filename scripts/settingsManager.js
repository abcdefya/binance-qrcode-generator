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
    } else if (message.type === 'GET_SETTINGS') {
      sendResponse({
        autoShowQR: autoShowQR,
        showTransferInfo: showTransferInfo
      });
    }
  });
}

function getAutoShowQR() {
  return autoShowQR;
}

// Gắn vào đối tượng toàn cục QRGenerator
window.QRGenerator = window.QRGenerator || {};
window.QRGenerator.initializeSettings = initializeSettings;
window.QRGenerator.setupMessageListener = setupMessageListener;
window.QRGenerator.getAutoShowQR = getAutoShowQR; 