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

function setupObserver(pageContainer, handlePopupCallback) {
  let observer;

  function checkForPresentationDiv() {
    const presentationDiv = pageContainer.querySelector('div[role="presentation"].bn-mask.bn-modal');
    if (presentationDiv && !isProcessing) {
      const orderNumberElement = presentationDiv.querySelector('div[data-bn-type="text"].css-14yjdiq');
      if (!orderNumberElement) {
        return false;
      }
      isProcessing = true;
      observer.disconnect();
      handlePopupCallback(presentationDiv).finally(() => {
        isProcessing = false;
        observer.observe(pageContainer, config);
      });
      return true;
    } else if (!presentationDiv && isProcessing) {
      handlePopupCallback(null);
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

export { setupPageContainerObserver, setupObserver, waitForPageContainer, isProcessing }; 