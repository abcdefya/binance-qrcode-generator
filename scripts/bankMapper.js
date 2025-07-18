// bankMapper.js
async function getBankList() {
  try {
    const response = await fetch(chrome.runtime.getURL('bankList.json'));
    return await response.json();
  } catch (error) {
    console.error('QR Generator: Lỗi khi đọc file bankList.json:', error);
    return {};
  }
}

// Hàm chuẩn hóa chuỗi
function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Hàm tìm kiếm ngân hàng
function mapBankName(inputBankName, bankList) {
  if (!inputBankName || !bankList) return null;

  const normalizedInput = normalizeString(inputBankName);

  // Chuyển bankList thành mảng để sử dụng với Fuse.js
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
    return {
      name: bank.name,
      bin: bank.bin,
      code: bank.code
    };
  }

  return null;
}

export { getBankList, mapBankName };