// content.js
window.addEventListener('load', () => {
    console.log('QR Generator: Trang đã tải, khởi tạo extension');
    window.QRGenerator.initializeSettings();
    window.QRGenerator.setupMessageListener(window.QRGenerator.removeQRContainer);
    window.QRGenerator.setupPageContainerObserver();
    // Kiểm tra các popup hiện có
    const existingPopups = document.querySelectorAll('div[role="presentation"].bn-mask.bn-modal');
    existingPopups.forEach(popup => {
      console.log('QR Generator: Tìm thấy popup hiện có', popup);
      window.QRGenerator.handleTransactionPopup(popup);
    });
  });