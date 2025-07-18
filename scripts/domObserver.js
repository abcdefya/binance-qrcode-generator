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

function setupPageContainerObserver() {
  console.log('QR Generator: Thiết lập observer cho pageContainer');
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && (node.id === 'page-container' || node.tagName === 'BODY')) {
            console.log('QR Generator: Tìm thấy page-container hoặc body', node);
            setupObserver(node);
            observer.disconnect();
          }
        });
      }
    });
  });
  const config = { childList: true, subtree: true };
  observer.observe(document.body, config);
}

function setupObserver(pageContainer) {
  let observer;
  function checkForPresentationDiv() {
    const presentationDiv = pageContainer.querySelector('div[role="presentation"].bn-mask.bn-modal');
    if (presentationDiv && !isProcessing) {
      const orderNumberElement = presentationDiv.querySelector('div[data-bn-type="text"].css-14yjdiq');
      if (!orderNumberElement) {
        console.warn('QR Generator: Popup chưa render hoàn chỉnh');
        return false;
      }
      console.log('QR Generator: Tìm thấy popup hợp lệ', presentationDiv);
      isProcessing = true;
      observer.disconnect();
      window.QRGenerator.handleTransactionPopup(presentationDiv).finally(() => {
        isProcessing = false;
        observer.observe(pageContainer, config);
      });
      return true;
    } else if (!presentationDiv && isProcessing) {
      console.log('QR Generator: Popup đã đóng, xóa QR nếu có');
      window.QRGenerator.removeQRContainer();
      isProcessing = false;
      observer.observe(pageContainer, config);
      return false;
    }
    return false;
  }

  observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length || mutation.removedNodes.length) {
        shouldCheck = true;
      }
      if (mutation.type === 'attributes' && mutation.attributeName === 'role') {
        shouldCheck = true;
      }
    });
    if (shouldCheck) {
      checkForPresentationDiv();
    }
  });
  const config = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['role']
  };
  observer.observe(pageContainer, config);
  checkForPresentationDiv();
}

// Gắn vào đối tượng toàn cục QRGenerator
window.QRGenerator = window.QRGenerator || {};
window.QRGenerator.waitForPageContainer = waitForPageContainer;
window.QRGenerator.setupPageContainerObserver = setupPageContainerObserver;
window.QRGenerator.setupObserver = setupObserver;