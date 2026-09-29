import { useEffect, useRef, useState } from 'react'
import ProjectLocationMap from './ProjectLocationMap'
import { PROVINCES } from '../../lib/provinces'
import {
  PROVINCE_EMSIFA_ID,
  PROVINCE_BOUNDARY_CODE,
  PROVINCE_REGENCY_IDS,
  fetchRegencies,
  fetchDistricts,
  fetchVillages,
} from '../../lib/wilayah'
import { countCoordinates, findInvalidCoordinate } from '../../lib/geo'
import {
  getProvinsi as fetchApiProvinsi,
  getKabupatenKota as fetchApiKabupaten,
  getKecamatan as fetchApiKecamatan,
  getDesaKelurahan as fetchApiDesa,
  lookupBoundary as fetchApiBoundaryLookup,
} from '../../services/geographyService'

const MAX_COORDINATES = 400000

export default function AdministrativeBoundaryPicker({
  province = '',
  onProvinceChange,
  value = null,
  onFound,
  onReset,
  height = 320,
  onRegionChange,
}) {
  const [dbProvinsiList, setDbProvinsiList] = useState([])
  const [regencies, setRegencies] = useState([])
  const [districts, setDistricts] = useState([])
  const [villages, setVillages] = useState([])
  const [regency, setRegency] = useState(null)
  const [district, setDistrict] = useState(null)
  const [village, setVillage] = useState(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingBoundary, setLoadingBoundary] = useState(false)
  const [notice, setNotice] = useState(null)

  const requestId = useRef(0)
  const isFirstRun = useRef(true)

  // Fetch provinsi list from PKSPL backend API on mount
  useEffect(() => {
    let isMounted = true
    fetchApiProvinsi()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setDbProvinsiList(data)
        }
      })
      .catch(() => {
        // Silent fallback to static PROVINCES list if backend master DB is empty
      })
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    setRegency(null)
    setDistrict(null)
    setVillage(null)
    setRegencies([])
    setDistricts([])
    setVillages([])
    setNotice(null)

    const skipAutoDraw = (isFirstRun.current && !!value) || !!value
    isFirstRun.current = false

    if (!province) {
      if (!skipAutoDraw && !value) onReset?.()
      return
    }

    // Find DB record if available
    const dbProv = dbProvinsiList.find(p => p.nama_provinsi?.toLowerCase() === province.toLowerCase())
    const provCode = dbProv?.kode_provinsi || PROVINCE_BOUNDARY_CODE[province] || PROVINCE_EMSIFA_ID[province]

    if (!skipAutoDraw && !value && provCode) {
      lookupBoundary(1, provCode, province)
    }

    const emsifaId = PROVINCE_EMSIFA_ID[province]
    const keep = PROVINCE_REGENCY_IDS[province]

    setLoadingList(true)

    // Try backend API first, fallback to emsifa public dataset
    if (dbProv?.id_provinsi) {
      fetchApiKabupaten(dbProv.id_provinsi)
        .then((rows) => {
          if (Array.isArray(rows) && rows.length > 0) {
            const mapped = rows.map(r => ({ id: String(r.id_kabupaten_kota || r.kode_kabupaten_kota), code: r.kode_kabupaten_kota, name: r.nama_kabupaten_kota, rawId: r.id_kabupaten_kota }))
            setRegencies(mapped)
          } else if (emsifaId) {
            return fetchRegencies(emsifaId).then(rows => setRegencies(keep ? rows.filter(r => keep.includes(r.id)) : rows))
          }
        })
        .catch(() => {
          if (emsifaId) fetchRegencies(emsifaId).then(rows => setRegencies(keep ? rows.filter(r => keep.includes(r.id)) : rows))
        })
        .finally(() => setLoadingList(false))
    } else if (emsifaId) {
      fetchRegencies(emsifaId)
        .then((rows) => setRegencies(keep ? rows.filter((r) => keep.includes(r.id)) : rows))
        .catch(() => setNotice({ type: 'error', text: 'Gagal memuat daftar kabupaten/kota.' }))
        .finally(() => setLoadingList(false))
    } else {
      setLoadingList(false)
    }
  }, [province, dbProvinsiList])

  // Cleanup on unmount to cancel pending boundary requests
  useEffect(() => {
    return () => {
      requestId.current += 1
      setLoadingBoundary(false)
    }
  }, [])

  async function lookupBoundary(level, code, label) {
    const myRequestId = ++requestId.current
    setLoadingBoundary(true)
    setNotice(null)
    onReset?.()

    try {
      const data = await fetchApiBoundaryLookup(level, code)
      if (myRequestId !== requestId.current) return

      if (!data.found) {
        setNotice({
          type: 'warning',
          text: `Batas poligon untuk "${label}" belum tersedia di database wilayah. Anda dapat mengunggah file SHP manual untuk polygon yang presisi.`,
        })
        return
      }

      const invalid = findInvalidCoordinate(data.boundary)
      const tooDetailed = countCoordinates(data.boundary) > MAX_COORDINATES
      if (invalid || tooDetailed) {
        setNotice({
          type: 'warning',
          text: 'Batas wilayah untuk lokasi ini tidak valid atau terlalu detail untuk digambar otomatis. Gunakan upload SHP manual.',
        })
        return
      }

      onFound?.(data.boundary, data.center, label)
    } catch (err) {
      if (myRequestId !== requestId.current) return
      setNotice({
        type: 'error',
        text: `Gagal mengambil geometri "${label}" dari server. Silakan periksa koneksi.`,
      })
    } finally {
      if (myRequestId === requestId.current) setLoadingBoundary(false)
    }
  }

  function drawProvince() {
    if (!province) return
    const dbProv = dbProvinsiList.find(p => p.nama_provinsi?.toLowerCase() === province.toLowerCase())
    const provCode = dbProv?.kode_provinsi || PROVINCE_BOUNDARY_CODE[province] || PROVINCE_EMSIFA_ID[province]
    lookupBoundary(1, provCode, province)
  }

  function handleRegencyChange(id) {
    const r = regencies.find((x) => String(x.id) === String(id)) || null
    setRegency(r)
    setDistrict(null)
    setVillage(null)
    setDistricts([])
    setVillages([])
    onRegionChange?.({ regency: r, district: null, village: null })

    if (!r) {
      drawProvince()
      return
    }

    setLoadingList(true)

    if (r.rawId) {
      fetchApiKecamatan(r.rawId)
        .then((rows) => {
          if (Array.isArray(rows) && rows.length > 0) {
            setDistricts(rows.map(d => ({ id: String(d.id_kecamatan || d.kode_kecamatan), code: d.kode_kecamatan, name: d.nama_kecamatan, rawId: d.id_kecamatan })))
          } else {
            return fetchDistricts(r.id).then(setDistricts)
          }
        })
        .catch(() => fetchDistricts(r.id).then(setDistricts))
        .finally(() => setLoadingList(false))
    } else {
      fetchDistricts(r.id)
        .then(setDistricts)
        .catch(() => setNotice({ type: 'error', text: 'Gagal memuat daftar kecamatan.' }))
        .finally(() => setLoadingList(false))
    }

    lookupBoundary(2, r.code || r.id, r.name)
  }

  function handleDistrictChange(id) {
    const d = districts.find((x) => String(x.id) === String(id)) || null
    setDistrict(d)
    setVillage(null)
    setVillages([])
    onRegionChange?.({ regency, district: d, village: null })

    if (!d) {
      if (regency) lookupBoundary(2, regency.code || regency.id, regency.name)
      else drawProvince()
      return
    }

    setLoadingList(true)

    if (d.rawId) {
      fetchApiDesa(d.rawId)
        .then((rows) => {
          if (Array.isArray(rows) && rows.length > 0) {
            setVillages(rows.map(v => ({ id: String(v.id_desa_kelurahan || v.kode_desa_kelurahan), code: v.kode_desa_kelurahan, name: v.nama_desa_kelurahan })))
          } else {
            return fetchVillages(d.id).then(setVillages)
          }
        })
        .catch(() => fetchVillages(d.id).then(setVillages))
        .finally(() => setLoadingList(false))
    } else {
      fetchVillages(d.id)
        .then(setVillages)
        .catch(() => setNotice({ type: 'error', text: 'Gagal memuat daftar kelurahan/desa.' }))
        .finally(() => setLoadingList(false))
    }

    lookupBoundary(3, d.code || d.id, `Kecamatan ${d.name}, ${regency?.name || ''}`)
  }

  function handleVillageChange(id) {
    const v = villages.find((x) => String(x.id) === String(id)) || null
    setVillage(v)
    onRegionChange?.({ regency, district, village: v })

    if (!v) {
      if (district) lookupBoundary(3, district.code || district.id, `Kecamatan ${district.name}, ${regency?.name || ''}`)
      else if (regency) lookupBoundary(2, regency.code || regency.id, regency.name)
      else drawProvince()
      return
    }

    lookupBoundary(4, v.code || v.id, `${v.name}, Kecamatan ${district?.name || ''}, ${regency?.name || ''}`)
  }

  function reset() {
    setRegency(null)
    setDistrict(null)
    setVillage(null)
    setDistricts([])
    setVillages([])
    setNotice(null)
    onReset?.()
  }

  const provinceOptions = dbProvinsiList.length > 0
    ? dbProvinsiList.map(p => p.nama_provinsi)
    : PROVINCES

  const isMapVisible = loadingBoundary || !!value || !!notice

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1.5">Provinsi</label>
          <div className="relative">
            <select
              value={province}
              onChange={(e) => onProvinceChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none transition-all duration-200 focus:border-[#5046e5] focus:ring-2 focus:ring-[#5046e5]/20 appearance-none bg-white cursor-pointer"
            >
              <option value="">— Pilih provinsi —</option>
              {provinceOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1.5">Kabupaten/Kota</label>
          <div className="relative">
            <select
              value={regency?.id ?? ''}
              onChange={(e) => handleRegencyChange(e.target.value)}
              disabled={!province || loadingList}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none transition-all duration-200 focus:border-[#5046e5] focus:ring-2 focus:ring-[#5046e5]/20 appearance-none bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">{loadingList && !regencies.length ? 'Memuat data...' : '— Pilih kabupaten/kota —'}</option>
              {regencies.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1.5">Kecamatan</label>
          <div className="relative">
            <select
              value={district?.id ?? ''}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={!regency || loadingList}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none transition-all duration-200 focus:border-[#5046e5] focus:ring-2 focus:ring-[#5046e5]/20 appearance-none bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">— Pilih kecamatan —</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1.5">Kelurahan/Desa</label>
          <div className="relative">
            <select
              value={village?.id ?? ''}
              onChange={(e) => handleVillageChange(e.target.value)}
              disabled={!district || loadingList}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none transition-all duration-200 focus:border-[#5046e5] focus:ring-2 focus:ring-[#5046e5]/20 appearance-none bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">— Pilih kelurahan/desa —</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
          </div>
        </div>
      </div>

      {isMapVisible ? (
        <div>
          <div className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm" style={{ height }}>
            <ProjectLocationMap boundary={loadingBoundary ? null : value} height={height} />

            {/* Map Loading Overlay */}
            {loadingBoundary && (
              <div className="absolute inset-0 z-[1000] bg-white/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-4 text-center transition-all duration-200">
                <div className="w-10 h-10 border-4 border-[#5046e5]/20 border-t-[#5046e5] rounded-full animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-800">Memuat batas wilayah...</p>
                  <p className="text-xs text-gray-500">Mengambil data geometri dari server</p>
                </div>
              </div>
            )}

            {/* Notice / Error Overlay */}
            {!loadingBoundary && notice && (
              <div className="absolute inset-x-4 top-4 z-[1000]">
                <div className={`p-3.5 rounded-xl text-xs border shadow-lg backdrop-blur-md ${
                  notice.type === 'error'
                    ? 'bg-red-50/95 text-red-700 border-red-200'
                    : 'bg-amber-50/95 text-amber-900 border-amber-200'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {notice.type === 'error' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      )}
                    </svg>
                    <div>
                      <span className="font-bold">{notice.type === 'error' ? 'Gagal Memuat Geometri' : 'Informasi Wilayah'}</span>
                      <p className="mt-0.5 text-gray-700">{notice.text}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {value && !loadingBoundary && (
            <div className="flex justify-end mt-2">
              <button
                type="button"
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                onClick={reset}
              >
                Reset Pilihan Boundary
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center p-8 text-center"
          style={{ minHeight: height }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">Pilih wilayah di atas untuk menggambar batas area secara otomatis</p>
          <p className="text-xs text-gray-400 mt-1">Atau gunakan tab "Upload File SHP" untuk menentukan poligon kustom</p>
        </div>
      )}
    </div>
  )
}
