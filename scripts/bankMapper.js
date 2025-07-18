// bankMapper.js
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

function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

  console.warn('QR Generator: Không tìm thấy ngân hàng phù hợp cho:', normalizedInput);
  return null;
}

// Gắn vào đối tượng toàn cục QRGenerator
window.QRGenerator = window.QRGenerator || {};
window.QRGenerator.getBankList = getBankList;
window.QRGenerator.mapBankName = mapBankName;