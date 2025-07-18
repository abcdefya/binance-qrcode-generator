// main.js
async function handleTransactionPopup(popupNode) {
  console.log('QR Generator: Xử lý popup giao dịch', popupNode);
  try {
    if (!window.QRGenerator.getAutoShowQR()) {
      console.log('QR Generator: autoShowQR = false, không hiển thị QR');
      return;
    }
    if (!popupNode) {
      console.warn('QR Generator: Không có popupNode');
      window.QRGenerator.removeQRContainer();
      return;
    }
    const transferInfo = await window.QRGenerator.extractBankTransferInfo(popupNode);
    console.log('QR Generator: Kết quả trích xuất transferInfo:', transferInfo);
    if (!transferInfo || !transferInfo.accountNumber || !transferInfo.bankBin) {
      console.error('QR Generator: Không thể trích xuất thông tin chuyển khoản hợp lệ', transferInfo);
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
window.QRGenerator.handleTransactionPopup = handleTransactionPopup;