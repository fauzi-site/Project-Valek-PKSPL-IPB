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

export const TIMEZONE_INDONESIA = 'Asia/Jakarta';

/**
 * Mendapatkan komponen tanggal (tahun, bulan, hari, jam, menit, detik)
 * dalam zona waktu Asia/Jakarta (WIB).
 */
export const getJakartaDateParts = (dateInput) => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_INDONESIA,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const map = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
  };
};

/**
 * Format jam dalam WIB dengan format HH.mm (contoh: 09.33)
 */
export const formatTimeJakarta = (dateInput) => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE_INDONESIA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d).replace(':', '.');
};

/**
 * Format tanggal dalam WIB (contoh: 30 Sep 2026)
 */
export const formatDateJakarta = (dateInput, monthFormat = 'short') => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE_INDONESIA,
    day: 'numeric',
    month: monthFormat,
    year: 'numeric',
  }).format(d);
};

/**
 * Format tanggal dan waktu absolut lengkap dalam WIB (contoh: 30 Sep 2026, 09.33 WIB)
 */
export const formatDateTimeJakarta = (dateInput) => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return `${formatDateJakarta(d, 'short')}, ${formatTimeJakarta(d)} WIB`;
};

/**
 * Menghitung selisih kalender dalam hari di zona waktu Asia/Jakarta.
 */
export const getJakartaCalendarDayDiff = (nowDate, targetDate) => {
  const partsNow = getJakartaDateParts(nowDate);
  const partsTarget = getJakartaDateParts(targetDate);
  if (!partsNow || !partsTarget) return null;

  const midnightNowUtc = Date.UTC(partsNow.year, partsNow.month - 1, partsNow.day);
  const midnightTargetUtc = Date.UTC(partsTarget.year, partsTarget.month - 1, partsTarget.day);

  return Math.round((midnightNowUtc - midnightTargetUtc) / (24 * 3600 * 1000));
};

/**
 * Memformat kolom Aktivitas Terakhir dan indikator kebaruan login pengguna
 * sesuai aturan bisnis sistem PKSPL IPB.
 *
 * @param {string|number|Date|null} timestamp - Waktu aktivitas/login terakhir
 * @param {Date} [now=new Date()] - Waktu acuan sekarang
 * @param {Object} [options] - Opsi tambahan: { isOnline, lastLoginAt, lastSeenAt }
 */
export const formatUserLastActive = (timestamp, now = new Date(), options = {}) => {
  const { isOnline = false, lastLoginAt = null, lastSeenAt = null } = options;

  // Kasus: Pengguna sedang online pada sesi aktif
  if (isOnline) {
    const loginTimeStr = lastLoginAt ? formatTimeJakarta(lastLoginAt) : null;
    const loginAbsStr = lastLoginAt ? formatDateTimeJakarta(lastLoginAt) : null;

    return {
      relativeText: 'Sedang Online',
      secondaryText: loginTimeStr && loginTimeStr !== '-' ? `Login ${loginTimeStr}` : 'Sesi aktif',
      category: 'recent',
      categoryLabel: 'Aktif baru-baru ini (< 24 jam)',
      dotColor: 'bg-emerald-500 animate-pulse',
      tooltip: loginAbsStr && !loginAbsStr.startsWith('-')
        ? `Sedang Online • Sesi aktif (Login terakhir: ${loginAbsStr})`
        : 'Sedang Online • Sesi aktif saat ini',
    };
  }

  // Kasus: Pengguna belum pernah login (timestamp null, undefined, atau string kosong)
  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return {
      relativeText: 'Belum pernah login',
      secondaryText: 'Belum ada riwayat',
      category: 'never',
      categoryLabel: 'Belum pernah login',
      dotColor: 'bg-slate-300 ring-1 ring-slate-400/50',
      tooltip: 'Pengguna belum pernah login ke sistem',
    };
  }

  const targetDate = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(targetDate.getTime())) {
    return {
      relativeText: 'Tidak diketahui',
      secondaryText: '-',
      category: 'unknown',
      categoryLabel: 'Tidak diketahui',
      dotColor: 'bg-slate-300',
      tooltip: 'Waktu aktivitas tidak valid atau tidak tersedia',
    };
  }

  const diffMs = Math.max(0, now.getTime() - targetDate.getTime());
  const calDays = getJakartaCalendarDayDiff(now, targetDate) ?? 0;

  const timeStr = formatTimeJakarta(targetDate);
  const dateStr = formatDateJakarta(targetDate, 'short');
  const fullDateTimeStr = formatDateTimeJakarta(targetDate);

  // 1. Kategori Kebaruan (Indikator Frekuensi / Kebaruan Login):
  // - Aktif baru-baru ini: < 24 jam
  // - Jarang aktif: 1–7 hari
  // - Tidak aktif: lebih dari 7 hari
  let category = '';
  let categoryLabel = '';
  let dotColor = '';

  if (diffMs < 24 * 3600 * 1000) {
    category = 'recent';
    categoryLabel = 'Aktif baru-baru ini (< 24 jam)';
    dotColor = 'bg-emerald-500';
  } else if (calDays <= 7) {
    category = 'infrequent';
    categoryLabel = 'Jarang aktif (1–7 hari)';
    dotColor = 'bg-amber-500';
  } else {
    category = 'inactive';
    categoryLabel = 'Tidak aktif (> 7 hari)';
    dotColor = 'bg-slate-400';
  }

  // 2. Format Tampilan Waktu Relatif & Sekunder
  let relativeText = '';
  let secondaryText = '';

  if (diffMs < 60 * 1000) {
    // Kurang dari 1 menit: "Baru saja"
    relativeText = 'Baru saja';
    secondaryText = `${timeStr} WIB`;
  } else if (diffMs < 3600 * 1000) {
    // Kurang dari 1 jam: "X menit yang lalu"
    const minutes = Math.floor(diffMs / 60000);
    relativeText = `${minutes} menit yang lalu`;
    secondaryText = `${timeStr} WIB`;
  } else if (calDays === 0) {
    // Kurang dari 24 jam (hari yang sama): "X jam yang lalu"
    const hours = Math.floor(diffMs / 3600000);
    relativeText = `${hours} jam yang lalu`;
    secondaryText = `Hari ini, ${timeStr}`;
  } else if (calDays === 1) {
    // Sekitar 24 jam atau lebih (kemarin): "Kemarin"
    relativeText = 'Kemarin';
    secondaryText = timeStr;
  } else if (calDays < 7) {
    // 2-6 hari yang lalu: "X hari yang lalu"
    relativeText = `${calDays} hari yang lalu`;
    secondaryText = `${dateStr}, ${timeStr}`;
  } else if (calDays < 14) {
    // 7-13 hari yang lalu: jika pas 7 hari -> "1 minggu yang lalu", jika 10 hari -> "10 hari yang lalu"
    if (calDays === 7) {
      relativeText = '1 minggu yang lalu';
    } else {
      relativeText = `${calDays} hari yang lalu`;
    }
    secondaryText = `${dateStr}, ${timeStr}`;
  } else if (calDays < 30) {
    const weeks = Math.floor(calDays / 7);
    relativeText = `${weeks} minggu yang lalu`;
    secondaryText = `${dateStr}, ${timeStr}`;
  } else if (calDays < 60) {
    relativeText = '1 bulan yang lalu';
    secondaryText = dateStr;
  } else if (calDays < 365) {
    const months = Math.floor(calDays / 30);
    relativeText = `${months} bulan yang lalu`;
    secondaryText = dateStr;
  } else {
    const years = Math.floor(calDays / 365);
    relativeText = `${years} tahun yang lalu`;
    secondaryText = dateStr;
  }

  let tooltip = '';
  if (lastLoginAt && lastSeenAt && lastLoginAt !== lastSeenAt) {
    tooltip = `Aktivitas Sesi: ${formatDateTimeJakarta(lastSeenAt)} • Login: ${formatDateTimeJakarta(lastLoginAt)} (${categoryLabel})`;
  } else {
    tooltip = `Aktivitas Terakhir: ${fullDateTimeStr} • ${categoryLabel}`;
  }

  return {
    relativeText,
    secondaryText,
    category,
    categoryLabel,
    dotColor,
    tooltip,
  };
};
