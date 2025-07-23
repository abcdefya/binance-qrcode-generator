// Bank Mapper Module
// This module handles bank name searching and mapping functionality

// Normalize Vietnamese diacritics
function normalizeVietnamese(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a, b) {
  const matrix = Array(b.length + 1)
    .fill()
    .map(() => Array(a.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

// Generate dynamic aliases from bank name and short_name
function generateDynamicAliases(bank) {
  const aliases = [];
  const nameParts = bank.name.toLowerCase().split(' ');
  const shortNameParts = bank.short_name.toLowerCase().split(' ');

  // Add individual words from name and short_name
  aliases.push(...nameParts, ...shortNameParts);
  // Add concatenated short_name without spaces
  aliases.push(bank.short_name.toLowerCase().replace(/\s/g, ''));
  // Add code as a potential alias
  aliases.push(bank.code.toLowerCase());
  // Add concatenated core name (e.g., "thinhvuong" for VPBank)
  const coreName = nameParts.filter(part => !['ngân', 'hàng', 'tmcp', 'thương', 'mại', 'cổ', 'phần', 'việt', 'nam'].includes(part)).join('');
  if (coreName) aliases.push(coreName);
  return [...new Set(aliases)]; // Remove duplicates
}

// Preprocess input according to new rules
function preprocessInput(input) {
  let processed = input.toLowerCase().trim();

  // Rule 1: Remove parentheses and content inside
  processed = processed.replace(/\([^()]*\)/g, '').trim();

  // Rule 2: Remove 'by' and everything after it
  processed = processed.split(/\s+by\s+/)[0].trim();

  // Rule 3: Remove stopwords
  const stopwords = ['ngân hàng', 'nh', 'thương mại cổ phần', 'tmcp', 'việt nam', 'thương', 'mại', 'cổ', 'phần'];
  stopwords.forEach(word => {
    processed = processed.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
  });

  // Rule 4: If more than 3 chars before 'bank' with space, remove 'bank'
  if (processed.match(/^.{3,}\s+bank$/)) {
    processed = processed.replace(/\s+bank$/, '');
  }

  // Rule 5: If 2 chars + space + 'bank', concatenate
  if (processed.match(/^[a-zA-Z]{2}\s+bank$/)) {
    processed = processed.replace(/\s+bank$/, 'bank');
  }

  return processed;
}

// Bank search function
function mapBankName(inputBankName, bankList) {
  if (!inputBankName || typeof inputBankName !== 'string' || !bankList) {
    return null;
  }

  // Apply preprocessing
  const processedInput = preprocessInput(inputBankName);
  const normalizedInput = normalizeVietnamese(processedInput).replace(/[\-\s]/g, '');
  const isShortInput = normalizedInput.length <= 6;

  const banks = Object.values(bankList);

  const calculateMatchScore = (bank, field) => {
    const fieldValue = normalizeVietnamese(bank[field].toLowerCase()).replace(/[\-\s]/g, '');
    if (fieldValue === normalizedInput) {
      return { score: 1.0, type: 'exact' };
    }
    if (fieldValue.includes(normalizedInput)) {
      return { score: 0.9, type: 'partial' };
    }
    const distance = levenshteinDistance(normalizedInput, fieldValue);
    const maxLen = Math.max(normalizedInput.length, fieldValue.length);
    const similarity = 1 - distance / maxLen;
    const boost = (isShortInput && (field === 'short_name' || field === 'code')) ? 0.15 : 0;
    return { score: similarity + boost, type: 'fuzzy' };
  };

  let bestMatch = null;
  let highestScore = 0;
  let matchType = '';

  for (const bank of banks) {
    // Check code
    const codeMatch = calculateMatchScore(bank, 'code');
    if (codeMatch.score > highestScore) {
      highestScore = codeMatch.score;
      bestMatch = bank;
      matchType = `code_${codeMatch.type}`;
    }

    // Check short_name
    const shortNameMatch = calculateMatchScore(bank, 'short_name');
    if (shortNameMatch.score > highestScore) {
      highestScore = shortNameMatch.score;
      bestMatch = bank;
      matchType = `short_name_${shortNameMatch.type}`;
    }

    // Check name
    const nameMatch = calculateMatchScore(bank, 'name');
    if (nameMatch.score > highestScore) {
      highestScore = nameMatch.score;
      bestMatch = bank;
      matchType = `name_${nameMatch.type}`;
    }

    // Check dynamic aliases
    const dynamicAliases = generateDynamicAliases(bank);
    for (const alias of dynamicAliases) {
      const aliasValue = normalizeVietnamese(alias).replace(/[\-\s]/g, '');
      if (aliasValue === normalizedInput) {
        if (0.95 > highestScore) {
          highestScore = 0.95;
          bestMatch = bank;
          matchType = `alias_exact`;
        }
      } else if (aliasValue.includes(normalizedInput)) {
        if (0.85 > highestScore) {
          highestScore = 0.85;
          bestMatch = bank;
          matchType = `alias_partial`;
        }
      } else {
        const distance = levenshteinDistance(normalizedInput, aliasValue);
        const maxLen = Math.max(normalizedInput.length, aliasValue.length);
        const similarity = 1 - distance / maxLen;
        if (similari
ty + 0.1 > highestScore) {
          highestScore = similarity + 0.1;
          bestMatch = bank;
          matchType = `alias_fuzzy`;
        }
      }
    }
  }

  if (highestScore < 0.75) {
    return null;
  }

  return {
    name: bestMatch.name,
    bin: bestMatch.bin,
    code: bestMatch.code
  };
}

// Export the function for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mapBankName };
} else {
  window.bankMapper = { mapBankName };
}