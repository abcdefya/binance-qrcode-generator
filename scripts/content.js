// Theo dõi DOM để phát hiện popup giao dịch
function setupPopupObserver() {
  console.log('QR Generator: Đang theo dõi popup giao dịch...');
  
  // Tạo một observer để theo dõi khi popup xuất hiện
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // Kiểm tra các node mới thêm vào
        mutation.addedNodes.forEach(node => {
          // Kiểm tra nếu đây là popup giao dịch
          if (node.nodeType === Node.ELEMENT_NODE && 
              node.classList.contains('bn-modal-wrap') && 
              node.querySelector('.css-14yjdiq')) {
            
            // Tìm thấy popup giao dịch, xử lý nó
            handleTransactionPopup(node);
          }
        });
      }
    }
  });

  // Bắt đầu theo dõi toàn bộ document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Xử lý popup giao dịch khi nó xuất hiện
async function handleTransactionPopup(popupNode) {
  try {
    console.log('QR Generator: Đã phát hiện popup giao dịch!');
    
    // Kiểm tra cài đặt
    if (!autoShowQR) {
      console.log('QR Generator: Tự động hiển thị QR đã bị tắt');
      return;
    }
    
    // Trích xuất thông tin từ popup
    const transferInfo = extractBankTransferInfo(popupNode);
    
    if (!transferInfo || !transferInfo.accountNumber) {
      console.error('QR Generator: Không thể trích xuất đủ thông tin giao dịch');
      return;
    }
    
    // Lấy thông tin ngân hàng một cách bất đồng bộ
    const bankList = await getBankList();
    const bankInfo = mapBankName(transferInfo.bankName, bankList);
    if (bankInfo) {
      transferInfo.bankBin = bankInfo.bin;
      transferInfo.bankCode = bankInfo.code;
    } else {
      console.error('QR Generator: Không tìm thấy thông tin ngân hàng cho:', transferInfo.bankName);
      return;
    }

    if (!transferInfo.bankBin) {
      console.error('QR Generator: Không có BIN ngân hàng, không thể tạo QR');
      return;
    }
    
    console.log('QR Generator: Thông tin giao dịch đầy đủ:', transferInfo);
    
    // Tạo URL mã QR
    const qrUrl = generateQRUrl(transferInfo);
    console.log('QR Generator: URL mã QR đã tạo:', qrUrl);
    
    // Hiển thị QR lên giao diện
    displayQRCode(popupNode, qrUrl, transferInfo);
    
  } catch (error) {
    console.error('QR Generator: Lỗi khi xử lý popup giao dịch:', error);
  }
}

// Trích xuất thông tin chuyển khoản từ popup
function extractBankTransferInfo(popupNode) {
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
    const orderNumberElement = popupNode.querySelector('div[data-bn-type="text"].css-14yjdiq');
    if (orderNumberElement) {
      transferInfo.orderNumber = orderNumberElement.textContent.trim();
      transferInfo.referenceMessage = transferInfo.orderNumber;
    }

    // Lấy phương thức thanh toán
    const paymentMethodElement = popupNode.querySelector('.PaymentMethodItem__text');
    if (paymentMethodElement) {
      transferInfo.paymentMethod = paymentMethodElement.textContent.trim();
    }

    // Lấy tổng số tiền giao dịch (VND)
    const amountElement = popupNode.querySelector('.sc-jJMGnK');
    if (amountElement) {
      const amountText = amountElement.textContent.trim();
      // Sử dụng regex để chỉ trích xuất số
      const amountMatch = amountText.match(/[\d,]+\.\d+|\d+/);
      if (amountMatch) {
        transferInfo.amount = amountMatch[0].replace(/,/g, '');
      }
    }

    // Lấy loại giao dịch (Mua/Bán)
    const orderTypeElement = popupNode.querySelector('.css-vurnku');
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
    const infoRows = popupNode.querySelectorAll('.flex.justify-between');
    
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

    // Phần này sẽ được xử lý trong handleTransactionPopup
    // if (transferInfo.bankName) {
    //   getBankList().then(bankList => {
    //     const bankInfo = mapBankName(transferInfo.bankName, bankList);
    //     if (bankInfo) {
    //       transferInfo.bankName = bankInfo.name;
    //       transferInfo.bankBin = bankInfo.bin;
    //       transferInfo.bankCode = bankInfo.code;
    //     }
    //   });
    // }

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
function displayQRCode(popupNode, qrUrl, transferInfo) {
  // Tạo popup mới để hiển thị QR
  const qrPopupOverlay = document.createElement('div');
  qrPopupOverlay.className = 'qr-popup-overlay';
  qrPopupOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0, 0, 0, 0.7); z-index: 10000;
    display: flex; justify-content: center; align-items: center;
  `;

  const qrPopupContent = document.createElement('div');
  qrPopupContent.className = 'qr-popup-content';
  qrPopupContent.style.cssText = `
    background-color: #fff; border-radius: 8px; padding: 20px;
    max-width: 400px; width: 90%; text-align: center;
    position: relative; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  
  const closeButton = document.createElement('div');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    position: absolute; top: 10px; right: 15px; font-size: 24px;
    cursor: pointer; color: #666; line-height: 1;
  `;
  closeButton.onclick = () => {
    document.body.removeChild(qrPopupOverlay);
  };

  const qrTitle = document.createElement('h3');
  qrTitle.textContent = 'Mã QR Chuyển khoản';
  qrTitle.style.cssText = 'margin: 0 0 15px 0; font-size: 18px; color: #333;';
  
  const qrImage = document.createElement('img');
  qrImage.src = qrUrl;
  qrImage.style.cssText = 'max-width: 100%; height: auto; margin: 0 auto 15px; display: block;';
  qrImage.alt = 'Mã QR chuyển khoản';
  
  qrPopupContent.appendChild(closeButton);
  qrPopupContent.appendChild(qrTitle);
  qrPopupContent.appendChild(qrImage);
  
  // Kiểm tra cài đặt hiển thị thông tin chuyển khoản
  if (showTransferInfo) {
    const infoContainer = document.createElement('div');
    infoContainer.style.cssText = 'text-align: left; margin-top: 15px; padding: 10px; background-color: #f5f5f5; border-radius: 4px;';
    
    if (transferInfo.amount) {
      infoContainer.innerHTML += `
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <div style="color: #666;">Số tiền:</div>
          <div style="font-weight: bold;">${new Intl.NumberFormat('vi-VN').format(transferInfo.amount)} VND</div>
        </div>
      `;
    }
    if (transferInfo.referenceMessage) {
      infoContainer.innerHTML += `
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <div style="color: #666;">Nội dung CK:</div>
          <div style="font-weight: bold;">${transferInfo.referenceMessage}</div>
        </div>
      `;
    }
    qrPopupContent.appendChild(infoContainer);
  }

  qrPopupOverlay.appendChild(qrPopupContent);
  document.body.appendChild(qrPopupOverlay);

  qrPopupOverlay.addEventListener('click', (e) => {
    if (e.target === qrPopupOverlay) {
      document.body.removeChild(qrPopupOverlay);
    }
  });

  console.log('QR Generator: Đã hiển thị mã QR trong popup thành công');
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
