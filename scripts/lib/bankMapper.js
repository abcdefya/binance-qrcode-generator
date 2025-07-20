// Bank Mapper Module
// This module handles bank name searching and mapping functionality

// Ensure fuzzball is available in the global scope for Chrome extension
if (typeof fuzzball === 'undefined') {
  console.error('QR Generator: fuzzball.js is not loaded. Bank mapping might not work correctly.');
}

// Hàm chuẩn hóa tiếng Việt (chuyển có dấu thành không dấu)
function removeDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

// Hàm tách và lọc từ khóa từ chuỗi đầu vào
function preprocessQuery(query) {
  // Loại bỏ ký tự đặc biệt và tách thành từ
  const cleanedQuery = query.replace(/[\(\)[\]\,]/g, ' ').trim();
  const tokens = cleanedQuery.split(/\s+/).map(removeDiacritics).filter(token => 
    token && !['nh', 'tmcp', 'ngan', 'hang', 'thuong', 'mai', 'co', 'phan'].includes(token)
  );
  return tokens;
}

// Hàm tìm kiếm ngân hàng
function mapBankName(inputBankName, bankList) {
  if (!inputBankName || !bankList) return null;

  const tokens = preprocessQuery(inputBankName);
  if (tokens.length === 0) return null;

  // Tiền xử lý dữ liệu ngân hàng
  const bankData = Object.entries(bankList).map(([key, value]) => {
    const searchableText = removeDiacritics(
      [value.name, value.short_name, value.code, ...(value.keywords || [])].join(' ')
    );
    return {
      key,
      name: value.name,
      short_name: value.short_name,
      bin: value.bin,
      code: value.code,
      searchableText
    };
  });

  // Tìm kiếm chính xác
  for (const bank of bankData) {
    const normalizedBankFields = [
      bank.short_name.toLowerCase(),
      bank.code.toLowerCase(),
      ...bank.searchableText.split(' ')
    ];
    for (const token of tokens) {
      if (normalizedBankFields.some(field => field === token)) {
        return {
          name: bank.name,
          bin: bank.bin,
          code: bank.code
        };
      }
    }
  }

  // Tìm kiếm mờ với fuzzball.js
  if (typeof fuzzball !== 'undefined') {
    const options = { scorer: fuzzball.partial_ratio, returnObjects: true };
    let bestMatch = null;
    let highestScore = 0;

    for (const token of tokens) {
      const results = fuzzball.extract(token, bankData, { key: 'searchableText', ...options });
      if (results.length > 0 && results[0].score > 85) {
        if (results[0].score > highestScore) {
          highestScore = results[0].score;
          bestMatch = results[0].obj;
        }
      }
    }

    if (bestMatch) {
      return {
        name: bestMatch.name,
        bin: bestMatch.bin,
        code: bestMatch.code
      };
    }
  } else {
    console.error('QR Generator: fuzzball.js chưa được tải');
  }

  return null;
}

// Export the function for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mapBankName };
} else {
  window.bankMapper = { mapBankName };
} 