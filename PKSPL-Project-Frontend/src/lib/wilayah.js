// Client for the emsifa/wilayah-indonesia public dataset — cascading
// Provinsi/Kabupaten-Kota/Kecamatan/Kelurahan-Desa NAME lists
const BASE_URL = 'https://www.emsifa.com/api-wilayah-indonesia/api'

export const PROVINCE_EMSIFA_ID = {
  'Aceh': '11',
  'Sumatera Utara': '12',
  'Sumatera Barat': '13',
  'Riau': '14',
  'Kepulauan Riau': '21',
  'Jambi': '15',
  'Sumatera Selatan': '16',
  'Kepulauan Bangka Belitung': '19',
  'Bengkulu': '17',
  'Lampung': '18',
  'DKI Jakarta': '31',
  'Banten': '36',
  'Jawa Barat': '32',
  'Jawa Tengah': '33',
  'Daerah Istimewa Yogyakarta': '34',
  'Jawa Timur': '35',
  'Bali': '51',
  'Nusa Tenggara Barat': '52',
  'Nusa Tenggara Timur': '53',
  'Kalimantan Barat': '61',
  'Kalimantan Tengah': '62',
  'Kalimantan Selatan': '63',
  'Kalimantan Timur': '64',
  'Kalimantan Utara': '65',
  'Sulawesi Utara': '71',
  'Gorontalo': '75',
  'Sulawesi Tengah': '72',
  'Sulawesi Barat': '76',
  'Sulawesi Selatan': '73',
  'Sulawesi Tenggara': '74',
  'Maluku': '81',
  'Maluku Utara': '82',
  'Papua Barat': '91',
  'Papua Barat Daya': '91',
  'Papua': '94',
  'Papua Tengah': '94',
  'Papua Pegunungan': '94',
  'Papua Selatan': '94',
}

export const PROVINCE_REGENCY_IDS = {
  'Papua': ['9403', '9408', '9409', '9419', '9420', '9426', '9427', '9428', '9471'],
  'Papua Barat': ['9101', '9102', '9103', '9104', '9105', '9111', '9112'],
  'Papua Selatan': ['9401', '9413', '9414', '9415'],
  'Papua Tengah': ['9404', '9410', '9411', '9412', '9433', '9434', '9435', '9436'],
  'Papua Pegunungan': ['9402', '9416', '9417', '9418', '9429', '9430', '9431', '9432'],
  'Papua Barat Daya': ['9106', '9107', '9108', '9109', '9110', '9171'],
}

export const PROVINCE_BOUNDARY_CODE = {
  ...PROVINCE_EMSIFA_ID,
  'Papua': '91',
  'Papua Barat': '92',
  'Papua Selatan': '93',
  'Papua Tengah': '94',
  'Papua Pegunungan': '95',
  'Papua Barat Daya': '96',
}

function titleCase(name) {
  return name
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bDki\b/, 'DKI')
    .replace(/\bDi\b/, 'DI')
}

const listCache = new Map()

async function fetchList(path) {
  if (listCache.has(path)) return listCache.get(path)
  const promise = fetch(`${BASE_URL}/${path}`)
    .then((res) => {
      if (!res.ok) throw new Error(`wilayah lookup failed (${res.status})`)
      return res.json()
    })
    .then((rows) => rows.map((r) => ({ id: r.id, name: titleCase(r.name) })))
  listCache.set(path, promise)
  try {
    return await promise
  } catch (err) {
    listCache.delete(path)
    throw err
  }
}

export function fetchRegencies(provinceEmsifaId) {
  return fetchList(`regencies/${provinceEmsifaId}.json`)
}

export function fetchDistricts(regencyId) {
  return fetchList(`districts/${regencyId}.json`)
}

export function fetchVillages(districtId) {
  return fetchList(`villages/${districtId}.json`)
}
