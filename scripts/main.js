// Main module to coordinate the QR Generator extension
async function initialize() {
  console.log('QR Generator: Khởi tạo extension');
  window.QRGenerator.initializeSettings();
  window.QRGenerator.setupMessageListener(window.QRGenerator.removeQRContainer);
  window.QRGenerator.waitForPageContainer(window.QRGenerator.setupObserver);
}

async function handleTransactionPopup(popupNode) {
  try {
    if (!window.QRGenerator.getAutoShowQR()) {
      return;
    }
    if (!popupNode) {
      window.QRGenerator.removeQRContainer();
      return;
    }
    const transferInfo = await window.QRGenerator.extractBankTransferInfo(popupNode);
    console.log('QR Generator: Kết quả trích xuất transferInfo:', transferInfo);
    if (!transferInfo || !transferInfo.accountNumber || !transferInfo.bankBin) {
      console.error('QR Generator: Không thể trích xuất thông tin chuyển khoản hợp lệ');
      window.QRGenerator.removeQRContainer();
      return;
    }
    const qrUrl = window.QRGenerator.generateQRUrl(transferInfo);
    console.log('QR Generator: URL mã QR:', qrUrl);
    window.QRGenerator.showQRImage(qrUrl);
  } catch (error) {
    console.error('QR Generator: Lỗi khi xử lý popup giao dịch:', error);
    window.QRGenerator.removeQRContainer();
  }
}

// Gắn vào đối tượng toàn cục QRGenerator
window.QRGenerator = window.QRGenerator || {};
window.QRGenerator.initialize = initialize;
window.QRGenerator.handleTransactionPopup = handleTransactionPopup; 