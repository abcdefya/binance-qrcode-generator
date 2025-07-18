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

// Gắn vào đối tượng toàn cục QRGenerator
window.QRGenerator = window.QRGenerator || {};
window.QRGenerator.getBankList = getBankList;
window.QRGenerator.mapBankName = mapBankName;