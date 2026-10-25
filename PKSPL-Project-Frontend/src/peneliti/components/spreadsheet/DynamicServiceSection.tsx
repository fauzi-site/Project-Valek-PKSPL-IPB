import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSpreadsheet } from '../../context/SpreadsheetContext';
import { useProject } from '../../context/ProjectContext';
import { getMethodSchema, ColumnDefinition, CustomColumnDefinition, CustomColumnType, getFaunaRowUnits } from '../../types/methodSchemas';
import { ECOSYSTEM_SERVICES_CONFIG } from '../../mock/valuationMock';
import { PROVISIONING_DATA } from '../../mock/dataMasterMock';
import { downloadContextTemplate, TemplateFileFormat } from '../../utils/excelEngine';
import { formatIDR } from '../../utils/formatter';
import { getProjectDataMaster } from '../../../services/dataMasterService';
import { CustomColumnModal } from './CustomColumnModal';
import { DeleteColumnConfirmModal } from './DeleteColumnConfirmModal';
import { FormattedNumberInput } from './FormattedNumberInput';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Download,
  Upload,
  Trash2,
  Columns3,
  Pencil,
  Lock,
  FileSpreadsheet,
  FileText,
  FileCode,
  FileQuestion
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { SurveyRespondentModal } from './SurveyRespondentModal';

interface DynamicServiceSectionProps {
  projectId?: string;
  prefixLetter: 'A' | 'B' | 'C' | 'D';
  serviceId: 'provisioning' | 'regulating' | 'supporting' | 'cultural';
  serviceName: string;
  methodId?: string;
  activeMethodIds?: string[];
  biota?: 'flora' | 'fauna';
  areaId: string;
  areaName: string;
  areaHa: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onMethodChange?: (newMethodId: string) => void;
  onBiotaChange?: (newBiota: 'flora' | 'fauna') => void;
  onOpenImportModal: (service: string, method: string, category: string) => void;
  highlightedRowId?: string | null;
}

const BiotaAutocomplete = ({ value, onChange, options, placeholder, isHighlighted, activeLocation }: { value: string, onChange: (v: string) => void, options: any[], placeholder: string, isHighlighted: boolean, activeLocation?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = React.useMemo(() => {
    let locationFiltered = options;
    if (activeLocation) {
      const projLoc = activeLocation.toLowerCase();
      const matched = options.filter(opt => {
        const optLoc = (opt.daerah || opt.apiData?.daerah || '').toLowerCase();
        return optLoc && (optLoc.includes(projLoc) || projLoc.includes(optLoc));
      });
      if (matched.length > 0) locationFiltered = matched;
    }
    
    return locationFiltered.filter(opt => {
      const namaIndo = opt.namaIndonesia || opt.nama_indonesia || opt.apiData?.namaIndonesia || '';
      const namaLatin = opt.namaLatin || opt.nama_latin || opt.apiData?.namaLatin || '';
      const label = namaLatin ? `${namaIndo} (${namaLatin})` : namaIndo;
      if (!label) return false;
      
      if (!value) return true;
      const lowerVal = value.toLowerCase();
      const lowerLabel = label.toLowerCase();
      
      return lowerLabel.startsWith(lowerVal) || lowerLabel.includes(` ${lowerVal}`) || lowerLabel.includes(`(${lowerVal}`);
    }).slice(0, 10);
  }, [options, value, activeLocation]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={`w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 text-slate-800 font-medium ${isHighlighted ? 'border-rose-400 bg-rose-50 text-rose-800' : ''}`}
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto text-xs font-medium text-slate-700">
          {filteredOptions.map((opt, i) => {
            const namaIndo = opt.namaIndonesia || opt.nama_indonesia || opt.apiData?.namaIndonesia || '';
            const namaLatin = opt.namaLatin || opt.nama_latin || opt.apiData?.namaLatin || '';
            const label = namaLatin ? `${namaIndo} (${namaLatin})` : namaIndo;
            return (
              <li
                key={i}
                onClick={() => {
                  onChange(label);
                  setIsOpen(false);
                }}
                className="px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 border-b border-slate-100 last:border-0"
              >
                <div className="flex flex-col">
                  <span>{namaIndo}</span>
                  {namaLatin && <span className="text-[10px] text-slate-400 italic font-normal">{namaLatin}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export const DynamicServiceSection: React.FC<DynamicServiceSectionProps> = ({
  projectId,
  prefixLetter,
  serviceId,
  serviceName,
  methodId,
  activeMethodIds,
  biota = 'flora',
  areaId,
  areaName,
  areaHa,
  isOpen,
  onToggleOpen,
  onOpenImportModal,
  highlightedRowId,
}) => {
  const { activeProjectId, activeProject } = useProject();
  const { user } = useAuth() || {};
  const roleName = (user?.role?.nama_role || (typeof user?.role === 'string' ? user.role : '')).toLowerCase();
  const isAdmin = roleName.includes('admin');
  const currentProjId = projectId || activeProjectId;

  const {
    getRows,
    updateCell,
    addRow,
    deleteRow,
    getCustomColumns,
    addCustomColumn,
    updateCustomColumn,
    deleteCustomColumn,
  } = useSpreadsheet();

  // Resolve active methods to render vertically
  const defaultFallbackMethod = serviceId === 'provisioning' ? 'market-price'
    : serviceId === 'regulating' ? 'replacement-cost'
    : serviceId === 'supporting' ? 'nursery-ground'
    : 'tcm';

  const methodsToRender = useMemo(() => {
    if (activeMethodIds && activeMethodIds.length > 0) {
      return activeMethodIds;
    }
    if (methodId) {
      return [methodId];
    }
    return [defaultFallbackMethod];
  }, [activeMethodIds, methodId, defaultFallbackMethod]);

  // Modal states for Custom Columns (tracking active target methodId)
  const [activeModalMethodId, setActiveModalMethodId] = useState<string>(methodsToRender[0]);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CustomColumnDefinition | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<CustomColumnDefinition | null>(null);

  // Survey Questionnaire & Respondent Modal State (TCM & CVM)
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [surveyModalMethod, setSurveyModalMethod] = useState<'tcm' | 'cvm'>('tcm');

  // Modal states for import/download dropdowns in provisioning per method card
  const [importDropdownOpen, setImportDropdownOpen] = useState<Record<string, boolean>>({});
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState<Record<string, boolean>>({});

  // Data Master Autocomplete State
  const [masterBiotaList, setMasterBiotaList] = useState<{ flora: any[], fauna: any[] }>({ flora: [], fauna: [] });

  useEffect(() => {
    if (serviceId === 'provisioning' && isOpen) {
      const processBiotaList = (prov: any[]) => {
        setMasterBiotaList({ flora: prov, fauna: prov });
      };

      if (currentProjId) {
        getProjectDataMaster(currentProjId)
          .then((res: any) => {
            const prov = res?.data?.provisioning || res?.provisioning;
            if (Array.isArray(prov) && prov.length > 0) {
              processBiotaList(prov);
            } else {
              processBiotaList(PROVISIONING_DATA);
            }
          })
          .catch(() => {
            processBiotaList(PROVISIONING_DATA);
          });
      } else {
        processBiotaList(PROVISIONING_DATA);
      }
    }
  }, [serviceId, currentProjId, isOpen]);

  // Category visual accent tokens
  const ACCENT_STYLES: Record<string, { badgeBg: string; badgeText: string; borderLeft: string; pillBg: string; pillText: string }> = {
    provisioning: { badgeBg: 'bg-cyan-100', badgeText: 'text-cyan-800', borderLeft: 'border-l-cyan-600', pillBg: 'bg-cyan-50', pillText: 'text-cyan-700' },
    regulating: { badgeBg: 'bg-blue-100', badgeText: 'text-blue-800', borderLeft: 'border-l-blue-600', pillBg: 'bg-blue-50', pillText: 'text-blue-700' },
    supporting: { badgeBg: 'bg-purple-100', badgeText: 'text-purple-800', borderLeft: 'border-l-purple-600', pillBg: 'bg-purple-50', pillText: 'text-purple-700' },
    cultural: { badgeBg: 'bg-amber-100', badgeText: 'text-amber-800', borderLeft: 'border-l-amber-600', pillBg: 'bg-amber-50', pillText: 'text-amber-700' },
  };

  const accent = ACCENT_STYLES[serviceId] || ACCENT_STYLES.provisioning;

  // Available methods for this service from master config
  const serviceConfig = ECOSYSTEM_SERVICES_CONFIG.find(s => s.id === serviceId);
  const availableMethodsConfig = serviceConfig?.methods || [];

  // Calculation helper: Row Economic Value for a specific method
  const getRowTotal = (row: Record<string, any>, rowBiota?: 'flora' | 'fauna', targetMethodId?: string): number => {
    if (row.totalNilai !== undefined && row.totalNilai !== null && !isNaN(Number(row.totalNilai)) && Number(row.totalNilai) > 0) {
      return Number(row.totalNilai);
    }
    const targetM = targetMethodId || methodsToRender[0];
    const currentSchema = serviceId === 'provisioning'
      ? getMethodSchema(serviceId, targetM, rowBiota || (biota === 'fauna' ? 'fauna' : 'flora'))
      : getMethodSchema(serviceId, targetM);
    const calc = currentSchema.calculateRow(row);
    return (calc && typeof calc.total === 'number' && !isNaN(calc.total)) ? calc.total : 0;
  };

  // Compute category item count across all vertical method cards
  const categoryItemCount = useMemo(() => {
    let count = 0;
    methodsToRender.forEach(mId => {
      if (serviceId === 'provisioning') {
        const fl = getRows(currentProjId, areaId, serviceId, mId, 'flora');
        const fa = getRows(currentProjId, areaId, serviceId, mId, 'fauna');
        count += (fl.length + fa.length);
      } else {
        const r = getRows(currentProjId, areaId, serviceId, mId, 'none');
        count += r.length;
      }
    });
    return count;
  }, [methodsToRender, serviceId, currentProjId, areaId, getRows]);

  // Custom Column Handlers
  const handleSaveCustomColumn = (data: { label: string; type: CustomColumnType; required?: boolean }) => {
    const targetMethodId = activeModalMethodId || methodsToRender[0];
    if (editingColumn) {
      const colIdentifier = editingColumn.key || editingColumn.id;
      if (serviceId === 'provisioning') {
        updateCustomColumn(currentProjId, areaId, serviceId, targetMethodId, 'flora', colIdentifier, data);
        updateCustomColumn(currentProjId, areaId, serviceId, targetMethodId, 'fauna', colIdentifier, data);
      } else {
        updateCustomColumn(currentProjId, areaId, serviceId, targetMethodId, undefined, colIdentifier, data);
      }
    } else {
      if (serviceId === 'provisioning') {
        const rawKey = data.label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const sharedKey = `c_${rawKey || 'col'}_${Date.now().toString(36)}`;
        const sharedId = `col-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const colPayload = { ...data, key: sharedKey, id: sharedId };

        addCustomColumn(currentProjId, areaId, serviceId, targetMethodId, 'flora', colPayload);
        addCustomColumn(currentProjId, areaId, serviceId, targetMethodId, 'fauna', colPayload);
      } else {
        addCustomColumn(currentProjId, areaId, serviceId, targetMethodId, undefined, data);
      }
    }
    setEditingColumn(null);
    setIsColumnModalOpen(false);
  };

  const handleConfirmDeleteColumn = () => {
    const targetMethodId = activeModalMethodId || methodsToRender[0];
    if (deletingColumn) {
      const colIdOrKey = deletingColumn.id || deletingColumn.key;
      if (serviceId === 'provisioning') {
        deleteCustomColumn(currentProjId, areaId, serviceId, targetMethodId, 'flora', colIdOrKey, deletingColumn.key);
        deleteCustomColumn(currentProjId, areaId, serviceId, targetMethodId, 'fauna', colIdOrKey, deletingColumn.key);
      } else {
        deleteCustomColumn(currentProjId, areaId, serviceId, targetMethodId, undefined, colIdOrKey, deletingColumn.key);
      }
      setDeletingColumn(null);
    }
  };

  const handleAddRow = (targetMethodId: string, targetBiota?: 'flora' | 'fauna') => {
    const b = serviceId === 'provisioning' ? (targetBiota || 'flora') : 'none';
    addRow(currentProjId, areaId, serviceId, targetMethodId, b, areaHa);
  };

  const handleDeleteRow = (targetMethodId: string, rowId: string, targetBiota?: 'flora' | 'fauna') => {
    const b = serviceId === 'provisioning' ? (targetBiota || 'flora') : 'none';
    deleteRow(currentProjId, areaId, serviceId, targetMethodId, b, rowId);
  };

  const handleCellChange = (targetMethodId: string, rowId: string, colKey: string, val: any, targetBiota?: 'flora' | 'fauna') => {
    const b = serviceId === 'provisioning' ? (targetBiota || 'flora') : 'none';
    updateCell(currentProjId, areaId, serviceId, targetMethodId, b, rowId, colKey, val);
  };

  const handleDownloadTemplate = (targetMethodId: string, format: TemplateFileFormat = 'xlsx') => {
    downloadContextTemplate(
      serviceId,
      targetMethodId,
      serviceId === 'provisioning' ? (biota === 'fauna' ? 'Fauna' : 'Flora') : 'General',
      format
    );
  };

  // Render Table Row Helper for a specific method
  const renderRow = (
    row: Record<string, any>,
    rIdx: number,
    targetMethodId: string,
    systemColumns: ColumnDefinition[],
    combinedCustomCols: CustomColumnDefinition[],
    rowBiota?: 'flora' | 'fauna'
  ) => {
    const isHighlighted = highlightedRowId === row.id || highlightedRowId === String(row.no);

    return (
      <tr
        key={row.id || `${rowBiota || 'row'}-${rIdx}`}
        className={`hover:bg-blue-50/30 transition-colors ${
          isHighlighted ? 'bg-rose-50 border-2 border-rose-500' : ''
        }`}
      >
        <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-200 bg-slate-50/50">
          {rIdx + 1}
        </td>

        {/* 1. System Column Cells */}
        {systemColumns.map((col: ColumnDefinition) => {
          const val = row[col.key];

          if (col.key === 'totalNilai' || col.type === 'readonly_calculated') {
            const targetM = targetMethodId || methodsToRender[0];
            const currentSchema = serviceId === 'provisioning'
              ? getMethodSchema(serviceId, targetM, rowBiota || (biota === 'fauna' ? 'fauna' : 'flora'))
              : getMethodSchema(serviceId, targetM);
            const calc = currentSchema.calculateRow(row);

            if (calc.isPendingQuantity) {
              return (
                <td
                  key={col.key}
                  className="py-2 px-3 border-r border-slate-200 text-center bg-amber-50/50"
                  title={calc.pendingReason || 'Data kuantitas / volume belum tersedia'}
                >
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Belum dapat dihitung
                  </span>
                </td>
              );
            }

            return (
              <td
                key={col.key}
                className="py-2 px-3 border-r border-slate-200 text-right bg-slate-50 font-mono font-bold text-slate-900 select-all"
              >
                {formatIDR(getRowTotal(row, rowBiota, targetMethodId))}
              </td>
            );
          }

          if (col.type === 'number') {
            let placeholderText = col.placeholder || '0';
            if (serviceId === 'provisioning') {
              if (rowBiota === 'fauna') {
                const faunaUnits = getFaunaRowUnits(row);
                if (col.key === 'produktivitas') {
                  placeholderText = faunaUnits.prodPlaceholder;
                } else if (col.key === 'jumlah') {
                  placeholderText = faunaUnits.qtyPlaceholder;
                } else if (col.key === 'hargaUnit') {
                  placeholderText = faunaUnits.pricePlaceholder;
                }
              } else {
                if (col.key === 'produktivitas') {
                  placeholderText = '0 (m³/ha)';
                } else if (col.key === 'jumlah') {
                  placeholderText = '0 (m³ kayu)';
                } else if (col.key === 'hargaUnit') {
                  placeholderText = 'Rp/m³';
                }
              }
            }
            return (
              <td key={col.key} className="py-1 px-2 border-r border-slate-200 text-right">
                <FormattedNumberInput
                  key={`${row.id}-${col.key}`}
                  value={val}
                  onChange={(numVal) => handleCellChange(targetMethodId, row.id, col.key, numVal, rowBiota)}
                  placeholder={placeholderText}
                  decimals={2}
                  className={`w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 rounded border font-mono ${
                    isHighlighted && (col.key === 'hargaUnit' || col.key === 'hargaOutput')
                      ? 'border-rose-400 bg-rose-50 text-rose-800 font-bold focus:ring-rose-500'
                      : 'border-transparent hover:border-slate-300 focus:border-blue-500 text-slate-800'
                  }`}
                />
              </td>
            );
          }

          const isBiotaItem = col.key === 'item' && serviceId === 'provisioning';
          
          return (
            <td key={col.key} className="py-1 px-2 border-r border-slate-200">
              {isBiotaItem ? (
                <BiotaAutocomplete
                  value={val || ''}
                  onChange={(v) => handleCellChange(targetMethodId, row.id, col.key, v, rowBiota)}
                  options={rowBiota === 'fauna' ? masterBiotaList.fauna : masterBiotaList.flora}
                  placeholder={rowBiota === 'fauna' ? 'Contoh: Ikan Tongkol, Kepiting Bakau (Scylla serrata)' : 'Contoh: Rhizophora apiculata'}
                  isHighlighted={isHighlighted}
                  activeLocation={activeProject?.location}
                />
              ) : (
                <input
                  key={`${row.id}-${col.key}`}
                  type="text"
                  value={val || ''}
                  onChange={(e) => handleCellChange(targetMethodId, row.id, col.key, e.target.value, rowBiota)}
                  placeholder={col.placeholder || ''}
                  className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 text-slate-800 font-medium"
                />
              )}
            </td>
          );
        })}

        {/* 2. Custom Column Cells */}
        {combinedCustomCols.map((col: CustomColumnDefinition) => {
          const val = row[col.key];

          if (col.type === 'integer') {
            return (
              <td key={col.key} className="py-1 px-2 border-r border-slate-200 text-right">
                <FormattedNumberInput
                  key={`${row.id}-${col.key}`}
                  value={val}
                  isIntegerOnly={true}
                  decimals={0}
                  onChange={(numVal) => handleCellChange(targetMethodId, row.id, col.key, numVal, rowBiota)}
                  placeholder="0"
                  className="w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 text-slate-800 font-mono"
                />
              </td>
            );
          }

          if (col.type === 'decimal') {
            return (
              <td key={col.key} className="py-1 px-2 border-r border-slate-200 text-right">
                <FormattedNumberInput
                  key={`${row.id}-${col.key}`}
                  value={val}
                  decimals={2}
                  onChange={(numVal) => handleCellChange(targetMethodId, row.id, col.key, numVal, rowBiota)}
                  placeholder="0,00"
                  className="w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 text-slate-800 font-mono"
                />
              </td>
            );
          }

          if (col.type === 'date') {
            return (
              <td key={col.key} className="py-1 px-2 border-r border-slate-200">
                <input
                  key={`${row.id}-${col.key}`}
                  type="date"
                  value={val || ''}
                  onChange={(e) => handleCellChange(targetMethodId, row.id, col.key, e.target.value, rowBiota)}
                  className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 text-slate-800 font-mono text-xs"
                />
              </td>
            );
          }

          if (col.type === 'boolean') {
            return (
              <td key={col.key} className="py-1 px-2 border-r border-slate-200 text-center">
                <select
                  key={`${row.id}-${col.key}`}
                  value={val === true ? 'true' : val === false ? 'false' : ''}
                  onChange={(e) => {
                    const v = e.target.value === 'true' ? true : e.target.value === 'false' ? false : null;
                    handleCellChange(targetMethodId, row.id, col.key, v, rowBiota);
                  }}
                  className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 text-slate-800 text-xs cursor-pointer font-medium"
                >
                  <option value="">-</option>
                  <option value="true">Ya</option>
                  <option value="false">Tidak</option>
                </select>
              </td>
            );
          }

          return (
            <td key={col.key} className="py-1 px-2 border-r border-slate-200">
              <input
                key={`${row.id}-${col.key}`}
                type="text"
                value={val || ''}
                onChange={(e) => handleCellChange(targetMethodId, row.id, col.key, e.target.value, rowBiota)}
                placeholder={col.label}
                className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 text-slate-800 font-medium"
              />
            </td>
          );
        })}

        {/* 3. Action Column */}
        <td className="py-1.5 px-2 text-center">
          {!isAdmin && (
            <button
              type="button"
              onClick={() => handleDeleteRow(targetMethodId, row.id, rowBiota)}
              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
              title="Hapus baris"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  // Render a Single Method Card vertically
  const renderMethodCard = (mId: string, mIndex: number) => {
    const schema = getMethodSchema(serviceId, mId, serviceId === 'provisioning' ? biota : undefined);
    const selectedMethodConfig = availableMethodsConfig.find(m => m.id === mId);
    const cleanMethodName = selectedMethodConfig?.name || schema.methodName.replace(/\s*\((Flora|Fauna)\)/i, '');
    const systemColumns = schema.columns.filter(col => col.key !== 'no');

    const rows = serviceId === 'provisioning' ? [] : getRows(currentProjId, areaId, serviceId, mId, undefined);
    const customColumns = serviceId === 'provisioning' ? [] : getCustomColumns(currentProjId, areaId, serviceId, mId, undefined);

    const floraRows = serviceId === 'provisioning' ? getRows(currentProjId, areaId, serviceId, mId, 'flora') : [];
    const faunaRows = serviceId === 'provisioning' ? getRows(currentProjId, areaId, serviceId, mId, 'fauna') : [];

    const floraCustomCols = serviceId === 'provisioning' ? getCustomColumns(currentProjId, areaId, serviceId, mId, 'flora') : [];
    const faunaCustomCols = serviceId === 'provisioning' ? getCustomColumns(currentProjId, areaId, serviceId, mId, 'fauna') : [];

    const combinedCustomCols: CustomColumnDefinition[] = serviceId === 'provisioning'
      ? [
          ...floraCustomCols,
          ...faunaCustomCols.filter(f => !floraCustomCols.some(fc => fc.key === f.key || fc.label.toLowerCase() === f.label.toLowerCase()))
        ]
      : customColumns;

    const allMethodRows = serviceId === 'provisioning' ? [...floraRows, ...faunaRows] : rows;
    const pendingQuantityRows = allMethodRows.filter(r => {
      const rowB = r.biota || (faunaRows.includes(r) ? 'fauna' : 'flora');
      const s = serviceId === 'provisioning' ? getMethodSchema(serviceId, mId, rowB) : getMethodSchema(serviceId, mId);
      const calc = s.calculateRow(r);
      return Boolean(calc.isPendingQuantity);
    });
    const calculableRows = allMethodRows.filter(r => {
      const rowB = r.biota || (faunaRows.includes(r) ? 'fauna' : 'flora');
      const s = serviceId === 'provisioning' ? getMethodSchema(serviceId, mId, rowB) : getMethodSchema(serviceId, mId);
      const calc = s.calculateRow(r);
      return !calc.isPendingQuantity;
    });

    const floraTotal = floraRows.reduce((acc, row) => acc + getRowTotal(row, 'flora', mId), 0);
    const faunaTotal = faunaRows.reduce((acc, row) => acc + getRowTotal(row, 'fauna', mId), 0);
    const methodTotal = serviceId === 'provisioning' ? (floraTotal + faunaTotal) : rows.reduce((acc, row) => acc + getRowTotal(row, undefined, mId), 0);

    // Spanning calculations
    const totalColIndex = systemColumns.findIndex(col => col.key === 'totalNilai');
    const leadingColSpan = 1 + (totalColIndex >= 0 ? totalColIndex : systemColumns.length);
    const remainingColSpan = (totalColIndex >= 0 ? systemColumns.length - 1 - totalColIndex : 0) + combinedCustomCols.length + 1;
    const totalColSpan = 1 + systemColumns.length + combinedCustomCols.length + 1;

    const isImportOpen = Boolean(importDropdownOpen[mId]);
    const isDownloadOpen = Boolean(downloadDropdownOpen[mId]);

    return (
      <div key={mId} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
        {/* Method Card Header Bar */}
        <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded text-xs font-extrabold tracking-wider ${accent.badgeBg} ${accent.badgeText} border border-slate-200/60 shadow-2xs`}>
              Metode {methodsToRender.length > 1 ? `${mIndex + 1} dari ${methodsToRender.length}: ` : ''}{cleanMethodName}
            </span>
            {combinedCustomCols.length > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hidden sm:inline-block">
                +{combinedCustomCols.length} Kolom Custom
              </span>
            )}
          </div>

          {/* Action Buttons for this specific method */}
          <div className="flex items-center flex-wrap gap-2">
            {!isAdmin && (
              <>
                {serviceId === 'provisioning' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddRow(mId, 'flora')}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                      title="Tambah baris data Flora (Vegetasi)"
                    >
                      <span>+ Tambah Flora</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddRow(mId, 'fauna')}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                      title="Tambah baris data Fauna (Perikanan / Satwa)"
                    >
                      <span>+ Tambah Fauna</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddRow(mId)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveModalMethodId(mId);
                    setEditingColumn(null);
                    setIsColumnModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Tambah variabel atau kolom baru ke lembar kerja ini"
                >
                  <Columns3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>+ Tambah Kolom</span>
                </button>
              </>
            )}

            {/* Import Data (Excel, CSV, JSON) */}
            {serviceId === 'provisioning' ? (
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => {
                    setImportDropdownOpen(prev => ({ ...prev, [mId]: !prev[mId] }));
                    setDownloadDropdownOpen(prev => ({ ...prev, [mId]: false }));
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Import data (Excel .xlsx, CSV, JSON) untuk Flora atau Fauna"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Import Data</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {isImportOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in-50 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setImportDropdownOpen(prev => ({ ...prev, [mId]: false }));
                        onOpenImportModal(serviceId, mId, 'Flora');
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      <div>
                        <div className="font-semibold">Import Data Flora</div>
                        <div className="text-[10px] text-slate-400">Excel, CSV, atau JSON</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportDropdownOpen(prev => ({ ...prev, [mId]: false }));
                        onOpenImportModal(serviceId, mId, 'Fauna');
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                      <div>
                        <div className="font-semibold">Import Data Fauna</div>
                        <div className="text-[10px] text-slate-400">Excel, CSV, atau JSON</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenImportModal(serviceId, mId, 'General')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title={`Import data (Excel, CSV, JSON) sesuai skema ${schema.methodName}`}
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Import Data</span>
              </button>
            )}

            {/* Download Template (Excel, CSV, JSON) */}
            {serviceId === 'provisioning' ? (
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => {
                    setDownloadDropdownOpen(prev => ({ ...prev, [mId]: !prev[mId] }));
                    setImportDropdownOpen(prev => ({ ...prev, [mId]: false }));
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Download template resmi (Excel, CSV, JSON) untuk Flora atau Fauna"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Template</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {isDownloadOpen && (
                  <div className="absolute right-0 mt-1 w-52 bg-white rounded-md shadow-lg border border-slate-200 py-1.5 z-30 animate-in fade-in-50 duration-100 text-xs">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Template Flora
                    </div>
                    <div className="grid grid-cols-3 gap-1 px-2 pb-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadDropdownOpen(prev => ({ ...prev, [mId]: false }));
                          downloadContextTemplate(serviceId, mId, 'Flora', 'xlsx');
                        }}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px] text-center border border-emerald-200 cursor-pointer"
                      >
                        .xlsx
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadDropdownOpen(prev => ({ ...prev, [mId]: false }));
                          downloadContextTemplate(serviceId, mId, 'Flora', 'csv');
                        }}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[11px] text-center border border-amber-200 cursor-pointer"
                      >
                        .csv
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadDropdownOpen(prev => ({ ...prev, [mId]: false }));
                          downloadContextTemplate(serviceId, mId, 'Flora', 'json');
                        }}
                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded font-semibold text-[11px] text-center border border-purple-200 cursor-pointer"
                      >
                        .json
                      </button>
                    </div>

                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 mt-1">
                      Template Fauna
                    </div>
                    <div className="grid grid-cols-3 gap-1 px-2 pb-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadDropdownOpen(prev => ({ ...prev, [mId]: false }));
                          downloadContextTemplate(serviceId, mId, 'Fauna', 'xlsx');
                        }}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px] text-center border border-emerald-200 cursor-pointer"
                      >
                        .xlsx
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadDropdownOpen(prev => ({ ...prev, [mId]: false }));
                          downloadContextTemplate(serviceId, mId, 'Fauna', 'csv');
                        }}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[11px] text-center border border-amber-200 cursor-pointer"
                      >
                        .csv
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadDropdownOpen(prev => ({ ...prev, [mId]: false }));
                          downloadContextTemplate(serviceId, mId, 'Fauna', 'json');
                        }}
                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded font-semibold text-[11px] text-center border border-purple-200 cursor-pointer"
                      >
                        .json
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => {
                    setDownloadDropdownOpen(prev => ({ ...prev, [mId]: !prev[mId] }));
                    setImportDropdownOpen(prev => ({ ...prev, [mId]: false }));
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title={`Download template resmi (${schema.templateFileName})`}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Template</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {isDownloadOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in-50 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadDropdownOpen(prev => ({ ...prev, [mId]: false }));
                        handleDownloadTemplate(mId, 'xlsx');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Excel Spreadsheet (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadDropdownOpen(prev => ({ ...prev, [mId]: false }));
                        handleDownloadTemplate(mId, 'csv');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                      CSV / Delimited (.csv)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadDropdownOpen(prev => ({ ...prev, [mId]: false }));
                        handleDownloadTemplate(mId, 'json');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-800 flex items-center gap-2 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-purple-600" />
                      JSON Dataset (.json)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* View Survey Questionnaire & Econometric Details for Cultural Methods (TCM & CVM) */}
            {(mId === 'tcm' || mId === 'cvm') && (
              <button
                type="button"
                onClick={() => {
                  setSurveyModalMethod(mId as 'tcm' | 'cvm');
                  setIsSurveyModalOpen(true);
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-indigo-700 border border-indigo-200 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Lihat data 12 responden kuesioner survei lapangan dan estimasi ekonometrika"
              >
                <FileQuestion className="w-3.5 h-3.5 text-indigo-600" />
                <span>Data Kuesioner ({mId.toUpperCase()})</span>
              </button>
            )}
          </div>
        </div>

        {/* Method Subtitle & Formula Description */}
        <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-200/70 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span>Formula: </span>
            {serviceId === 'provisioning' && mId === 'market-price' ? (
              <span className="text-slate-700 font-medium">
                <span className="text-emerald-700 font-semibold">[Flora]</span> Vol (m³) × Harga (Rp/m³)&nbsp;&nbsp;|&nbsp;&nbsp;
                <span className="text-amber-700 font-semibold">[Fauna/Perikanan Pesisir]</span> Kuantitas (kg / ekor) × Harga (Rp/kg / Rp/ekor) <span className="text-slate-400 font-normal">atau</span> Prod × Luas (Ha) × Harga
              </span>
            ) : (
              <strong className="text-slate-700 font-medium">{schema.formulaDescription}</strong>
            )}
          </div>
          <div className="text-[11px] text-slate-500 shrink-0">
            Keterangan: <span className="font-semibold text-slate-700">{schema.subtitle}</span>
          </div>
        </div>

        {/* Table Container */}
        <div className="p-4">
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-left border-collapse text-xs select-text">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] select-none">
                  <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200">No</th>

                  {systemColumns.map((col: ColumnDefinition) => {
                    if (col.key === 'totalNilai' || col.type === 'readonly_calculated') {
                      return (
                        <th
                          key={col.key}
                          className="py-2.5 px-3 min-w-[180px] text-right border-r border-slate-200 bg-slate-200/50 text-slate-900 font-bold select-none"
                        >
                          <span className="flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3 text-slate-500" />
                            Total Nilai Ekonomi (Rp)
                          </span>
                        </th>
                      );
                    }

                    if (serviceId === 'provisioning' && col.key === 'produktivitas') {
                      return (
                        <th
                          key={col.key}
                          className={`py-2 px-3 border-r border-slate-200 ${col.width || ''} text-right`}
                        >
                          <div className="flex flex-col items-end leading-tight">
                            <span>Produktivitas</span>
                            <span className="text-[10px] text-slate-500 font-normal leading-tight">
                              m³/ha (Flora) · kg/ha/th / ekor/ha/th (Fauna)
                            </span>
                          </div>
                        </th>
                      );
                    }

                    if (serviceId === 'provisioning' && col.key === 'hargaUnit') {
                      return (
                        <th
                          key={col.key}
                          className={`py-2 px-3 border-r border-slate-200 ${col.width || ''} text-right`}
                        >
                          <div className="flex flex-col items-end leading-tight">
                            <span>Harga Pasar / Unit</span>
                            <span className="text-[10px] text-slate-500 font-normal leading-tight">
                              Rp/m³ (Flora) · Rp/kg / Rp/ekor (Fauna)
                            </span>
                          </div>
                        </th>
                      );
                    }

                    if (serviceId === 'provisioning' && col.key === 'jumlah') {
                      return (
                        <th
                          key={col.key}
                          className={`py-2 px-3 border-r border-slate-200 ${col.width || ''} text-right`}
                        >
                          <div className="flex flex-col items-end leading-tight">
                            <span>Volume / Kuantitas</span>
                            <span className="text-[10px] text-slate-500 font-normal leading-tight">
                              m³ (Flora) · kg / ekor (Fauna)
                            </span>
                          </div>
                        </th>
                      );
                    }

                    return (
                      <th
                        key={col.key}
                        className={`py-2.5 px-3 border-r border-slate-200 ${col.width || ''} text-${col.align || 'left'}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>
                            {serviceId === 'provisioning' && col.key === 'item'
                              ? 'Jenis Biota (Flora / Fauna)'
                              : `${col.label} ${col.unit ? `(${col.unit})` : ''}`}
                          </span>
                        </div>
                      </th>
                    );
                  })}

                  {combinedCustomCols.map((col: CustomColumnDefinition) => (
                    <th
                      key={col.key}
                      className="py-2 px-3 border-r border-slate-200 min-w-[170px] bg-slate-100/90 text-left select-none group"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate font-semibold text-slate-800" title={col.label}>
                            {col.label}
                          </span>
                          {col.required && (
                            <span className="text-rose-500 font-bold" title="Wajib diisi">*</span>
                          )}
                          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded shrink-0">
                            Custom
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveModalMethodId(mId);
                              setEditingColumn(col);
                              setIsColumnModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
                            title="Edit nama atau tipe data kolom"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveModalMethodId(mId);
                              setDeletingColumn(col);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus kolom ini"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}

                  <th className="py-2.5 px-3 w-14 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {serviceId === 'provisioning' ? (
                  <>
                    {/* FLORA SECTION */}
                    <tr className="bg-emerald-50/80 border-b border-emerald-200 select-none">
                      <td colSpan={totalColSpan} className="py-2.5 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200"></span>
                            <span className="font-bold text-xs uppercase tracking-wider text-emerald-950">
                              A.1 Flora ({cleanMethodName})
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                              {floraRows.length} item
                            </span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-100/60 border border-emerald-200/80 px-2 py-0.5 rounded hidden sm:inline-block">
                              Satuan Vegetasi: m³/ha • Volume (m³) • Harga (Rp/m³)
                            </span>
                          </div>
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleAddRow(mId, 'flora')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            >
                              <span>+ Tambah Flora</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {floraRows.length === 0 ? (
                      <tr>
                        <td colSpan={totalColSpan} className="py-6 text-center text-slate-400 italic bg-white">
                          Belum ada data Flora untuk {cleanMethodName}.{' '}
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleAddRow(mId, 'flora')}
                              className="text-emerald-700 font-semibold underline hover:text-emerald-800 ml-1 cursor-pointer"
                            >
                              Tambah baris Flora
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      floraRows.map((row, idx) => renderRow(row, idx, mId, systemColumns, combinedCustomCols, 'flora'))
                    )}

                    {/* FAUNA SECTION */}
                    <tr className="bg-amber-50/80 border-b border-amber-200 select-none">
                      <td colSpan={totalColSpan} className="py-2.5 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 ring-2 ring-amber-200"></span>
                            <span className="font-bold text-xs uppercase tracking-wider text-amber-950">
                              A.2 Fauna ({cleanMethodName})
                            </span>
                            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-full shadow-2xs">
                              {faunaRows.length} item
                            </span>
                            <span className="text-[10px] text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded font-medium hidden sm:inline-block">
                              Satuan Komoditas Pesisir: kg & Rp/kg (perikanan/berat) • ekor & Rp/ekor (satwa/individu)
                            </span>
                          </div>
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleAddRow(mId, 'fauna')}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            >
                              <span>+ Tambah Fauna</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {faunaRows.length === 0 ? (
                      <tr>
                        <td colSpan={totalColSpan} className="py-6 text-center text-slate-400 italic bg-white">
                          Belum ada data Fauna untuk {cleanMethodName}.{' '}
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleAddRow(mId, 'fauna')}
                              className="text-amber-700 font-semibold underline hover:text-amber-800 ml-1 cursor-pointer"
                            >
                              Tambah baris Fauna
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      faunaRows.map((row, idx) => renderRow(row, idx, mId, systemColumns, combinedCustomCols, 'fauna'))
                    )}
                  </>
                ) : (
                  rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={totalColSpan}
                        className="py-8 text-center text-slate-400 italic"
                      >
                        Belum ada baris data untuk <strong>{cleanMethodName}</strong>. Klik <strong>"Tambah Baris"</strong> untuk memulai pengisian data.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, rIdx) => renderRow(row, rIdx, mId, systemColumns, combinedCustomCols))
                  )
                )}
              </tbody>

              {/* Table Footer: Method Subtotal */}
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 select-none">
                  <td
                    colSpan={leadingColSpan}
                    className="py-3 px-4 text-right uppercase text-xs tracking-wider text-slate-800 font-bold"
                  >
                    TOTAL NILAI EKONOMI ({cleanMethodName.toUpperCase()}) :
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-bold text-blue-800 bg-blue-50 border-x border-blue-200">
                    <div>{formatIDR(methodTotal)}</div>
                    {pendingQuantityRows.length > 0 && (
                      <div className="text-[10px] text-amber-700 font-sans font-medium mt-0.5 flex items-center justify-end gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>*Total sementara ({pendingQuantityRows.length} komoditas belum dapat dihitung)</span>
                      </div>
                    )}
                  </td>
                  <td
                    colSpan={remainingColSpan}
                    className="py-3 px-3 text-xs text-slate-500 font-normal"
                  >
                    {serviceId === 'provisioning' ? (
                      <div className="flex flex-col gap-0.5">
                        <span>
                          {calculableRows.length} dari {allMethodRows.length} komoditas terhitung ({floraRows.length} Flora, {faunaRows.length} Fauna)
                        </span>
                        {pendingQuantityRows.length > 0 && (
                          <span className="text-amber-700 font-medium text-[11px]">
                            ⚠ {pendingQuantityRows.length} komoditas berstatus "Belum dapat dihitung" (menunggu volume/produktivitas)
                          </span>
                        )}
                      </div>
                    ) : (
                      `${rows.length} item terhitung`
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all border-l-4 ${accent.borderLeft}`}>
      {/* Category Accordion Header */}
      <div
        onClick={onToggleOpen}
        className="p-4 bg-slate-50/90 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between gap-3 select-none transition-colors border-b border-slate-200"
      >
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm ${accent.badgeBg} ${accent.badgeText} shadow-xs flex-shrink-0`}>
            {prefixLetter}
          </span>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                {prefixLetter}. {serviceName}
              </h3>

              {/* Badges showing active methods */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {methodsToRender.map((mId) => {
                  const mSchema = getMethodSchema(serviceId, mId);
                  const mName = mSchema?.methodName?.split('(')[0]?.trim() || mId;
                  return (
                    <span
                      key={mId}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${accent.pillBg} ${accent.pillText} border border-slate-200/80 shadow-2xs`}
                    >
                      {mName}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Area: <strong className="text-slate-700">{areaName}</strong> • {methodsToRender.length} Metode Valuasi Aktif (Layout Vertikal Card)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md">
              {categoryItemCount} item ({methodsToRender.length} Metode)
            </span>
          </div>

          <button
            type="button"
            className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Category Accordion Body */}
      {isOpen && (
        <div className="p-4 space-y-6 bg-slate-50/40 animate-in slide-in-from-top-1 duration-150">
          {/* Vertical Stack of Method Cards */}
          {methodsToRender.map((mId, mIndex) => renderMethodCard(mId, mIndex))}
        </div>
      )}

      {/* Modal Custom Column */}
      <CustomColumnModal
        isOpen={isColumnModalOpen}
        onClose={() => {
          setIsColumnModalOpen(false);
          setEditingColumn(null);
        }}
        onSave={handleSaveCustomColumn}
        editingColumn={editingColumn}
        existingColumnLabels={[
          'No',
          ...getMethodSchema(serviceId, activeModalMethodId || methodsToRender[0], serviceId === 'provisioning' ? biota : undefined).columns.map(c => c.label)
        ]}
      />

      {/* Modal Confirm Delete Column */}
      <DeleteColumnConfirmModal
        isOpen={!!deletingColumn}
        onClose={() => setDeletingColumn(null)}
        onConfirm={handleConfirmDeleteColumn}
        column={deletingColumn}
      />

      {/* Modal Survey Questionnaire / Respondent (TCM & CVM) */}
      <SurveyRespondentModal
        isOpen={isSurveyModalOpen}
        onClose={() => setIsSurveyModalOpen(false)}
        projectId={currentProjId}
        initialMethod={surveyModalMethod}
        areaId={areaId}
      />
    </div>
  );
};

export default DynamicServiceSection;
