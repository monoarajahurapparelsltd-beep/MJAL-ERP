import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Scissors, 
  Flame, 
  ShieldCheck, 
  Tag, 
  Box, 
  Archive, 
  PackageCheck, 
  Sparkles, 
  Search, 
  X,
  RotateCcw,
  Check
} from 'lucide-react';
import { ModalPortal } from '../../common/ModalPortal';
import { supabaseDataService } from '../../../services/supabaseDataService';
import { ProductionOrder, FinishingRecord } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

export type QCProcessType = 
  | 'Thread Cutting'
  | 'Iron'
  | 'Get Up (QC)'
  | 'Hang Tag'
  | 'Poly'
  | 'Carton'
  | 'Ready for Shipment';

export interface QCInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    buyer?: string;
    styleNo?: string;
    poNo?: string;
    colour?: string;
    process?: QCProcessType;
  } | null;
  onSuccess?: () => void;
}

interface SizeRowState {
  size: string;
  orderQty: number;
  finRecv: number;
  prevDone: number;
  maxAvailable: number;
}

/**
 * QCInspectionModal: High-Density Garments Quality & Finishing Entry Modal
 * 
 * Features:
 * 1. Portaled execution to prevent CSS clipping and viewport cutoff.
 * 2. Non-blocking cascading state logic: Buyer -> Style -> PO -> Colour.
 * 3. Master Order fast-typeahead with cached index.
 * 4. Size-Wise production breakdown with instant 'Fill All Available' & validation.
 */
export const QCInspectionModal: React.FC<QCInspectionModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const { currentUser } = useAuth();

  // 1. Data Store Cache
  const [orders, setOrders] = useState<ProductionOrder[]>(() => supabaseDataService.getOrders());

  useEffect(() => {
    const update = () => setOrders(supabaseDataService.getOrders());
    update();
    const unsub = supabaseDataService.subscribe(update);
    return unsub;
  }, []);

  // 2. Cascade Selection State
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedPo, setSelectedPo] = useState('');
  const [selectedColour, setSelectedColour] = useState('');
  const [selectedProcess, setSelectedProcess] = useState<QCProcessType>('Get Up (QC)');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [inspectorName, setInspectorName] = useState(() => currentUser?.name || 'QC Inspector');
  const [remarks, setRemarks] = useState('');

  // 3. Search & Typeahead State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 4. Matrix Input State (Size -> Quantity)
  const [sizeInputs, setSizeInputs] = useState<Record<string, number | ''>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized Universal Combinations for Instant Typeahead
  const allCombinations = useMemo(() => {
    return supabaseDataService.getAllOrderCombinations();
  }, [orders]);

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return [];
    const query = searchQuery.toLowerCase().trim();
    return allCombinations.filter(c => c.searchText.includes(query)).slice(0, 8);
  }, [allCombinations, searchQuery]);

  // Derived Cascades (Non-blocking & Zero loop triggers)
  const buyersList = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.buyer) set.add(o.buyer);
    });
    return Array.from(set).sort();
  }, [orders]);

  const stylesList = useMemo(() => {
    if (!selectedBuyer) return orders.map(o => o.styleNo);
    return orders.filter(o => o.buyer === selectedBuyer).map(o => o.styleNo);
  }, [orders, selectedBuyer]);

  const purchaseOrdersList = useMemo(() => {
    if (!selectedStyle) return [];
    return supabaseDataService.getPurchaseOrders(selectedStyle);
  }, [selectedStyle]);

  const coloursList = useMemo(() => {
    if (!selectedStyle || !selectedPo) return [];
    return supabaseDataService.getColours(selectedStyle, selectedPo);
  }, [selectedStyle, selectedPo]);

  // Handle Initial State & Reset
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);

    if (initialData?.styleNo) {
      setSelectedStyle(initialData.styleNo);
      const match = orders.find(o => o.styleNo === initialData.styleNo);
      if (match?.buyer) setSelectedBuyer(match.buyer);

      const pos = supabaseDataService.getPurchaseOrders(initialData.styleNo);
      const targetPo = initialData.poNo || (pos.length > 0 ? pos[0].poNo : '');
      setSelectedPo(targetPo);

      if (initialData.colour) {
        setSelectedColour(initialData.colour);
      } else if (targetPo) {
        const cols = supabaseDataService.getColours(initialData.styleNo, targetPo);
        if (cols.length > 0) setSelectedColour(cols[0].colour);
      }

      if (initialData.process) {
        setSelectedProcess(initialData.process);
      }
    } else if (!selectedStyle && orders.length > 0) {
      const first = orders[0];
      setSelectedBuyer(first.buyer || '');
      setSelectedStyle(first.styleNo);
      if (first.purchaseOrders && first.purchaseOrders.length > 0) {
        const firstPo = first.purchaseOrders[0];
        setSelectedPo(firstPo.poNo);
        if (firstPo.colours && firstPo.colours.length > 0) {
          setSelectedColour(firstPo.colours[0].colour);
        }
      }
    }
  }, [isOpen, initialData]);

  // Master Details for Size Matrix
  const orderDetails = useMemo(() => {
    if (!selectedStyle || !selectedPo || !selectedColour) return null;
    return supabaseDataService.getMasterOrderDetails(selectedStyle, selectedPo, selectedColour);
  }, [selectedStyle, selectedPo, selectedColour]);

  // Existing Records for the style/po/colour
  const existingRecords = useMemo(() => {
    if (!selectedStyle || !selectedPo || !selectedColour) return [];
    return supabaseDataService.getFinishingRecords().filter(
      f => f.styleNo?.trim().toUpperCase() === selectedStyle.trim().toUpperCase() &&
           (!f.poNo || !selectedPo || f.poNo.trim().toUpperCase() === selectedPo.trim().toUpperCase()) &&
           (!f.colour || !selectedColour || f.colour.trim().toUpperCase() === selectedColour.trim().toUpperCase())
    );
  }, [selectedStyle, selectedPo, selectedColour]);

  // Calculate live breakdown per size
  const sizeBreakdown: SizeRowState[] = useMemo(() => {
    if (!orderDetails) return [];

    const sizes = (orderDetails.sizeBreakdown || []).filter(s => (s.orderQty || 0) > 0);
    const totalRecvOverall = sizes.reduce((sum, s) => sum + (s.finishingReceivedQty || 0), 0);

    return sizes.map(szItem => {
      const szName = szItem.size;
      const orderQty = szItem.orderQty || 0;
      const finRecv = totalRecvOverall > 0 ? (szItem.finishingReceivedQty || 0) : orderQty;

      const sizeRecords = existingRecords.filter(
        f => f.size?.trim().toUpperCase() === szName.trim().toUpperCase() || (f.size === 'All Sizes' && sizes.length === 1)
      );

      const threadCutQty = sizeRecords.reduce((max, r) => Math.max(max, (r.threadCutQty ?? r.sewingReceiveQty ?? 0)), 0);
      const ironedQty = sizeRecords.reduce((max, r) => Math.max(max, (r.ironedQty || 0)), 0);
      const getUpQty = sizeRecords.reduce((max, r) => Math.max(max, (r.getUpQty || 0)), 0);
      const taggedQty = sizeRecords.reduce((max, r) => Math.max(max, (r.taggedQty || r.finishedQty || 0)), 0);
      const packedQty = sizeRecords.reduce((max, r) => Math.max(max, (r.packedQty || r.polyQty || r.finishedQty || 0)), 0);
      const cartonQty = sizeRecords.reduce((max, r) => Math.max(max, (r.cartonQty || 0)), 0);
      const readyShipQty = sizeRecords.reduce((max, r) => Math.max(max, (r.readyForShipmentQty || 0)), 0);

      let alreadyDone = 0;
      if (selectedProcess === 'Thread Cutting') alreadyDone = threadCutQty;
      else if (selectedProcess === 'Iron') alreadyDone = ironedQty;
      else if (selectedProcess === 'Get Up (QC)') alreadyDone = getUpQty;
      else if (selectedProcess === 'Hang Tag') alreadyDone = taggedQty;
      else if (selectedProcess === 'Poly') alreadyDone = packedQty;
      else if (selectedProcess === 'Carton') alreadyDone = cartonQty;
      else if (selectedProcess === 'Ready for Shipment') alreadyDone = readyShipQty;

      const availableCap = finRecv > 0 ? finRecv : orderQty;
      const maxAvailable = Math.max(0, availableCap - alreadyDone);

      return {
        size: szName,
        orderQty,
        finRecv,
        prevDone: alreadyDone,
        maxAvailable
      };
    });
  }, [orderDetails, existingRecords, selectedProcess]);

  // Reset inputs when selection changes
  useEffect(() => {
    if (!isOpen) return;
    const initialInputs: Record<string, number | ''> = {};
    if (orderDetails?.sizeBreakdown) {
      orderDetails.sizeBreakdown.forEach(item => {
        initialInputs[item.size] = '';
      });
    }
    setSizeInputs(initialInputs);
  }, [selectedStyle, selectedPo, selectedColour, selectedProcess, isOpen]);

  // Quick Action Handlers
  const handleFillAllAvailable = useCallback(() => {
    const updated: Record<string, number | ''> = {};
    sizeBreakdown.forEach(item => {
      updated[item.size] = item.maxAvailable > 0 ? item.maxAvailable : '';
    });
    setSizeInputs(updated);
  }, [sizeBreakdown]);

  const handleClearAll = useCallback(() => {
    const updated: Record<string, number | ''> = {};
    sizeBreakdown.forEach(item => {
      updated[item.size] = '';
    });
    setSizeInputs(updated);
  }, [sizeBreakdown]);

  const handleSizeInputChange = (sizeName: string, val: string) => {
    if (val === '') {
      setSizeInputs(prev => ({ ...prev, [sizeName]: '' }));
      return;
    }
    const item = sizeBreakdown.find(s => s.size === sizeName);
    let num = Math.max(0, parseInt(val, 10) || 0);
    if (item && num > item.maxAvailable) {
      num = item.maxAvailable;
    }
    setSizeInputs(prev => ({ ...prev, [sizeName]: num }));
  };

  // Selection Handler for Typeahead Search
  const handleSelectSearchResult = (res: any) => {
    setSelectedBuyer(res.buyer || '');
    setSelectedStyle(res.styleNo);
    setSelectedPo(res.poNo);
    setSelectedColour(res.colour);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedStyle || !selectedPo || !selectedColour) {
      setErrorMessage('Please select Style, PO Number, and Colour.');
      return;
    }

    const totalEntered = Object.values(sizeInputs).reduce<number>((sum, val) => sum + (Number(val) || 0), 0);

    if (totalEntered <= 0) {
      setErrorMessage('Please enter a quantity greater than 0 for at least one size.');
      return;
    }

    // Size-by-size validation
    for (const item of sizeBreakdown) {
      const entered = Number(sizeInputs[item.size] || 0);
      if (entered > item.maxAvailable) {
        setErrorMessage(
          `Quantity entered for size "${item.size}" (${entered.toLocaleString()} pcs) exceeds available balance (${item.maxAvailable.toLocaleString()} pcs).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const recordsToSave: FinishingRecord[] = [];

      for (const item of sizeBreakdown) {
        const entered = Number(sizeInputs[item.size] || 0);
        if (entered <= 0) continue;

        const existing = existingRecords.find(
          r => r.size?.trim().toUpperCase() === item.size.trim().toUpperCase() && r.date === entryDate
        ) || existingRecords.find(
          r => r.size?.trim().toUpperCase() === item.size.trim().toUpperCase()
        );

        let threadCut = existing ? (existing.threadCutQty ?? 0) : 0;
        let iron = existing ? (existing.ironedQty || 0) : 0;
        let getUp = existing ? (existing.getUpQty || 0) : 0;
        let tagged = existing ? (existing.taggedQty || 0) : 0;
        let poly = existing ? (existing.packedQty || existing.polyQty || 0) : 0;
        let carton = existing ? (existing.cartonQty || 0) : 0;
        let readyShip = existing ? (existing.readyForShipmentQty || 0) : 0;

        if (selectedProcess === 'Thread Cutting') threadCut = Math.min(item.finRecv, threadCut + entered);
        else if (selectedProcess === 'Iron') iron = Math.min(item.finRecv, iron + entered);
        else if (selectedProcess === 'Get Up (QC)') getUp = Math.min(item.finRecv, getUp + entered);
        else if (selectedProcess === 'Hang Tag') tagged = Math.min(item.finRecv, tagged + entered);
        else if (selectedProcess === 'Poly') poly = Math.min(item.finRecv, poly + entered);
        else if (selectedProcess === 'Carton') carton = Math.min(item.finRecv, carton + entered);
        else if (selectedProcess === 'Ready for Shipment') readyShip = Math.min(item.finRecv, readyShip + entered);

        const finRec: FinishingRecord = {
          id: existing ? existing.id : `qc-${selectedStyle}-${selectedPo}-${selectedColour}-${item.size}-${Date.now()}`,
          date: entryDate,
          buyer: selectedBuyer,
          styleNo: selectedStyle,
          poNo: selectedPo,
          colour: selectedColour,
          size: item.size,
          sewingReceiveQty: item.finRecv,
          finishingInputQty: item.finRecv,
          threadCutQty: threadCut,
          ironedQty: iron,
          getUpQty: getUp,
          foldedQty: poly,
          taggedQty: tagged,
          packedQty: poly,
          polyQty: poly,
          cartonQty: carton,
          finishedQty: poly,
          reworkQty: 0,
          rejectQty: 0,
          operator: inspectorName || currentUser?.name || 'QC Inspector',
          hangTagStatus: tagged >= item.finRecv && item.finRecv > 0 ? 'Completed' : 'In Progress',
          transferredToPackingQty: poly,
          isReadyForShipment: readyShip > 0,
          readyForShipmentQty: readyShip,
          remarks: remarks || undefined
        };

        recordsToSave.push(finRec);
      }

      await supabaseDataService.saveFinishingRecordsBatch(recordsToSave, currentUser?.name);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Save QC/Finishing Entry Error:', err);
      setErrorMessage(err?.message || 'Failed to save QC inspection record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSummary = useMemo(() => {
    const orderQty = sizeBreakdown.reduce((sum, s) => sum + s.orderQty, 0);
    const finRecv = sizeBreakdown.reduce((sum, s) => sum + s.finRecv, 0);
    const prevDone = sizeBreakdown.reduce((sum, s) => sum + s.prevDone, 0);
    const available = sizeBreakdown.reduce((sum, s) => sum + s.maxAvailable, 0);
    const entered = Object.values(sizeInputs).reduce<number>((sum, val) => sum + (Number(val) || 0), 0);
    return { orderQty, finRecv, prevDone, available, entered };
  }, [sizeBreakdown, sizeInputs]);

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      headerGradient={true}
      headerIcon={<Sparkles className="w-5 h-5 text-amber-300" />}
      title="Finishing & QC Production Entry"
      subtitle="Log quality inspection & production quantities broken down by size."
      headerBadge={
        <span className="px-2 py-0.5 bg-blue-500/30 text-blue-100 border border-blue-400/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
          Process & Size-Wise
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl flex items-center gap-2 font-bold animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Order Selection Hierarchy & Universal Search */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          {/* Universal Search Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Select Item via Search (Buyer / Style / PO / Colour / Size)
              </label>
              {selectedStyle && selectedPo && selectedColour && (
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-700 px-2 py-0.5 rounded-md">
                  Active Selection Loaded
                </span>
              )}
            </div>

            <div className="relative">
              <div className="w-full flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                {selectedBuyer && (
                  <span className="text-xs font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 px-2 py-0.5 rounded-md shrink-0">
                    {selectedBuyer}
                  </span>
                )}
                {selectedStyle ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1 overflow-hidden truncate">
                    <span>Style: <strong className="text-slate-950 dark:text-white font-black">{selectedStyle}</strong></span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span>PO: <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedPo || 'Select PO'}</strong></span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedColour || 'Select Colour'}</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    placeholder="Search by Buyer, Style No, PO Number, or Colour..."
                    className="w-full text-xs bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                  />
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  <Search className="w-4 h-4 text-slate-400" />
                  {selectedStyle && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStyle('');
                        setSelectedPo('');
                        setSelectedColour('');
                        setSelectedBuyer('');
                        setSizeInputs({});
                        setSearchQuery('');
                      }}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                      title="Clear Selection to Search Again"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Typeahead Suggestions */}
              {isSearchOpen && searchResults.length > 0 && (
                <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                  {searchResults.map(res => (
                    <div
                      key={res.key}
                      onClick={() => handleSelectSearchResult(res)}
                      className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer transition flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100">{res.styleNo}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-medium">{res.buyer}</span>
                          <span className="text-[10px] text-slate-400">PO: <strong className="text-slate-700 dark:text-slate-300">{res.poNo}</strong></span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{res.colour}</span>
                          <span>•</span>
                          <span>Order: <strong>{res.orderQty?.toLocaleString()} pcs</strong></span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-md">
                        Select
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              Or Select from Dropdowns
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Buyer: <strong className="text-slate-800 dark:text-slate-200">{selectedBuyer || 'N/A'}</strong>
            </span>
          </div>

          {/* 4 Cascading Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Buyer
              </label>
              <select
                value={selectedBuyer}
                onChange={e => {
                  const b = e.target.value;
                  setSelectedBuyer(b);
                  const matchingStyles = orders.filter(o => !b || o.buyer === b);
                  if (matchingStyles.length > 0) {
                    const firstStyle = matchingStyles[0].styleNo;
                    setSelectedStyle(firstStyle);
                    const pos = supabaseDataService.getPurchaseOrders(firstStyle);
                    if (pos.length > 0) {
                      setSelectedPo(pos[0].poNo);
                      const cols = supabaseDataService.getColours(firstStyle, pos[0].poNo);
                      if (cols.length > 0) setSelectedColour(cols[0].colour);
                    }
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 text-xs"
              >
                <option value="">All Buyers</option>
                {buyersList.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Style No <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedStyle}
                onChange={e => {
                  const s = e.target.value;
                  setSelectedStyle(s);
                  const order = orders.find(o => o.styleNo === s);
                  if (order?.buyer) setSelectedBuyer(order.buyer);
                  const pos = supabaseDataService.getPurchaseOrders(s);
                  if (pos.length > 0) {
                    setSelectedPo(pos[0].poNo);
                    const cols = supabaseDataService.getColours(s, pos[0].poNo);
                    if (cols.length > 0) setSelectedColour(cols[0].colour);
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 text-xs"
              >
                {stylesList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                PO Number <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPo}
                onChange={e => {
                  const p = e.target.value;
                  setSelectedPo(p);
                  const cols = supabaseDataService.getColours(selectedStyle, p);
                  if (cols.length > 0) setSelectedColour(cols[0].colour);
                }}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 text-xs"
              >
                {purchaseOrdersList.map(p => (
                  <option key={p.poNo} value={p.poNo}>{p.poNo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Colour <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedColour}
                onChange={e => setSelectedColour(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 text-xs"
              >
                {coloursList.map(c => (
                  <option key={c.colour} value={c.colour}>{c.colour} ({c.totalQty.toLocaleString()} pcs)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Process Badges */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Target Finishing / QC Process:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
              {[
                { key: 'Thread Cutting', label: '1. Thread Cut', icon: Scissors },
                { key: 'Iron', label: '2. Iron Press', icon: Flame },
                { key: 'Get Up (QC)', label: '3. Get Up (QC)', icon: ShieldCheck },
                { key: 'Hang Tag', label: '4. Hangtag', icon: Tag },
                { key: 'Poly', label: '5. Poly Pack', icon: Box },
                { key: 'Carton', label: '6. Carton Pack', icon: Archive },
                { key: 'Ready for Shipment', label: 'Ready for Ship', icon: PackageCheck }
              ].map(proc => {
                const Icon = proc.icon;
                const isSelected = selectedProcess === proc.key;
                return (
                  <button
                    key={proc.key}
                    type="button"
                    onClick={() => setSelectedProcess(proc.key as QCProcessType)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-black'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    <span className="text-[10px] leading-tight">{proc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: Size-Wise Breakdown Matrix */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Size-Wise Production Breakdown</span>
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 rounded font-black text-[10px]">
                  {selectedProcess}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Input today's output count per size. System verifies against available finishing stock.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFillAllAvailable}
                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Fill All Available Balance
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[11px] font-medium hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800/90 text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2.5">Size</th>
                  <th className="p-2.5 text-right">Order Target</th>
                  <th className="p-2.5 text-right text-blue-700 dark:text-blue-300">Finishing Recv</th>
                  <th className="p-2.5 text-right text-purple-700 dark:text-purple-300">Prev Done</th>
                  <th className="p-2.5 text-right text-emerald-700 dark:text-emerald-300">Available Bal</th>
                  <th className="p-2.5 text-right w-40 bg-blue-50/50 dark:bg-blue-950/30">
                    Entry Quantity (Pcs) *
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {sizeBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                      No size breakdown found for selected Style, PO & Colour.
                    </td>
                  </tr>
                ) : (
                  sizeBreakdown.map(item => {
                    const isComplete = item.maxAvailable <= 0;
                    return (
                      <tr
                        key={item.size}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isComplete ? 'bg-slate-50/40 dark:bg-slate-800/20 opacity-70' : ''
                        }`}
                      >
                        <td className="p-2.5 font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-black text-xs">
                            {item.size}
                          </span>
                          {isComplete && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              ✓ Complete
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-medium text-slate-400 line-through">
                          {item.orderQty.toLocaleString()} pcs
                        </td>
                        <td className="p-2.5 text-right font-black text-blue-700 dark:text-blue-400">
                          {item.finRecv.toLocaleString()} pcs
                        </td>
                        <td className="p-2.5 text-right font-semibold text-purple-600 dark:text-purple-400">
                          {item.prevDone.toLocaleString()} pcs
                        </td>
                        <td className="p-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {item.maxAvailable.toLocaleString()} pcs
                        </td>
                        <td className="p-2.5 text-right bg-blue-50/30 dark:bg-blue-950/20">
                          <input
                            type="number"
                            min="0"
                            max={item.maxAvailable > 0 ? item.maxAvailable : 0}
                            value={sizeInputs[item.size] ?? ''}
                            onChange={e => handleSizeInputChange(item.size, e.target.value)}
                            placeholder={isComplete ? '0 (Max)' : '0'}
                            disabled={isComplete}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-right font-extrabold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:dark:bg-slate-800/40 disabled:cursor-not-allowed disabled:text-slate-400"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {sizeBreakdown.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-black text-xs">
                  <tr>
                    <td className="p-2.5">Total Summary</td>
                    <td className="p-2.5 text-right">{totalSummary.orderQty.toLocaleString()} pcs</td>
                    <td className="p-2.5 text-right text-blue-300">{totalSummary.finRecv.toLocaleString()} pcs</td>
                    <td className="p-2.5 text-right text-purple-300">{totalSummary.prevDone.toLocaleString()} pcs</td>
                    <td className="p-2.5 text-right text-emerald-300">{totalSummary.available.toLocaleString()} pcs</td>
                    <td className="p-2.5 text-right text-amber-300 text-sm font-black bg-slate-950">
                      {totalSummary.entered.toLocaleString()} pcs
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Section 3: Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Entry Date
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Supervisor / Operator Name
            </label>
            <input
              type="text"
              value={inspectorName}
              onChange={e => setInspectorName(e.target.value)}
              placeholder="e.g. QC Lead / Supervisor"
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Remarks / Quality Note
            </label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Optional remarks..."
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>
        </div>

        {/* Section 4: Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSizeInputs({});
                setRemarks('');
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Inputs
            </button>

            <button
              type="submit"
              disabled={isSubmitting || totalSummary.entered <= 0}
              className="px-5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Saving Records...' : `Save Production (${totalSummary.entered.toLocaleString()} pcs)`}
            </button>
          </div>
        </div>
      </form>
    </ModalPortal>
  );
};
