import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Scissors, X, Sparkles, AlertCircle } from 'lucide-react';
import { supabaseDataService } from '../../services/supabaseDataService';
import { ProductionOrder } from '../../types';
import { getDepartmentReceivedSizeMap } from '../../utils/sewingCalculationUtils';
import { useToast } from '../../context/ToastContext';

export interface ProductionSizeEntryRow {
  size: string;
  orderQty: number;
  receivedQty: number;
  alreadyProducedQty: number;
  dueQty: number;
  newQty: number | '';
}

export interface ProductionEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName: 'Cutting' | 'Sewing' | 'Washing' | 'Finishing' | 'QC';
  title?: string;
  icon?: React.ElementType;
  initialStyleNo?: string;
  initialPoNo?: string;
  initialColour?: string;
  // Specific inputs for the module
  customFields?: React.ReactNode;
  onSave: (data: {
    buyer: string;
    styleNo: string;
    poNo: string;
    colour: string;
    sizeWiseQuantities: Record<string, number>;
    totalNewQty: number;
    notes: string;
  }) => Promise<void> | void;
  isLoading?: boolean;
}

export const ProductionEntryModal: React.FC<ProductionEntryModalProps> = ({
  isOpen,
  onClose,
  moduleName,
  title,
  icon: IconComponent = Scissors,
  initialStyleNo = '',
  initialPoNo = '',
  initialColour = '',
  customFields,
  onSave,
  isLoading = false
}) => {
  const [orders, setOrders] = useState<ProductionOrder[]>(supabaseDataService.getOrders());

  // Hierarchy Selection State
  const [selectedStyleNo, setSelectedStyleNo] = useState(initialStyleNo);
  const [selectedPoNo, setSelectedPoNo] = useState(initialPoNo);
  const [selectedColour, setSelectedColour] = useState(initialColour);
  const [selectedBuyer, setSelectedBuyer] = useState('');

  // Size-wise entries mapping: { [size]: number | '' }
  const [sizeInputs, setSizeInputs] = useState<Record<string, number | ''>>({});
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const isCutting = moduleName === 'Cutting';

  useEffect(() => {
    const update = () => setOrders(supabaseDataService.getOrders());
    update();
    const unsub = supabaseDataService.subscribe(update);
    return unsub;
  }, []);

  // When initial props change or modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      if (initialStyleNo) {
        setSelectedStyleNo(initialStyleNo);
        const order = orders.find(o => o.styleNo === initialStyleNo);
        if (order) setSelectedBuyer(order.buyer);
      }
      if (initialPoNo) setSelectedPoNo(initialPoNo);
      if (initialColour) setSelectedColour(initialColour);
      setNotes('');
      setErrorMessage(null);
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, initialStyleNo, initialPoNo, initialColour, orders]);

  // Filter active uncompleted orders for production entry
  const availableOrders = useMemo(() => {
    return orders.filter(o => (o.status !== 'Completed' && o.status !== 'Shipment Complete' && o.status !== 'Cancelled') || o.styleNo === selectedStyleNo);
  }, [orders, selectedStyleNo]);

  // Derived Objects
  const currentStyleObj = useMemo(() => {
    if (!selectedStyleNo) return null;
    return orders.find(o => o.styleNo.trim().toUpperCase() === selectedStyleNo.trim().toUpperCase()) || null;
  }, [orders, selectedStyleNo]);

  const availablePOs = useMemo(() => {
    if (!currentStyleObj) return [];
    return (currentStyleObj.purchaseOrders || []).filter(
      p => (p.status !== 'Completed' && p.status !== 'Shipment Complete' && p.status !== 'Cancelled') || p.poNo === selectedPoNo
    );
  }, [currentStyleObj, selectedPoNo]);

  const currentPoObj = useMemo(() => {
    if (!currentStyleObj || !selectedPoNo) return null;
    return (currentStyleObj.purchaseOrders || []).find(
      p => p.poNo.trim().toUpperCase() === selectedPoNo.trim().toUpperCase()
    ) || null;
  }, [currentStyleObj, selectedPoNo]);

  const availableColours = useMemo(() => {
    if (!currentPoObj) return [];
    const cols = currentPoObj.colours || [];
    if (selectedStyleNo && selectedPoNo) {
      return cols.filter(c => {
        if (c.colour === selectedColour) return true;
        const prog = supabaseDataService.getStylePoColourProgress(selectedStyleNo, selectedPoNo, c.colour);
        return !(prog.orderQty > 0 && prog.shippedQty >= prog.orderQty);
      });
    }
    return cols;
  }, [currentPoObj, selectedStyleNo, selectedPoNo, selectedColour]);

  const currentColourObj = useMemo(() => {
    if (!currentPoObj || !selectedColour) return null;
    return (currentPoObj.colours || []).find(
      c => c.colour.trim().toUpperCase() === selectedColour.trim().toUpperCase()
    ) || null;
  }, [currentPoObj, selectedColour]);

  // Real-time live production progress for this Style+PO+Colour
  const liveProgress = useMemo(() => {
    if (!selectedStyleNo || !selectedPoNo || !selectedColour) return null;
    return supabaseDataService.getStylePoColourProgress(selectedStyleNo, selectedPoNo, selectedColour);
  }, [selectedStyleNo, selectedPoNo, selectedColour, orders]);

  // Automatically initialize default sizes when colour is picked
  const availableSizes = useMemo(() => {
    if (!currentColourObj || !currentColourObj.sizeQuantities) return [];
    return Object.keys(currentColourObj.sizeQuantities).filter(
      k => (currentColourObj.sizeQuantities[k] || 0) > 0
    );
  }, [currentColourObj]);

  // Calculate size-wise received quantities for the active department
  const deptReceivedMap = useMemo(() => {
    if (isCutting || !currentColourObj?.sizeQuantities || !selectedStyleNo) {
      return {};
    }
    const allTransfers = supabaseDataService.getTransfers();
    return getDepartmentReceivedSizeMap(
      moduleName,
      selectedStyleNo,
      selectedPoNo,
      selectedColour,
      currentColourObj.sizeQuantities,
      allTransfers,
      selectedBuyer || currentStyleObj?.buyer
    );
  }, [isCutting, moduleName, selectedStyleNo, selectedPoNo, selectedColour, currentColourObj, orders, selectedBuyer, currentStyleObj]);

  // Size breakdown rows computation
  const sizeRows: ProductionSizeEntryRow[] = useMemo(() => {
    if (!currentColourObj || !currentColourObj.sizeQuantities) return [];
    return availableSizes.map(sz => {
      const orderQty = currentColourObj.sizeQuantities[sz] || 0;
      const receivedQty = deptReceivedMap[sz] || 0;
      let alreadyDone = 0;

      if (liveProgress?.sizeBreakdown) {
        const item = liveProgress.sizeBreakdown.find(
          s => s.size.trim().toUpperCase() === sz.trim().toUpperCase()
        );
        if (item) {
          switch (moduleName) {
            case 'Cutting':
              alreadyDone = item.cutQty || 0;
              break;
            case 'Sewing':
              alreadyDone = item.sewOutput || 0;
              break;
            case 'Washing':
              alreadyDone = item.washOutput || 0;
              break;
            case 'Finishing':
              alreadyDone = item.finishingOutput || 0;
              break;
            case 'QC':
              alreadyDone = item.qcPassed || 0;
              break;
            default:
              alreadyDone = item.cutQty || 0;
          }
        }
      }

      // For cutting, base calculation is Order Qty. For all other depts, base calculation is Receive Qty.
      const baselineQty = isCutting ? orderQty : receivedQty;
      const dueQty = Math.max(0, baselineQty - alreadyDone);
      const newQty = sizeInputs[sz] !== undefined ? sizeInputs[sz] : '';

      return {
        size: sz,
        orderQty,
        receivedQty,
        alreadyProducedQty: alreadyDone,
        dueQty,
        newQty
      };
    });
  }, [currentColourObj, availableSizes, liveProgress, moduleName, sizeInputs, deptReceivedMap, isCutting]);

  // Summary Totals
  const totalOrderQty = sizeRows.reduce((sum, r) => sum + r.orderQty, 0);
  const totalReceivedQty = sizeRows.reduce((sum, r) => sum + r.receivedQty, 0);
  const totalAlreadyProduced = sizeRows.reduce((sum, r) => sum + r.alreadyProducedQty, 0);
  const totalDueQty = Math.max(0, (isCutting ? totalOrderQty : totalReceivedQty) - totalAlreadyProduced);
  const totalNewQty = sizeRows.reduce((sum, r) => sum + (Number(r.newQty) || 0), 0);

  const handleSizeInputChange = (sz: string, val: string) => {
    const num = val === '' ? '' : Number(val);
    setSizeInputs(prev => ({
      ...prev,
      [sz]: num
    }));
  };

  const handleFillDueQuantities = () => {
    const newInputs: Record<string, number> = {};
    sizeRows.forEach(r => {
      newInputs[r.size] = r.dueQty;
    });
    setSizeInputs(newInputs);
  };

  const handleClearInputs = () => {
    setSizeInputs({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!selectedStyleNo || !selectedPoNo || !selectedColour) {
      setErrorMessage('Please select Style / Order, PO Number, and Colour.');
      return;
    }

    if (totalNewQty <= 0) {
      setErrorMessage(`Please enter a valid quantity for at least one size in "NEW ${moduleName.toUpperCase()} QTY".`);
      return;
    }

    const cleanSizeQuantities: Record<string, number> = {};
    sizeRows.forEach(r => {
      const q = Number(sizeInputs[r.size]) || 0;
      if (q > 0) {
        cleanSizeQuantities[r.size] = q;
      }
    });

    try {
      await onSave({
        buyer: selectedBuyer || currentStyleObj?.buyer || 'Unknown Buyer',
        styleNo: selectedStyleNo,
        poNo: selectedPoNo,
        colour: selectedColour,
        sizeWiseQuantities: cleanSizeQuantities,
        totalNewQty,
        notes
      });
      toast.success(`${moduleName} Production entry (${totalNewQty.toLocaleString()} pcs) saved successfully!`);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save production entry.');
    }
  };

  if (!isOpen) return null;

  // Verb naming
  const moduleActionLabels: Record<string, { done: string; due: string; newField: string }> = {
    Cutting: { done: 'ALREADY CUT', due: 'CUTTING DUE', newField: 'NEW CUT QTY' },
    Sewing: { done: 'ALREADY SEWN', due: 'SEWING DUE', newField: 'NEW SEWING QTY' },
    Washing: { done: 'ALREADY WASHED', due: 'WASH DUE', newField: 'NEW WASH QTY' },
    Finishing: { done: 'ALREADY PACKED', due: 'PACKING DUE', newField: 'NEW FINISH QTY' },
    QC: { done: 'ALREADY INSPECTED', due: 'QC DUE', newField: 'NEW QC QTY' },
  };

  const actionLabels = moduleActionLabels[moduleName] || {
    done: 'ALREADY PRODUCED',
    due: 'PRODUCTION DUE',
    newField: `NEW ${moduleName.toUpperCase()} QTY`
  };

  const defaultModalTitle = title || `NEW ${moduleName.toUpperCase()} PRODUCTION LOG ENTRY`;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 pt-3 sm:pt-6 md:pt-8 pb-6 bg-slate-950/80 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-4xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] flex flex-col min-h-0 rounded-2xl bg-white shadow-2xl border border-slate-700/30 overflow-hidden relative z-[10000]"
        onClick={e => e.stopPropagation()}
      >
        {/* Dark Premium Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0b1329] text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/40">
              <IconComponent className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-100 flex items-center gap-2">
              {defaultModalTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 overscroll-contain">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Style, PO & Colour Cascading Selectors */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 p-3 sm:p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">
                Style / Order <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedStyleNo}
                onChange={e => {
                  const s = e.target.value;
                  setSelectedStyleNo(s);
                  const order = orders.find(o => o.styleNo === s);
                  setSelectedBuyer(order?.buyer || '');
                  // Auto-select first PO if available
                  const pos = order?.purchaseOrders || [];
                  if (pos.length === 1) {
                    setSelectedPoNo(pos[0].poNo);
                    const cols = pos[0].colours || [];
                    if (cols.length === 1) {
                      setSelectedColour(cols[0].colour);
                    } else {
                      setSelectedColour('');
                    }
                  } else {
                    setSelectedPoNo('');
                    setSelectedColour('');
                  }
                  setSizeInputs({});
                }}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none cursor-pointer"
              >
                <option value="">-- Select Style / Order --</option>
                {availableOrders.map(o => (
                  <option key={o.id} value={o.styleNo}>
                    {o.buyer ? `${o.buyer} - Style: ${o.styleNo}` : o.styleNo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">
                PO Number <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPoNo}
                onChange={e => {
                  const p = e.target.value;
                  setSelectedPoNo(p);
                  const poObj = availablePOs.find(po => po.poNo === p);
                  const cols = poObj?.colours || [];
                  if (cols.length === 1) {
                    setSelectedColour(cols[0].colour);
                  } else {
                    setSelectedColour('');
                  }
                  setSizeInputs({});
                }}
                disabled={!selectedStyleNo || availablePOs.length === 0}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">-- Select PO --</option>
                {availablePOs.map(po => (
                  <option key={po.id || po.poNo} value={po.poNo}>
                    {po.poNo} ({po.totalQty?.toLocaleString()} pcs)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">
                Colour <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedColour}
                onChange={e => {
                  setSelectedColour(e.target.value);
                  setSizeInputs({});
                }}
                disabled={!selectedPoNo || availableColours.length === 0}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">-- Select Colour --</option>
                {availableColours.map(c => (
                  <option key={c.colour} value={c.colour}>
                    {c.colour} ({c.totalQty?.toLocaleString()} pcs)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Custom Operational Fields (Table No / Plies / Line / Wash Type / etc.) */}
          {customFields && (
            <div className="space-y-2">
              {customFields}
            </div>
          )}

          {/* 4. Exact Size-Wise Matrix Table (Like the Reference Image) */}
          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                {isCutting ? 'Size-Wise Order Qty' : 'Size-Wise Receive Qty'}, {actionLabels.done}, {actionLabels.due} & {actionLabels.newField}
              </label>
              {sizeRows.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFillDueQuantities}
                    className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 px-2 py-0.5 rounded transition cursor-pointer"
                  >
                    Auto Fill Remaining Due
                  </button>
                  <button
                    type="button"
                    onClick={handleClearInputs}
                    className="text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-300/90 overflow-hidden shadow-xs bg-white">
              {/* Dark Table Header */}
              <div className="bg-[#0b1329] text-white px-4 py-2.5 grid grid-cols-12 text-[11px] font-black tracking-wider uppercase items-center text-center">
                <div className="col-span-2 text-left font-black text-slate-200">Size</div>
                <div className="col-span-2 text-right font-black text-slate-200">
                  {isCutting ? 'Order Qty' : 'Receive Qty'}
                </div>
                <div className="col-span-3 text-right font-black text-emerald-400">{actionLabels.done}</div>
                <div className="col-span-2 text-right font-black text-amber-400">{actionLabels.due}</div>
                <div className="col-span-3 text-right font-black text-blue-400">{actionLabels.newField}</div>
              </div>

              {/* Rows */}
              {sizeRows.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 font-medium">
                  {selectedStyleNo && selectedPoNo && selectedColour
                    ? 'No size breakdown defined for this colour in Order Management.'
                    : 'Select Style, PO, and Colour above to load size breakdown.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-200/80">
                  {sizeRows.map(row => (
                    <div
                      key={row.size}
                      className="px-4 py-2.5 grid grid-cols-12 items-center text-xs font-semibold hover:bg-slate-50/80 transition"
                    >
                      <div className="col-span-2 text-left font-black text-slate-900 text-sm">
                        {row.size}
                      </div>
                      <div className="col-span-2 text-right font-bold text-slate-700 font-mono">
                        {(isCutting ? row.orderQty : row.receivedQty).toLocaleString()}
                      </div>
                      <div className="col-span-3 text-right font-bold text-emerald-600 font-mono">
                        {row.alreadyProducedQty.toLocaleString()}
                      </div>
                      <div className="col-span-2 text-right font-bold font-mono">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                          row.dueQty === 0
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 font-bold'
                        }`}>
                          {row.dueQty.toLocaleString()}
                        </span>
                      </div>
                      <div className="col-span-3 flex justify-end">
                        <input
                          type="number"
                          min="0"
                          value={row.newQty}
                          onChange={e => handleSizeInputChange(row.size, e.target.value)}
                          placeholder="0"
                          className="w-24 text-right px-2.5 py-1 text-xs font-black text-blue-700 bg-white border border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500 rounded-lg outline-none shadow-2xs font-mono"
                        />
                      </div>
                    </div>
                  ))}

                  {/* TOTAL Summary Row */}
                  <div className="px-4 py-3 bg-blue-50/60 border-t-2 border-slate-300 grid grid-cols-12 items-center text-xs font-black">
                    <div className="col-span-2 text-left uppercase text-slate-900 tracking-wider font-black">
                      TOTAL
                    </div>
                    <div className="col-span-2 text-right text-slate-900 font-mono font-black">
                      {(isCutting ? totalOrderQty : totalReceivedQty).toLocaleString()}
                    </div>
                    <div className="col-span-3 text-right text-emerald-700 font-mono font-black">
                      {totalAlreadyProduced.toLocaleString()}
                    </div>
                    <div className="col-span-2 text-right text-amber-700 font-mono font-black">
                      {totalDueQty.toLocaleString()}
                    </div>
                    <div className="col-span-3 text-right text-blue-800 font-mono text-sm font-black">
                      {totalNewQty.toLocaleString()} <span className="text-xs font-medium text-slate-500">pcs</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Notes / Remarks */}
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              Notes / Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Enter shade, marker number, batch info, or production notes..."
              className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Modal Footer (Pinned at bottom) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-t border-slate-200 shrink-0">
          <div className="text-xs font-bold text-slate-600">
            Total Input: <span className="text-blue-700 font-black text-sm">{totalNewQty.toLocaleString()} pcs</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || totalNewQty <= 0}
              className="px-6 py-2 text-xs font-black rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isLoading ? (
                <span>Saving Record...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Save {moduleName} Production Entry</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
