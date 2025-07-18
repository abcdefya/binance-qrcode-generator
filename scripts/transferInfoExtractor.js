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
    const amountElement = document.querySelector('div[data-bn-type="text"].css-1a1squ3');
    if (amountElement) {
      const amountText = amountElement.textContent.trim().replace(/[^0-9.]/g, '');
      transferInfo.amount = parseFloat(amountText);
    }
    const accountNameElement = document.querySelector('div[data-bn-type="text"].css-1e7s0x');
    if (accountNameElement) {
      transferInfo.accountName = accountNameElement.textContent.trim();
    }
    const accountNumberElement = document.querySelector('div[data-bn-type="text"].css-1e7s0x + div[data-bn-type="text"]');
    if (accountNumberElement) {
      transferInfo.accountNumber = accountNumberElement.textContent.trim().replace(/\n/g, '').replace(/\t/g, '').replace(/ /g, '');
    }
    const bankNameElement = document.querySelector('div[data-bn-type="text"].css-1e7s0x + div[data-bn-type="text"] + div[data-bn-type="text"]');
    if (bankNameElement) {
      transferInfo.bankName = bankNameElement.textContent.trim();
    }
    if (transferInfo.bankName) {
      const bankList = await window.QRGenerator.getBankList();
      const mappedBank = window.QRGenerator.mapBankName(transferInfo.bankName, bankList);
      if (mappedBank) {
        transferInfo.bankBin = mappedBank.bin;
        transferInfo.bankCode = mappedBank.code;
        transferInfo.bankName = mappedBank.name;
      }
    }
  } catch (error) {
    console.error('QR Generator: Lỗi khi trích xuất thông tin chuyển khoản:', error);
  }
  return transferInfo;
}

// Gắn vào đối tượng toàn cục QRGenerator
window.QRGenerator = window.QRGenerator || {};
window.QRGenerator.extractBankTransferInfo = extractBankTransferInfo; 