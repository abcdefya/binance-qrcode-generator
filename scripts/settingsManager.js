// settingsManager.js
let autoShowQR = true;
let showTransferInfo = true;

function initializeSettings() {
  console.log('QR Generator: Khởi tạo cài đặt');
  chrome.storage.sync.get({
    autoShowQR: true,
    showTransferInfo: true
  }, (settings) => {
    autoShowQR = settings.autoShowQR;
    showTransferInfo = settings.showTransferInfo;
    console.log('QR Generator: Cài đặt - autoShowQR:', autoShowQR, 'showTransferInfo:', showTransferInfo);
  });
}

function setupMessageListener(removeQRCallback) {
  console.log('QR Generator: Thiết lập message listener');
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('QR Generator: Nhận tin nhắn:', message);
    if (message.type === 'SETTINGS_CHANGED') {
      if (message.settings.hasOwnProperty('autoShowQR')) {
        autoShowQR = message.settings.autoShowQR;
        console.log('QR Generator: Cập nhật autoShowQR:', autoShowQR);
        if (!autoShowQR) {
          removeQRCallback();
        }
      }
      if (message.settings.hasOwnProperty('showTransferInfo')) {
        showTransferInfo = message.settings.showTransferInfo;
        console.log('QR Generator: Cập nhật showTransferInfo:', showTransferInfo);
      }
      sendResponse({ success: true });
    } else if (message.type === 'GET_SETTINGS') {
      sendResponse({
        autoShowQR: autoShowQR,
        showTransferInfo: showTransferInfo
      });
    }
    return true;
  });
}

function getAutoShowQR() {
  console.log('QR Generator: Truy vấn autoShowQR:', autoShowQR);
  return autoShowQR;
}

// Gắn vào đối tượng toàn cục QRGenerator
window.QRGenerator = window.QRGenerator || {};
window.QRGenerator.initializeSettings = initializeSettings;
window.QRGenerator.setupMessageListener = setupMessageListener;
window.QRGenerator.getAutoShowQR = getAutoShowQR;