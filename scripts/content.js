let isProcessing = false; // Cờ để ngăn xử lý lặp lại
let qrContainer = null; // Biến để theo dõi div QR
let isDragging = false; // Trạng thái kéo thả
let isResizing = false; // Trạng thái thay đổi kích thước
let dragStart = { x: 0, y: 0, left: 0, top: 0 }; // Lưu vị trí bắt đầu kéo
let resizeStart = { x: 0, y: 0, width: 0, height: 0 }; // Lưu kích thước bắt đầu

function waitForPageContainer(callback) {
  const pageContainer = document.getElementById('page-container') || document.body;
  if (pageContainer) {
    callback(pageContainer);
  } else {
    setTimeout(() => waitForPageContainer(callback), 100);
  }
}

function setupPageContainerObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && (node.id === 'page-container' || node.tagName === 'BODY')) {
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
  let observer; // Biến để lưu MutationObserver

  function checkForPresentationDiv() {
    const presentationDiv = pageContainer.querySelector('div[role="presentation"].bn-mask.bn-modal');
    if (presentationDiv && !isProcessing) {
      const orderNumberElement = presentationDiv.querySelector('div[data-bn-type="text"].css-14yjdiq');
      if (!orderNumberElement) {
        return false; // Chờ DOM render hoàn chỉnh
      }
      isProcessing = true;
      observer.disconnect(); // Dừng observer để tránh lặp
      handleTransactionPopup(presentationDiv).finally(() => {
        isProcessing = false;
        observer.observe(pageContainer, config); // Tiếp tục theo dõi
      });
      return true;
    } else if (!presentationDiv && isProcessing) {
      if (qrContainer) {
        qrContainer.remove(); // Xóa div QR khi popup đóng
        qrContainer = null;
      }
      isProcessing = false;
      observer.observe(pageContainer, config); // Tiếp tục theo dõi
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
    
    // Hiển thị ảnh QR
    if (autoShowQR && qrUrl) {
      showQRImage(qrUrl);
    }
  } catch (error) {
    console.error('QR Generator: Lỗi khi xử lý popup giao dịch:', error);
  }
}

function showQRImage(qrUrl) {
  // Xóa div QR cũ nếu tồn tại
  if (qrContainer) {
    qrContainer.remove();
    qrContainer = null;
  }

  // Tạo div QR mới
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
  qrContainer.style.cursor = 'move'; // Con trỏ chuột khi kéo

  // Tạo ảnh QR
  const qrImage = document.createElement('img');
  qrImage.src = qrUrl;
  qrImage.style.width = '600px';
  qrImage.style.height = '700px';
  qrImage.style.display = 'block';
  qrImage.style.userSelect = 'none'; // Ngăn chọn ảnh
  qrImage.draggable = false; // Ngăn kéo mặc định của trình duyệt
  qrImage.onerror = () => {
    console.error('QR Generator: Lỗi khi tải ảnh QR từ:', qrUrl);
    qrContainer.remove();
    qrContainer = null;
  };

  // Tạo nút đóng
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

  // Tạo resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.style.position = 'absolute';
  resizeHandle.style.bottom = '0';
  resizeHandle.style.right = '0';
  resizeHandle.style.width = '10px';
  resizeHandle.style.height = '10px';
  resizeHandle.style.background = '#ccc';
  resizeHandle.style.cursor = 'se-resize';

  // Logic kéo thả
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

      // Giới hạn kéo trong màn hình
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

  // Logic thay đổi kích thước
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

      // Giới hạn kích thước tối thiểu
      newWidth = Math.max(100, newWidth);
      newHeight = Math.max(100, newHeight);

      qrContainer.style.width = `${newWidth}px`;
      qrContainer.style.height = `${newHeight}px`;
      qrImage.style.width = `${newWidth - 20}px`; // Trừ padding
      qrImage.style.height = `${newHeight - 20}px`; // Trừ padding
    }
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
  });

  // Thêm các phần tử vào container
  qrContainer.appendChild(closeButton);
  qrContainer.appendChild(qrImage);
  qrContainer.appendChild(resizeHandle);
  document.body.appendChild(qrContainer);
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
    const orderNumberElement = document.querySelector('div[data-bn-type="text"].css-14yjdiq');
    if (orderNumberElement) {
      transferInfo.orderNumber = orderNumberElement.textContent.trim();
      transferInfo.referenceMessage = transferInfo.orderNumber;
    }
    const paymentMethodElement = document.querySelector('.PaymentMethodItem__text');
    if (paymentMethodElement) {
      transferInfo.paymentMethod = paymentMethodElement.textContent.trim();
    }
    const amountElement = document.querySelector('.sc-jJMGnK');
    if (amountElement) {
      const amountText = amountElement.textContent.trim();
      const amountMatch = amountText.match(/[\d,]+\.\d+|\d+/);
      if (amountMatch) {
        transferInfo.amount = amountMatch[0].replace(/,/g, '');
      }
    }
    const orderTypeElement = document.querySelector('.css-vurnku');
    if (orderTypeElement) {
      const orderTypeText = orderTypeElement.textContent;
      transferInfo.orderType = orderTypeText.includes('Mua') ? 'buy' : (orderTypeText.includes('Bán') ? 'sell' : null);
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
      }
    });
    if (transferInfo.bankName) {
      const bankList = await getBankList();
      const bankInfo = mapBankName(transferInfo.bankName, bankList);
      if (bankInfo) {
        transferInfo.bankName = bankInfo.name;
        transferInfo.bankBin = bankInfo.bin;
        transferInfo.bankCode = bankInfo.code;
      }
    }
    return transferInfo;
  } catch (error) {
    console.error('QR Generator: Lỗi khi trích xuất thông tin:', error);
    return null;
  }
}

async function getBankList() {
  try {
    const response = await fetch(chrome.runtime.getURL('bankList.json'));
    return await response.json();
  } catch (error) {
    console.error('QR Generator: Lỗi khi đọc file bankList.json:', error);
    return {};
  }
}

function mapBankName(inputBankName, bankList) {
  if (!inputBankName || !bankList) return null;
  const normalizedInput = inputBankName.toLowerCase().trim();
  let result = null;
  for (const bankKey in bankList) {
    const bank = bankList[bankKey];
    if (
      normalizedInput === (bank.short_name || '').toLowerCase().trim() ||
      normalizedInput === (bank.code || '').toLowerCase().trim()
    ) {
      result = {
        name: bank.name,
        bin: bank.bin,
        code: bank.code
      };
      return result;
    }
  }
  for (const bankKey in bankList) {
    const bank = bankList[bankKey];
    const normalizedShortName = (bank.short_name || '').toLowerCase().trim();
    const normalizedCode = (bank.code || '').toLowerCase().trim();
    const normalizedName = (bank.name || '').toLowerCase().trim();
    if (
      (normalizedShortName && (normalizedInput.includes(normalizedShortName) || normalizedShortName.includes(normalizedInput))) ||
      (normalizedCode && (normalizedInput.includes(normalizedCode) || normalizedCode.includes(normalizedInput))) ||
      (normalizedName && (normalizedInput.includes(normalizedName) || normalizedName.includes(normalizedInput)))
    ) {
      result = {
        name: bank.name,
        bin: bank.bin,
        code: bank.code
      };
      return result;
    }
  }
  return null;
}

function generateQRUrl(transferInfo) {
  if (!transferInfo || !transferInfo.accountNumber) {
    throw new Error('Thông tin chuyển khoản không hợp lệ');
  }
  const bankId = transferInfo.bankBin || transferInfo.bankCode;
  if (!bankId) {
    throw new Error('Không tìm thấy mã ngân hàng');
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
  return url;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_CHANGED') {
    if (message.settings.hasOwnProperty('autoShowQR')) {
      autoShowQR = message.settings.autoShowQR;
      if (!autoShowQR && qrContainer) {
        qrContainer.remove();
        qrContainer = null;
      }
    }
    if (message.settings.hasOwnProperty('showTransferInfo')) {
      showTransferInfo = message.settings.showTransferInfo;
    }
    sendResponse({ success: true });
  }
  return true;
});

let autoShowQR = true;
let showTransferInfo = true;

chrome.storage.sync.get({
  autoShowQR: true,
  showTransferInfo: true
}, (settings) => {
  autoShowQR = settings.autoShowQR;
  showTransferInfo = settings.showTransferInfo;
});

window.addEventListener('load', () => {
  setupPageContainerObserver();
  const existingPopups = document.querySelectorAll('div[role="presentation"].bn-mask.bn-modal');
  existingPopups.forEach(popup => {
    handleTransactionPopup(popup);
  });
});