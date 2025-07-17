// Theo dõi DOM để phát hiện popup giao dịch
// Function to check for the presence of the page-container
function waitForPageContainer(callback) {
  const pageContainer = document.getElementById('page-container');
  if (pageContainer) {
    callback(pageContainer);
  } else {
    console.log('Đang chờ phần tử page-container xuất hiện...');
    setTimeout(() => waitForPageContainer(callback), 100); // Check every 100ms
  }
}

// Function to set up the MutationObserver for the page-container
function setupPageContainerObserver() {
  console.log('QR Generator: Đang theo dõi sự xuất hiện của page-container...');

  // Tạo MutationObserver để theo dõi thay đổi DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.id === 'page-container') {
            console.log('Đã tìm thấy page-container:', node);
            setupObserver(node); // Set up the observer for the presentation div
            observer.disconnect(); // Ngừng theo dõi sau khi tìm thấy
          }
        });
      }
    });
  });

  // Cấu hình observer
  const config = {
    childList: true,
    subtree: true
  };

  // Bắt đầu quan sát document.body
  observer.observe(document.body, config);
}

// Function to set up the MutationObserver for the presentation div
function setupObserver(pageContainer) {
  console.log('QR Generator: Đang theo dõi popup giao dịch...');

  // Hàm kiểm tra div với role="presentation" trong page-container
  function checkForPresentationDiv() {
    const presentationDiv = pageContainer.querySelector('div[role="presentation"]');
    if (presentationDiv) {
      console.log('Popup mở: div với role="presentation" được tìm thấy trong page-container:', presentationDiv);

      // Trích xuất thông tin giao dịch
      const transferInfo = extractBankTransferInfo(presentationDiv);
      if (transferInfo) {
        console.log('Thông tin giao dịch:', transferInfo);

        // Tạo URL mã QR
        const qrUrl = generateQRUrl(transferInfo);
        console.log('URL mã QR:', qrUrl);

        // Hiển thị mã QR
        displayQRCode(qrUrl, transferInfo);
      }
      console.log(true);
      return true;
    } else {
      console.log('Popup đóng: không tìm thấy div với role="presentation" trong page-container.');
      console.log(false);
      return false;
    }
  }

  // Tạo MutationObserver để theo dõi thay đổi DOM
  const observer = new MutationObserver((mutations) => {
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

  // Cấu hình observer
  const config = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['role']
  };

  // Bắt đầu quan sát page-container
  observer.observe(pageContainer, config);
  checkForPresentationDiv();
}

// Trích xuất thông tin chuyển khoản từ popup
function extractBankTransferInfo(document) {
  // Khởi tạo đối tượng để lưu thông tin
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
    // Lấy mã đơn hàng (số tham chiếu)
    const orderNumberElement = document.querySelector('div[data-bn-type="text"].css-14yjdiq');
    if (orderNumberElement) {
      transferInfo.orderNumber = orderNumberElement.textContent.trim();
      transferInfo.referenceMessage = transferInfo.orderNumber;
    }

    // Lấy phương thức thanh toán
    const paymentMethodElement = document.querySelector('.PaymentMethodItem__text');
    if (paymentMethodElement) {
      transferInfo.paymentMethod = paymentMethodElement.textContent.trim();
    }

    // Lấy tổng số tiền giao dịch (VND)
    const amountElement = document.querySelector('.sc-jJMGnK');
    if (amountElement) {
      const amountText = amountElement.textContent.trim();
      // Sử dụng regex để chỉ trích xuất số
      const amountMatch = amountText.match(/[\d,]+\.\d+|\d+/);
      if (amountMatch) {
        transferInfo.amount = amountMatch[0].replace(/,/g, '');
      }
    }

    // Lấy loại giao dịch (Mua/Bán)
    const orderTypeElement = document.querySelector('.css-vurnku');
    if (orderTypeElement) {
      const orderTypeText = orderTypeElement.textContent;
      transferInfo.orderType = orderTypeText.includes('Mua') ? 'buy' : (orderTypeText.includes('Bán') ? 'sell' : null);
    }

    // Xác định loại hình thức thanh toán
    const isVietnamBankTransfer = transferInfo.paymentMethod && transferInfo.paymentMethod.includes('(Việt Nam)');
    
    // Tạo map các label cần tìm để tránh kiểm tra nhiều lần
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
    
    // Lấy tất cả các hàng thông tin một lần và xử lý
    const infoRows = document.querySelectorAll('.flex.justify-between');
    
    infoRows.forEach(row => {
      const labelElement = row.querySelector('.text-tertiaryText div');
      const valueElement = row.querySelector('.flex.flex-grow.justify-end .break-words div');
      
      if (labelElement && valueElement) {
        const label = labelElement.textContent.trim();
        const value = valueElement.textContent.trim();
        
        // Sử dụng map để tìm trường cần gán
        const field = labelMap[label];
        if (field) {
          // Xử lý đặc biệt cho số tài khoản
          if (field === 'accountNumber') {
            transferInfo[field] = value.replace(/[^0-9]/g, '');
          } else {
            transferInfo[field] = value;
          }
        }
      }
    });

    // Ánh xạ tên ngân hàng với thông tin từ bankList.json
    if (transferInfo.bankName) {
      getBankList().then(bankList => {
        const bankInfo = mapBankName(transferInfo.bankName, bankList);
        if (bankInfo) {
          transferInfo.bankName = bankInfo.name;
          transferInfo.bankBin = bankInfo.bin;
          transferInfo.bankCode = bankInfo.code;
        }
      });
    }

    return transferInfo;
  } catch (error) {
    console.error('QR Generator: Lỗi khi trích xuất thông tin:', error);
    return null;
  }
}

// Lấy danh sách ngân hàng từ file JSON
async function getBankList() {
  try {
    const response = await fetch(chrome.runtime.getURL('bankList.json'));
    return await response.json();
  } catch (error) {
    console.error('QR Generator: Lỗi khi đọc file bankList.json:', error);
    return {};
  }
}

// Ánh xạ tên ngân hàng với thông tin từ bankList.json
function mapBankName(inputBankName, bankList) {
  if (!inputBankName || !bankList) return null;
  
  const normalizedInput = inputBankName.toLowerCase().trim();
  let result = null;

  // So khớp chính xác với short_name và code
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

  // So khớp đơn giản bằng includes
  for (const bankKey in bankList) {
    const bank = bankList[bankKey];
    const normalizedShortName = (bank.short_name || '').toLowerCase().trim();
    const normalizedCode = (bank.code || '').toLowerCase().trim();
    const normalizedName = (bank.name || '').toLowerCase().trim();
    
    // Kiểm tra nếu chuỗi input chứa tên ngân hàng hoặc ngược lại
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

// Tạo URL mã QR VietQR từ thông tin chuyển khoản
function generateQRUrl(transferInfo) {
  if (!transferInfo || !transferInfo.accountNumber) {
    throw new Error('Thông tin chuyển khoản không hợp lệ');
  }

  // Ưu tiên sử dụng bankBin, nếu không có thì dùng bankCode
  const bankId = transferInfo.bankBin || transferInfo.bankCode;
  if (!bankId) {
    throw new Error('Không tìm thấy mã ngân hàng');
  }

  // Tạo URL cơ bản với template print (600x776)
  let url = `https://img.vietqr.io/image/${bankId}-${transferInfo.accountNumber}-print.png`;
  
  // Thêm các tham số
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
  
  // Thêm tham số vào URL
  const queryString = params.toString();
  if (queryString) {
    url += '?' + queryString;
  }
  
  return url;
}

// Function to display the QR code in a popup
function displayQRCode(qrUrl, transferInfo) {
  // Tạo popup mới
  const qrPopup = document.createElement('div');
  qrPopup.className = 'qr-popup-overlay';
  qrPopup.style.position = 'fixed';
  qrPopup.style.top = '0';
  qrPopup.style.left = '0';
  qrPopup.style.width = '100%';
  qrPopup.style.height = '100%';
  qrPopup.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  qrPopup.style.zIndex = '9999';
  qrPopup.style.display = 'flex';
  qrPopup.style.justifyContent = 'center';
  qrPopup.style.alignItems = 'center';
  
  // Tạo nội dung popup
  const qrPopupContent = document.createElement('div');
  qrPopupContent.className = 'qr-popup-content';
  qrPopupContent.style.backgroundColor = '#fff';
  qrPopupContent.style.borderRadius = '8px';
  qrPopupContent.style.padding = '20px';
  qrPopupContent.style.maxWidth = '400px';
  qrPopupContent.style.width = '90%';
  qrPopupContent.style.textAlign = 'center';
  qrPopupContent.style.position = 'relative';
  qrPopupContent.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  
  // Tạo nút đóng
  const closeButton = document.createElement('div');
  closeButton.textContent = '×';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '15px';
  closeButton.style.fontSize = '24px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.color = '#666';
  closeButton.style.lineHeight = '1';
  closeButton.onclick = () => {
    document.body.removeChild(qrPopup);
  };
  
  // Tạo tiêu đề
  const qrTitle = document.createElement('h3');
  qrTitle.textContent = 'Mã QR Chuyển khoản';
  qrTitle.style.margin = '0 0 15px 0';
  qrTitle.style.fontSize = '18px';
  qrTitle.style.color = '#333';
  
  // Tạo hình ảnh QR
  const qrImage = document.createElement('img');
  qrImage.src = qrUrl;
  qrImage.style.maxWidth = '100%';
  qrImage.style.width = 'auto';
  qrImage.style.height = 'auto';
  qrImage.style.margin = '0 auto 15px';
  qrImage.style.display = 'block';
  qrImage.alt = 'Mã QR chuyển khoản';
  
  // Thêm các phần tử vào container
  qrPopupContent.appendChild(closeButton);
  qrPopupContent.appendChild(qrTitle);
  qrPopupContent.appendChild(qrImage);
  
  // Kiểm tra cài đặt hiển thị thông tin chuyển khoản
  if (showTransferInfo && transferInfo) {
    // Tạo thông tin chuyển khoản
    const infoContainer = document.createElement('div');
    infoContainer.style.textAlign = 'left';
    infoContainer.style.margin = '15px 0 0 0';
    infoContainer.style.padding = '10px';
    infoContainer.style.backgroundColor = '#f5f5f5';
    infoContainer.style.borderRadius = '4px';
    
    // Thêm thông tin số tiền
    if (transferInfo.amount) {
      const amountRow = document.createElement('div');
      amountRow.style.display = 'flex';
      amountRow.style.justifyContent = 'space-between';
      amountRow.style.margin = '5px 0';
      
      const amountLabel = document.createElement('div');
      amountLabel.textContent = 'Số tiền:';
      amountLabel.style.color = '#666';
      
      const amountValue = document.createElement('div');
      amountValue.textContent = `${new Intl.NumberFormat('vi-VN').format(transferInfo.amount)} VND`;
      amountValue.style.fontWeight = 'bold';
      
      amountRow.appendChild(amountLabel);
      amountRow.appendChild(amountValue);
      infoContainer.appendChild(amountRow);
    }
    
    // Thêm thông tin nội dung chuyển khoản
    if (transferInfo.referenceMessage) {
      const messageRow = document.createElement('div');
      messageRow.style.display = 'flex';
      messageRow.style.justifyContent = 'space-between';
      messageRow.style.margin = '5px 0';
      
      const messageLabel = document.createElement('div');
      messageLabel.textContent = 'Nội dung CK:';
      messageLabel.style.color = '#666';
      
      const messageValue = document.createElement('div');
      messageValue.textContent = transferInfo.referenceMessage;
      messageValue.style.fontWeight = 'bold';
      
      messageRow.appendChild(messageLabel);
      messageRow.appendChild(messageValue);
      infoContainer.appendChild(messageRow);
    }
    
    qrPopupContent.appendChild(infoContainer);
  }
  
  // Thêm popup vào body
  qrPopup.appendChild(qrPopupContent);
  document.body.appendChild(qrPopup);
  
  // Thêm sự kiện đóng khi click ra ngoài
  qrPopup.addEventListener('click', (e) => {
    if (e.target === qrPopup) {
      document.body.removeChild(qrPopup);
    }
  });
  
  console.log('QR Generator: Đã hiển thị mã QR trong popup');
}

// Lắng nghe thông báo từ popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_CHANGED') {
    // Cập nhật cài đặt
    if (message.settings.hasOwnProperty('autoShowQR')) {
      autoShowQR = message.settings.autoShowQR;
    }
    
    if (message.settings.hasOwnProperty('showTransferInfo')) {
      showTransferInfo = message.settings.showTransferInfo;
    }
    
    // Phản hồi để xác nhận đã nhận
    sendResponse({ success: true });
  }
  
  return true; // Giữ kết nối mở cho phản hồi bất đồng bộ
});

// Biến lưu cài đặt
let autoShowQR = true;
let showTransferInfo = true;

// Tải cài đặt khi khởi động
chrome.storage.sync.get({
  autoShowQR: true,
  showTransferInfo: true
}, (settings) => {
  autoShowQR = settings.autoShowQR;
  showTransferInfo = settings.showTransferInfo;
});

// Khởi chạy khi trang web đã tải xong
window.addEventListener('load', () => {
  console.log('QR Generator: Extension đã khởi động');
  // The setupPopupObserver function is now called within waitForPageContainer
  
  // Kiểm tra nếu popup đã có sẵn khi tải trang
  const existingPopups = document.querySelectorAll('.bn-modal-wrap');
  existingPopups.forEach(popup => {
    if (popup.querySelector('.css-14yjdiq')) {
      handleTransactionPopup(popup);
    }
  });
});
