import { useState, useEffect } from 'react'
import AdministrativeBoundaryPicker from './AdministrativeBoundaryPicker'
import ShpUploader from './ShpUploader'

const TABS = [
  { key: 'wilayah', label: 'Pilih Wilayah Administratif' },
  { key: 'shp', label: 'Upload File SHP' },
]

export default function BoundarySourcePicker({
  value = null,
  onParsed,
  onClear,
  province = '',
  onProvinceChange,
  height = 320,
  onRegionChange,
  onTabChange,
  activeTab = 'wilayah',
}) {
  const [tab, setTab] = useState(activeTab)

  useEffect(() => {
    if (activeTab && activeTab !== tab) {
      setTab(activeTab)
    }
  }, [activeTab])

  const handleTabClick = (newTab) => {
    if (newTab === tab) return
    setTab(newTab)
    onTabChange?.(newTab)
    onClear?.() // Clear previous mode's geometry state
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => handleTabClick(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              tab === t.key
                ? 'bg-[#5046e5] text-white shadow-md shadow-indigo-500/25'
                : 'bg-white text-gray-600 border border-gray-300 hover:border-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'wilayah' ? (
        <AdministrativeBoundaryPicker
          province={province}
          onProvinceChange={onProvinceChange}
          value={value}
          onFound={onParsed}
          onReset={onClear}
          height={height}
          onRegionChange={onRegionChange}
        />
      ) : (
        <ShpUploader value={value} onParsed={onParsed} onClear={onClear} height={height} />
      )}
    </div>
  )
}
