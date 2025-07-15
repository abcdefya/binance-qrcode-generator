// content.js

// Truy cập fuzzball và unidecode từ vendor.bundle.js
const fuzz = window.Vendor.fuzzball;
const unidecode = window.Vendor.unidecode;

// Cache cho danh sách ngân hàng và chuỗi chuẩn hóa
let bankListCache = null;
const normalizedCache = new Map();
const bankNameCache = new Map();

// Tải danh sách ngân hàng từ tài nguyên tiện ích
async function getBankList() {
  if (!bankListCache) {
    try {
      const response = await fetch(chrome.runtime.getURL('bankList.json'));
      bankListCache = await response.json();
    } catch (error) {
      console.error('Lỗi khi tải bankList.json:', error);
      bankListCache = {};
    }
  }
  return bankListCache;
}

function normalizeString(str) {
  if (!str) return '';
  if (normalizedCache.has(str)) {
    return normalizedCache.get(str);
  }
  const normalized = unidecode(str.toLowerCase().trim());
  normalizedCache.set(str, normalized);
  return normalized;
}

async function mapBankName(inputBankName) {
  if (!inputBankName) return null;
  if (bankNameCache.has(inputBankName)) {
    return bankNameCache.get(inputBankName);
  }

  const normalizedInput = normalizeString(inputBankName);
  const bankList = await getBankList();
  let result = null;

  // So khớp chính xác với short_name và code
  for (const bankKey in bankList) {
    const bank = bankList[bankKey];
    if (
      normalizedInput === normalizeString(bank.short_name) ||
      normalizedInput === normalizeString(bank.code)
    ) {
      result = { name: bank.name, bin: bank.bin, code: bank.code };
      bankNameCache.set(inputBankName, result);
      return result;
    }
  }

  // So khớp mờ
  let bestMatch = null;
  let highestScore = 0;
  const threshold = 80;

  const banksToCheck = [];
  for (const bankKey in bankList) {
    const bank = bankList[bankKey];
    banksToCheck.push({
      name: bank.name,
      bin: bank.bin,
      code: bank.code,
      normalized_short_name: normalizeString(bank.short_name),
      normalized_code: normalizeString(bank.code),
      normalized_name: normalizeString(bank.name),
    });
  }

  for (const bank of banksToCheck) {
    if (bank.normalized_short_name) {
      const score = fuzz.ratio(normalizedInput, bank.normalized_short_name);
      if (score >= threshold && score > highestScore) {
        highestScore = score;
        bestMatch = { name: bank.name, bin: bank.bin, code: bank.code };
      }
    }
    if (bank.normalized_code) {
      const score = fuzz.ratio(normalizedInput, bank.normalized_code);
      if (score >= threshold && score > highestScore) {
        highestScore = score;
        bestMatch = { name: bank.name, bin: bank.bin, code: bank.code };
      }
    }
    if (bank.normalized_name) {
      const score = fuzz.ratio(normalizedInput, bank.normalized_name);
      if (score >= threshold && score > highestScore) {
        highestScore = score;
        bestMatch = { name: bank.name, bin: bank.bin, code: bank.code };
      }
    }
  }

  bankNameCache.set(inputBankName, bestMatch);
  return bestMatch;
}

function extractBankTransferInfo(doc) {
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
    orderNumber: null,
  };

  try {
    const orderNumberElement = doc.querySelector('div[data-bn-type="text"].css-14yjdiq');
    if (orderNumberElement) {
      transferInfo.orderNumber = orderNumberElement.textContent.trim();
      transferInfo.referenceMessage = transferInfo.orderNumber;
    }

    const paymentMethodElement = doc.querySelector('.PaymentMethodItem__text');
    if (paymentMethodElement) {
      transferInfo.paymentMethod = paymentMethodElement.textContent.trim();
    }

    const amountElement = doc.querySelector('.sc-jJMGnK');
    if (amountElement) {
      const amountText = amountElement.textContent.trim();
      const amountMatch = amountText.match(/[\d,]+\.\d+|\d+/);
      if (amountMatch) {
        transferInfo.amount = amountMatch[0].replace(/,/g, '');
      }
    }

    const orderTypeElement = doc.querySelector('.css-vurnku');
    if (orderTypeElement) {
      const orderTypeText = orderTypeElement.textContent;
      transferInfo.orderType = orderTypeText.includes('Mua')
        ? 'buy'
        : orderTypeText.includes('Bán')
        ? 'sell'
        : null;
    }

    const isVietnamBankTransfer = transferInfo.paymentMethod && transferInfo.paymentMethod.includes('(Việt Nam)');

    const labelMap = isVietnamBankTransfer
      ? {
          'Họ và tên': 'accountName',
          'Tên ngân hàng': 'bankName',
          'Số tài khoản/Số thẻ': 'accountNumber',
          'Chi nhánh mở tài khoản': 'bankBranch',
          'Nội dung chuyển khoản': 'referenceMessage',
        }
      : {
          'Name': 'accountName',
          'Bank Card/Account Number': 'accountNumber',
          'Tên ngân hàng': 'bankName',
          'Chi nhánh mở tài khoản': 'bankBranch',
          'Nội dung chuyển khoản': 'referenceMessage',
        };

    const infoRows = doc.querySelectorAll('.flex.justify-between');
    infoRows.forEach((row) => {
      const labelElement = row.querySelector('.text-tertiaryText div');
      const valueElement = row.querySelector('.flex.flex-grow.justify-end .break-words div');
      if (labelElement && valueElement) {
        const label = labelElement.textContent.trim();
        const value = valueElement.textContent.trim();
        const field = labelMap[label];
        if (field) {
          transferInfo[field] = field === 'accountNumber' ? value.replace(/[^0-9]/g, '') : value;
        }
      }
    });

    return mapBankName(transferInfo.bankName).then((bankInfo) => {
      if (bankInfo) {
        transferInfo.bankName = bankInfo Imitation Game
        transferInfo.bankBin = bankInfo.bin;
        transferInfo.bankCode = bankInfo.code;
      }
      return transferInfo;
    });
  } catch (error) {
    console.error('Lỗi khi trích xuất thông tin:', error);
    return null;
  }
}

function generateQRUrl(transferInfo, template = 'compact2') {
  if (!transferInfo || !transferInfo.accountNumber) {
    throw new Error('Thông tin chuyển khoản không hợp lệ');
  }

  const bankId = transferInfo.bankBin || transferInfo.bankCode;
  if (!bankId) {
    throw new Error('Không tìm thấy mã ngân hàng');
  }

  let url = `https://img.vietqr.io/image/${bankId}-${transferInfo.accountNumber}-${template}.png`;
  const params = new URLSearchParams();

  if (transferInfo.amount) {
    params.append('amount', transferInfo.amount);
  }
  if (transferInfo.referenceMessage) {
    params.append('addInfo', transferInfo.referenceMessage);
  }
  if (transferInfo.accountName) {
    const formattedAccountName = unidecode(transferInfo.accountName).toUpperCase();
    params.append('accountName', formattedAccountName);
  }

  const queryString = params.toString();
  if (queryString) {
    url += '?' + queryString;
  }

  return url;
}

// Hiển thị mã QR trong div nổi
function displayQRCode(qrUrl, transferInfo) {
  // Xóa mã QR hiện tại nếu có
  const existingQR = document.getElementById('qr-code-container');
  if (existingQR) {
    existingQR.remove();
  }

  // Tạo container
  const container = document.createElement('div');
  container.id = 'qr-code-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.backgroundColor = 'white';
  container.style.padding = '10px';
  container.style.border = '1px solid #ccc';
  container.style.borderRadius = '5px';
  container.style.zIndex = '10000';
  container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

  // Thêm nút đóng
  const closeButton = document.createElement('button');
  closeButton.textContent = 'X';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '5px';
  closeButton.style.background = 'red';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '3px';
  closeButton.style.cursor = 'pointer';
  closeButton.onclick = () => container.remove();
  container.appendChild(closeButton);

  // Thêm ảnh mã QR
  const qrImage = document.createElement('img');
  qrImage.src = qrUrl;
  qrImage.style.width = '150px';
  qrImage.style.height = '150px';
  container.appendChild(qrImage);

  // Thêm thông tin ngân hàng
  const details = document.createElement('div');
  details.style.marginTop = '10px';
  details.style.fontSize = '12px';
  details.innerHTML = `
    <p><strong>Ngân hàng:</strong> ${transferInfo.bankName || 'N/A'}</p>
    <p><strong>Số tài khoản:</strong> ${transferInfo.accountNumber || 'N/A'}</p>
    <p><strong>Tên:</strong> ${transferInfo.accountName || 'N/A'}</p>
    <p><strong>Số tiền:</strong> ${transferInfo.amount || 'N/A'}</p>
    <p><strong>Nội dung:</strong> ${transferInfo.referenceMessage || 'N/A'}</p>
  `;
  container.appendChild(details);

  document.body.appendChild(container);
}

// Theo dõi trang để phát hiện HTML
function observePage() {
  const observer = new MutationObserver(async (mutations) => {
    // Kiểm tra trạng thái tiện ích
    const { isEnabled } = await chrome.storage.local.get('isEnabled');
    if (!isEnabled) return;

    // Kiểm tra cấu trúc HTML mục tiêu
    const targetElement = document.querySelector('.flex.justify-between');
    if (targetElement) {
      const transferInfo = await extractBankTransferInfo(document);
      if (transferInfo && transferInfo.accountNumber) {
        try {
          const qrUrl = generateQRUrl(transferInfo);
          displayQRCode(qrUrl, transferInfo);
        } catch (error) {
          console.error('Lỗi khi tạo mã QR:', error);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Khởi tạo khi trang tải
chrome.storage.local.get('isEnabled', ({ isEnabled }) => {
  if (isEnabled === undefined) {
    chrome.storage.local.set({ isEnabled: true });
  }
  if (isEnabled) {
    observePage();
  }
});

// Lắng nghe tin nhắn bật/tắt
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle') {
    if (message.isEnabled) {
      observePage();
    } else {
      const existingQR = document.getElementById('qr-code-container');
      if (existingQR) {
        existingQR.remove();
      }
    }
  }
});