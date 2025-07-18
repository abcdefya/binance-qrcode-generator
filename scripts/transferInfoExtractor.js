// transferInfoExtractor.js
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
    console.log('QR Generator: Bắt đầu trích xuất thông tin chuyển khoản');

    const orderNumberElement = document.querySelector('div[data-bn-type="text"].css-14yjdiq');
    if (orderNumberElement) {
      transferInfo.orderNumber = orderNumberElement.textContent.trim();
      transferInfo.referenceMessage = transferInfo.orderNumber;
      console.log('QR Generator: orderNumber:', transferInfo.orderNumber);
    } else {
      console.warn('QR Generator: Không tìm thấy orderNumberElement');
    }

    const paymentMethodElement = document.querySelector('.PaymentMethodItem__text');
    if (paymentMethodElement) {
      transferInfo.paymentMethod = paymentMethodElement.textContent.trim();
      console.log('QR Generator: paymentMethod:', transferInfo.paymentMethod);
    } else {
      console.warn('QR Generator: Không tìm thấy paymentMethodElement');
    }

    const amountElement = document.querySelector('div[data-bn-type="text"].css-1a1squ3');
    if (amountElement) {
      const amountText = amountElement.textContent.trim().replace(/[^0-9.]/g, '');
      transferInfo.amount = parseFloat(amountText);
      console.log('QR Generator: amount:', transferInfo.amount);
    } else {
      console.warn('QR Generator: Không tìm thấy amountElement');
    }

    const accountNameElement = document.querySelector('div[data-bn-type="text"].css-1e7s0x');
    if (accountNameElement) {
      transferInfo.accountName = accountNameElement.textContent.trim();
      console.log('QR Generator: accountName:', transferInfo.accountName);
    } else {
      console.warn('QR Generator: Không tìm thấy accountNameElement');
    }

    const accountNumberElement = document.querySelector('div[data-bn-type="text"].css-1e7s0x + div[data-bn-type="text"]');
    if (accountNumberElement) {
      transferInfo.accountNumber = accountNumberElement.textContent.trim().replace(/\n/g, '').replace(/\t/g, '').replace(/ /g, '');
      console.log('QR Generator: accountNumber:', transferInfo.accountNumber);
    } else {
      console.warn('QR Generator: Không tìm thấy accountNumberElement');
    }

    const bankNameElement = document.querySelector('div[data-bn-type="text"].css-1e7s0x + div[data-bn-type="text"] + div[data-bn-type="text"]');
    if (bankNameElement) {
      transferInfo.bankName = bankNameElement.textContent.trim();
      console.log('QR Generator: bankName:', transferInfo.bankName);
    } else {
      console.warn('QR Generator: Không tìm thấy bankNameElement');
    }

    if (transferInfo.bankName) {
      const bankList = await window.QRGenerator.getBankList();
      const mappedBank = window.QRGenerator.mapBankName(transferInfo.bankName, bankList);
      if (mappedBank) {
        transferInfo.bankBin = mappedBank.bin;
        transferInfo.bankCode = mappedBank.code;
        transferInfo.bankName = mappedBank.name;
        console.log('QR Generator: mappedBank:', mappedBank);
      } else {
        console.warn('QR Generator: Không ánh xạ được ngân hàng:', transferInfo.bankName);
      }
    } else {
      console.warn('QR Generator: bankName không có giá trị');
    }
  } catch (error) {
    console.error('QR Generator: Lỗi khi trích xuất thông tin chuyển khoản:', error);
  }

  console.log('QR Generator: Kết quả transferInfo:', transferInfo);
  return transferInfo;
}

// Gắn vào đối tượng toàn cục QRGenerator
window.QRGenerator = window.QRGenerator || {};
window.QRGenerator.extractBankTransferInfo = extractBankTransferInfo;