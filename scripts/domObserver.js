let isProcessing = false;

function waitForPageContainer(callback) {
  const pageContainer = document.getElementById('page-container') || document.body;
  if (pageContainer) {
    callback(pageContainer);
  } else {
    setTimeout(() => waitForPageContainer(callback), 100);
  }
}

function setupPageContainerObserver(callback) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && (node.id === 'page-container' || node.tagName === 'BODY')) {
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
  if (!container) return;
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('bn-mask') && node.classList.contains('bn-modal')) {
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