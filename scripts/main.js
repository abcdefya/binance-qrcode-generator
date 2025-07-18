import { setupPageContainerObserver, setupObserver, waitForPageContainer } from './domObserver.js';
import { extractBankTransferInfo } from './transferInfoExtractor.js';
import { generateQRUrl } from './qrGenerator.js';
import { showQRImage, removeQRContainer } from './qrDisplay.js';
import { initializeSettings, setupMessageListener, getAutoShowQR } from './settingsManager.js';

async function handleTransactionPopup(popupNode) {
  try {
    if (!getAutoShowQR()) {
      return;
    }
    if (!popupNode) {
      removeQRContainer();
      return;
    }
    const transferInfo = await extractBankTransferInfo(popupNode);
    console.log('QR Generator: Kết quả trích xuất transferInfo:', transferInfo);
    if (!transferInfo || !transferInfo.accountNumber || !transferInfo.bankBin) {
      console.error('QR Generator: Không thể trích xuất đủ thông tin giao dịch');
      return;
    }
    console.log('QR Generator: Thông tin giao dịch:', transferInfo);
    const qrUrl = generateQRUrl(transferInfo);
    console.log('QR Generator: Đường link QR:', qrUrl);
    
    if (getAutoShowQR() && qrUrl) {
      showQRImage(qrUrl);
    }
  } catch (error) {
    console.error('QR Generator: Lỗi khi xử lý popup giao dịch:', error);
  }
}

function initialize() {
  initializeSettings();
  setupMessageListener(removeQRContainer);
  setupPageContainerObserver((pageContainer) => {
    setupObserver(pageContainer, handleTransactionPopup);
  });
  window.addEventListener('load', () => {
    waitForPageContainer((pageContainer) => {
      setupObserver(pageContainer, handleTransactionPopup);
    });
    const existingPopups = document.querySelectorAll('div[role="presentation"].bn-mask.bn-modal');
    existingPopups.forEach(popup => {
      handleTransactionPopup(popup);
    });
  });
}

initialize();

export { handleTransactionPopup }; 