let isProcessing = false; // Cờ để ngăn xử lý lặp lại
let qrContainer = null; // Biến để theo dõi div QR
let isDragging = false; // Trạng thái kéo thả
let isResizing = false; // Trạng thái thay đổi kích thước
let dragStart = { x: 0, y: 0, left: 0, top: 0 }; // Lưu vị trí bắt đầu kéo
let resizeStart = { x: 0, y: 0, width: 0, height: 0 }; // Lưu kích thước bắt đầu
let autoShowQR = true;
let showTransferInfo = true;

function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getBankList() {
  try {
    const response = await fetch(chrome.runtime.getURL('bankList.json'));
    const bankList = await response.json();
    console.log('QR Generator: Đã tải bankList.json', Object.keys(bankList).length, 'ngân hàng');
    return bankList;
  } catch (error) {
    console.error('QR Generator: Lỗi khi đọc file bankList.json:', error);
    return {};
  }
}

function mapBankName(inputBankName, bankList) {
  if (!inputBankName || !bankList) {
    console.error('QR Generator: Input hoặc bankList không hợp lệ');
    return null;
  }

  console.log('QR Generator: Ánh xạ ngân hàng với input:', inputBankName);
  const normalizedInput = normalizeString(inputBankName);
  const bankArray = Object.keys(bankList).map(key => ({
    key,
    ...bankList[key]
  }));

  // Tìm kiếm chính xác trước
  for (const bank of bankArray) {
    const normalizedShortName = normalizeString(bank.short_name);
    const normalizedCode = normalizeString(bank.code);
    const normalizedKeywords = bank.keywords ? bank.keywords.map(normalizeString) : [];

    if (
      normalizedInput === normalizedShortName ||
      normalizedInput === normalizedCode ||
      normalizedKeywords.includes(normalizedInput)
    ) {
      console.log('QR Generator: Khớp chính xác:', bank.name);
      return {
        name: bank.name,
        bin: bank.bin,
        code: bank.code
      };
    }
  }

  // Tìm kiếm mờ với Fuse.js
  try {
    const fuse = new Fuse(bankArray, {
      keys: [
        { name: 'keywords', weight: 0.5 },
        { name: 'short_name', weight: 0.3 },
        { name: 'code', weight: 0.2 },
        { name: 'name', weight: 0.1 }
      ],
      threshold: 0.2,
      includeScore: true,
      minMatchCharLength: 1
    });

    const results = fuse.search(normalizedInput);
    if (results.length > 0 && results[0].score < 0.3) {
      const bank = results[0].item;
      console.log('QR Generator: Khớp mờ:', bank.name, 'Score:', results[0].score);
      return {
        name: bank.name,
        bin: bank.bin,
        code: bank.code
      };
    }
  } catch (error) {
    console.error('QR Generator: Lỗi khi sử dụng Fuse.js:', error);
  }

  console.warn('QR Generator: Không tìm thấy ngân hàng phù hợp cho:', normalizedInput);
  return null;
}

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
      handleTransactionPopup(presentationDiv).finally(() => {
        isProcessing = false;
        observer.observe(pageContainer, config);
      });
      return true;
    } else if (!presentationDiv && isProcessing) {
      console.log('QR Generator: Popup đã đóng, xóa QR nếu có');
      if (qrContainer) {
        qrContainer.remove();
        qrContainer = null;
      }
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

async function handleTransactionPopup(popupNode) {
  try {
    if (!autoShowQR) {
      console.log('QR Generator: autoShowQR = false, không hiển thị QR');
      return;
    }
    const transferInfo = await extractBankTransferInfo(popupNode);
    console.log('QR Generator: Kết quả trích xuất transferInfo:', transferInfo);
    if (!transferInfo || !transferInfo.accountNumber || !transferInfo.bankBin) {
      console.error('QR Generator: Không thể trích xuất đủ thông tin giao dịch', transferInfo);
      return;
    }
    console.log('QR Generator: Thông tin giao dịch:', transferInfo);
    const qrUrl = generateQRUrl(transferInfo);
    console.log('QR Generator: Đường link QR:', qrUrl);
    
    if (autoShowQR && qrUrl) {
      showQRImage(qrUrl);
    }
  } catch (error) {
    console.error('QR Generator: Lỗi khi xử lý popup giao dịch:', error);
  }
}

async function extractBankTransferInfo(document) {
  const transferInfo = {
    paymentMethod: null,
    accountName: null,
    accountNumber: null,
    bankName: null,
    bankBin: null,
    bankCode: null,
    bankBranch: null,
    referenceMessage: null,
    amount: null,
    orderType: null,
    orderNumber: null
  };
  try {
    console.log('QR Generator: Bắt đầu trích xuất thông tin chuyển khoản');

    const orderNumberElement = document.querySelector('div[data-bn-type="text"].css-14yjdiq');
    if (orderNumberElement) {
      transferInfo.orderNumber = orderNumberElement.textContent.trim();
      transferInfo.referenceMessage = transferInfo.orderNumber;
      console.log('QR Generator: orderNumber:', transferInfo.orderNumber);
    } else {
      console.warn('QR Generator: Không tìm thấy orderNumberElement');
    }

    const paymentMethodElement = document.querySelector('.PaymentMethodItem__text');
    if (paymentMethodElement) {
      transferInfo.paymentMethod = paymentMethodElement.textContent.trim();
      console.log('QR Generator: paymentMethod:', transferInfo.paymentMethod);
    } else {
      console.warn('QR Generator: Không tìm thấy paymentMethodElement');
    }

    const amountElement = document.querySelector('.sc-jJMGnK');
    if (amountElement) {
      const amountText = amountElement.textContent.trim();
      const amountMatch = amountText.match(/[\d,]+\.\d+|\d+/);
      if (amountMatch) {
        transferInfo.amount = amountMatch[0].replace(/,/g, '');
        console.log('QR Generator: amount:', transferInfo.amount);
      } else {
        console.warn('QR Generator: Không trích xuất được số tiền từ:', amountText);
      }
    } else {
      console.warn('QR Generator: Không tìm thấy amountElement');
    }

    const orderTypeElement = document.querySelector('.css-vurnku');
    if (orderTypeElement) {
      const orderTypeText = orderTypeElement.textContent;
      transferInfo.orderType = orderTypeText.includes('Mua') ? 'buy' : (orderTypeText.includes('Bán') ? 'sell' : null);
      console.log('QR Generator: orderType:', transferInfo.orderType);
    } else {
      console.warn('QR Generator: Không tìm thấy orderTypeElement');
    }

    const isVietnamBankTransfer = transferInfo.paymentMethod && transferInfo.paymentMethod.includes('(Việt Nam)');
    const labelMap = isVietnamBankTransfer ? {
      'Họ và tên': 'accountName',
      'Tên ngân hàng': 'bankName',
      'Số tài khoản/Số thẻ': 'accountNumber',
      'Chi nhánh mở tài khoản': 'bankBranch',
      'Nội dung chuyển khoản': 'referenceMessage'
    } : {
      'Name': 'accountName',
      'Bank Card/Account Number': 'accountNumber',
      'Tên ngân hàng': 'bankName',
      'Chi nhánh mở tài khoản': 'bankBranch',
      'Nội dung chuyển khoản': 'referenceMessage'
    };

    const infoRows = document.querySelectorAll('.flex.justify-between');
    infoRows.forEach(row => {
      const labelElement = row.querySelector('.text-tertiaryText div');
      const valueElement = row.querySelector('.flex.flex-grow.justify-end .break-words div');
      const labelText = labelElement?.textContent?.trim();
      const valueText = valueElement?.textContent?.trim();
      if (labelText && valueText && labelMap[labelText]) {
        const field = labelMap[labelText];
        if (field === 'accountNumber') {
          transferInfo[field] = valueText.replace(/[^0-9]/g, '');
        } else {
          transferInfo[field] = valueText;
        }
        console.log('QR Generator: Trích xuất', field, ':', transferInfo[field]);
      }
    });

    if (transferInfo.bankName) {
      const bankList = await getBankList();
      const bankInfo = mapBankName(transferInfo.bankName, bankList);
      if (bankInfo) {
        transferInfo.bankName = bankInfo.name;
        transferInfo.bankBin = bankInfo.bin;
        transferInfo.bankCode = bankInfo.code;
        console.log('QR Generator: mappedBank:', bankInfo);
      } else {
        console.warn('QR Generator: Không ánh xạ được ngân hàng:', transferInfo.bankName);
      }
    } else {
      console.warn('QR Generator: bankName không có giá trị');
    }

    console.log('QR Generator: Kết quả transferInfo:', transferInfo);
    return transferInfo;
  } catch (error) {
    console.error('QR Generator: Lỗi khi trích xuất thông tin:', error);
    return null;
  }
}

function generateQRUrl(transferInfo) {
  if (!transferInfo || !transferInfo.accountNumber) {
    console.error('QR Generator: Thông tin chuyển khoản không hợp lệ');
    return null;
  }
  const bankId = transferInfo.bankBin || transferInfo.bankCode;
  if (!bankId) {
    console.error('QR Generator: Không tìm thấy mã ngân hàng');
    return null;
  }
  let url = `https://img.vietqr.io/image/${bankId}-${transferInfo.accountNumber}-print.png`;
  const params = new URLSearchParams();
  if (transferInfo.amount) {
    params.append('amount', transferInfo.amount);
  }
  if (transferInfo.referenceMessage) {
    params.append('addInfo', transferInfo.referenceMessage);
  }
  if (transferInfo.accountName) {
    params.append('accountName', transferInfo.accountName.toUpperCase());
  }
  const queryString = params.toString();
  if (queryString) {
    url += '?' + queryString;
  }
  console.log('QR Generator: Tạo URL QR:', url);
  return url;
}

function showQRImage(qrUrl) {
  if (qrContainer) {
    qrContainer.remove();
    qrContainer = null;
  }

  qrContainer = document.createElement('div');
  qrContainer.id = 'qr-floating-container';
  qrContainer.style.position = 'absolute';
  qrContainer.style.bottom = '500px';
  qrContainer.style.right = '300px';
  qrContainer.style.zIndex = '9999';
  qrContainer.style.background = 'white';
  qrContainer.style.padding = '10px';
  qrContainer.style.border = '1px solid #ccc';
  qrContainer.style.borderRadius = '5px';
  qrContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  qrContainer.style.cursor = 'move';

  const qrImage = document.createElement('img');
  qrImage.src = qrUrl;
  qrImage.style.width = '600px';
  qrImage.style.height = '700px';
  qrImage.style.display = 'block';
  qrImage.style.userSelect = 'none';
  qrImage.draggable = false;
  qrImage.onerror = () => {
    console.error('QR Generator: Lỗi khi tải ảnh QR từ:', qrUrl);
    qrContainer.remove();
    qrContainer = null;
  };

  const closeButton = document.createElement('button');
  closeButton.textContent = 'X';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '5px';
  closeButton.style.background = '#ff4d4f';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '3px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.padding = '2px 6px';
  closeButton.onclick = () => {
    qrContainer.remove();
    qrContainer = null;
  };

  const resizeHandle = document.createElement('div');
  resizeHandle.style.position = 'absolute';
  resizeHandle.style.bottom = '0';
  resizeHandle.style.right = '0';
  resizeHandle.style.width = '10px';
  resizeHandle.style.height = '10px';
  resizeHandle.style.background = '#ccc';
  resizeHandle.style.cursor = 'se-resize';

  qrContainer.addEventListener('mousedown', (e) => {
    if (e.target === closeButton || e.target === resizeHandle) return;
    isDragging = true;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    dragStart.left = qrContainer.offsetLeft;
    dragStart.top = qrContainer.offsetTop;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      let newLeft = dragStart.left + deltaX;
      let newTop = dragStart.top + deltaY;
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - qrContainer.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - qrContainer.offsetHeight));
      qrContainer.style.left = `${newLeft}px`;
      qrContainer.style.top = `${newTop}px`;
      qrContainer.style.right = 'auto';
      qrContainer.style.bottom = 'auto';
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizeStart.x = e.clientX;
    resizeStart.y = e.clientY;
    resizeStart.width = qrContainer.offsetWidth;
    resizeStart.height = qrContainer.offsetHeight;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      let newWidth = resizeStart.width + deltaX;
      let newHeight = resizeStart.height + deltaY;
      newWidth = Math.max(100, newWidth);
      newHeight = Math.max(100, newHeight);
      qrContainer.style.width = `${newWidth}px`;
      qrContainer.style.height = `${newHeight}px`;
      qrImage.style.width = `${newWidth - 20}px`;
      qrImage.style.height = `${newHeight - 20}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
  });

  qrContainer.appendChild(closeButton);
  qrContainer.appendChild(qrImage);
  qrContainer.appendChild(resizeHandle);
  document.body.appendChild(qrContainer);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('QR Generator: Nhận tin nhắn:', message);
  if (message.type === 'SETTINGS_CHANGED') {
    if (message.settings.hasOwnProperty('autoShowQR')) {
      autoShowQR = message.settings.autoShowQR;
      console.log('QR Generator: Cập nhật autoShowQR:', autoShowQR);
      if (!autoShowQR && qrContainer) {
        qrContainer.remove();
        qrContainer = null;
      }
    }
    if (message.settings.hasOwnProperty('showTransferInfo')) {
      showTransferInfo = message.settings.showTransferInfo;
      console.log('QR Generator: Cập nhật showTransferInfo:', showTransferInfo);
    }
    sendResponse({ success: true });
  }
  return true;
});

chrome.storage.sync.get({
  autoShowQR: true,
  showTransferInfo: true
}, (settings) => {
  autoShowQR = settings.autoShowQR;
  showTransferInfo = settings.showTransferInfo;
  console.log('QR Generator: Khởi tạo cài đặt - autoShowQR:', autoShowQR, 'showTransferInfo:', showTransferInfo);
});

window.addEventListener('load', () => {
  console.log('QR Generator: Trang đã tải, khởi tạo extension');
  setupPageContainerObserver();
  const existingPopups = document.querySelectorAll('div[role="presentation"].bn-mask.bn-modal');
  existingPopups.forEach(popup => {
    console.log('QR Generator: Tìm thấy popup hiện có', popup);
    handleTransactionPopup(popup);
  });
});