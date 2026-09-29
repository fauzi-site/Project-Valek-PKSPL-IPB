export const formatIDR = (n, compact = false) => {
  if (n === null || n === undefined) return 'Rp 0';
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return 'Rp 0';

  if (compact) {
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1e12) return `${sign}Rp ${formatNumber(abs / 1e12, 2)} T`;
    if (abs >= 1e9) return `${sign}Rp ${formatNumber(abs / 1e9, 2)} M`;
    if (abs >= 1e6) return `${sign}Rp ${formatNumber(abs / 1e6, 1)} jt`;
  }

  const rounded = Math.round(num);
  const isNeg = rounded < 0;
  const absVal = Math.abs(rounded);

  return (isNeg ? '-Rp ' : 'Rp ') + absVal.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

export const formatNumber = (
  n,
  decimals = 2,
  options = {}
) => {
  const fallback = options?.fallback ?? '';
  if (n === null || n === undefined || n === '') return fallback;

  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return fallback;

  // 1. Sanitize decimals: Must be a finite integer between 0 and 20
  const maxDec = Math.max(
    0,
    Math.min(20, Math.floor(Number.isFinite(decimals) ? decimals : 2))
  );

  // 2. If it is an integer or maxDec is 0:
  if (Number.isInteger(num) || maxDec === 0) {
    if (options?.padZeros && maxDec > 0) {
      return num.toLocaleString('id-ID', {
        minimumFractionDigits: maxDec,
        maximumFractionDigits: maxDec
      });
    }
    return num.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  // 3. For decimal numbers:
  let minDec = 0;
  if (options?.padZeros) {
    minDec = maxDec;
  } else if (options?.minimumFractionDigits !== undefined && Number.isFinite(options.minimumFractionDigits)) {
    minDec = Math.max(0, Math.min(maxDec, Math.floor(options.minimumFractionDigits)));
  }

  if (minDec > maxDec) {
    minDec = maxDec;
  }

  return num.toLocaleString('id-ID', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec
  });
};

export const parseIndonesianNumber = (val) => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;

  let str = String(val).trim();
  if (!str) return null;

  // Remove currency prefix and unwanted trailing characters
  str = str.replace(/^[^\d,-]+/, '').replace(/[^\d.,-]+$/, '').trim();
  if (!str) return null;

  // Case 1: Both dot and comma present
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    const commas = str.split(',');
    if (commas.length > 2) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(',', '.');
    }
  } else if (str.includes('.')) {
    const dots = str.split('.');
    if (dots.length > 2) {
      str = str.replace(/\./g, '');
    } else {
      if (dots[1].length === 3) {
        str = str.replace(/\./g, '');
      }
    }
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const formatTime = (date = new Date()) => {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const generateProjectCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomCode = '';
  for (let i = 0; i < 6; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PKS-${randomCode}`;
};
