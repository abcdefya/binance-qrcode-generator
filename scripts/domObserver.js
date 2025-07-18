// domObserver.js
let isProcessing = false;

function waitForPageContainer(callback) {
  const pageContainer = document.getElementById('page-container') || document.body;
  if (pageContainer) {
    console.log('QR Generator: Tìm thấy pageContainer', pageContainer);
    callback(pageContainer);
  } else {
    console.warn('QR Generator: Không tìm thấy pageContainer, thử lại sau 100ms');
    setTimeout(() => waitForPageContainer(callback), 100);
  }
}

function setupPageContainerObserver(callback) {
  console.log('QR Generator: Thiết lập observer cho pageContainer');
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && (node.id === 'page-container' || node.tagName === 'BODY')) {
            console.log('QR Generator: Tìm thấy page-container hoặc body', node);
            callback(node);
            observer.disconnect();
          }
        });
      }
    });
  });
  const config = { childList: true, subtree: true };
  observer.observe(document.body, config);
}

function setupObserver(container, callback) {
  if (!container) {
    console.warn('QR Generator: Không có container để thiết lập observer');
    return;
  }
  console.log('QR Generator: Thiết lập observer cho container', container);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.classList &&
            (node.classList.contains('bn-mask') || node.classList.contains('bn-modal') || node.classList.contains('modal'))
          ) {
            console.log('QR Generator: Tìm thấy popup bn-mask, bn-modal hoặc modal', node);
            if (!isProcessing) {
              isProcessing = true;
              callback(node);
              setTimeout(() => {
                isProcessing = false;
              }, 1000);
            }
          }
        });
      }
    });
  });
  const config = { childList: true, subtree: true };
  observer.observe(container, config);
}

// Gắn vào đối tượng toàn cục QRGenerator
window.QRGenerator = window.QRGenerator || {};
window.QRGenerator.waitForPageContainer = waitForPageContainer;
window.QRGenerator.setupPageContainerObserver = setupPageContainerObserver;
window.QRGenerator.setupObserver = setupObserver;