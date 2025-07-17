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

// Function to set up the MutationObserver
function setupObserver(pageContainer) {
  console.log('QR Generator: Đang theo dõi popup giao dịch...');

  // Hàm kiểm tra div với role="presentation" trong page-container
  function checkForPresentationDiv() {
    const presentationDiv = pageContainer.querySelector('div[role="presentation"]');
    if (presentationDiv) {
      console.log('Popup mở: div với role="presentation" được tìm thấy trong page-container:', presentationDiv);
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

// Start waiting for the page-container
waitForPageContainer(setupObserver);

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
    
    if (!transferInfo || !transferInfo.accountNumber || !transferInfo.bankBin) {
      console.error('QR Generator: Không thể trích xuất đủ thông tin giao dịch');
      return;
    }
    
    console.log('QR Generator: Thông tin giao dịch:', transferInfo);
    
    // Tạo URL mã QR
    const qrUrl = generateQRUrl(transferInfo);
    
    // Hiển thị QR lên giao diện
    displayQRCode(popupNode, qrUrl, transferInfo);
    
  } catch (error) {
    console.error('QR Generator: Lỗi khi xử lý popup giao dịch:', error);
  }
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

// Hiển thị mã QR lên giao diện
function displayQRCode(popupNode, qrUrl, transferInfo) {
  // Tìm vị trí thích hợp để chèn QR code
  const targetContainer = popupNode.querySelector('.css-n32ck1');
  
  if (!targetContainer) {
    console.error('QR Generator: Không tìm thấy vị trí để chèn mã QR');
    return;
  }
  
  // Tạo container cho QR code
  const qrContainer = document.createElement('div');
  qrContainer.className = 'qr-code-container px-m mb-2xs body3';
  qrContainer.style.textAlign = 'center';
  qrContainer.style.marginTop = '20px';
  
  // Tạo tiêu đề
  const qrTitle = document.createElement('div');
  qrTitle.className = 'text-tertiaryText mb-m';
  qrTitle.textContent = 'Mã QR Chuyển khoản';
  
  // Tạo hình ảnh QR
  const qrImage = document.createElement('img');
  qrImage.src = qrUrl;
  qrImage.style.maxWidth = '100%';
  qrImage.style.width = 'auto';
  qrImage.style.height = 'auto';
  qrImage.style.display = 'block';
  qrImage.style.margin = '0 auto';
  qrImage.alt = 'Mã QR chuyển khoản';
  
  // Thêm các phần tử vào container
  qrContainer.appendChild(qrTitle);
  qrContainer.appendChild(qrImage);
  
  // Kiểm tra cài đặt hiển thị thông tin chuyển khoản
  if (showTransferInfo) {
    // Tạo thông tin chuyển khoản
    const qrInfo = document.createElement('div');
    qrInfo.className = 'qr-info mt-s';
    qrInfo.innerHTML = `
      <div class="flex justify-between">
        <div class="flex w-[150px] flex-shrink-0 gap-4xs text-tertiaryText">
          <div>Số tiền:</div>
        </div>
        <div class="flex flex-grow justify-end">
          <div class="flex gap-2xs break-words">
            <div>${new Intl.NumberFormat('vi-VN').format(transferInfo.amount)} VND</div>
          </div>
        </div>
      </div>
      <div class="flex justify-between">
        <div class="flex w-[150px] flex-shrink-0 gap-4xs text-tertiaryText">
          <div>Nội dung CK:</div>
        </div>
        <div class="flex flex-grow justify-end">
          <div class="flex gap-2xs break-words">
            <div>${transferInfo.referenceMessage}</div>
          </div>
        </div>
      </div>
    `;
    qrContainer.appendChild(qrInfo);
  }
  
  // Chèn container vào popup
  targetContainer.appendChild(qrContainer);
  
  console.log('QR Generator: Đã hiển thị mã QR thành công');
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
