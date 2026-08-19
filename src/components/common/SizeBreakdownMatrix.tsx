import React, { useState } from 'react';
import { Ruler, CheckCircle2, Clock, ChevronDown, ChevronUp, Layers, LayoutGrid, Table, Check, Sparkles, ArrowRight } from 'lucide-react';
import { SizeProgressItem } from '../../types';

interface SizeBreakdownMatrixProps {
  sizeBreakdown: SizeProgressItem[];
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  currentModule?: 'Cutting' | 'Sewing' | 'Washing' | 'Finishing' | 'QC' | 'Packing' | 'Shipment' | 'Sample' | 'Store' | 'Merchandising' | 'General';
  title?: string;
  compact?: boolean;
}

export const SizeBreakdownMatrix: React.FC<SizeBreakdownMatrixProps> = ({
  sizeBreakdown,
  selectedSize,
  onSelectSize,
  currentModule = 'General',
  title = 'Size-Wise Production Breakdown & Remaining Balances',
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  if (!sizeBreakdown || sizeBreakdown.length === 0) {
    return null;
  }

  const isCutting = currentModule === 'Cutting';
  
  // Calculate completed & remaining for the given module
  const getModuleStats = (item: SizeProgressItem) => {
    let baseQty = isCutting ? item.orderQty : (item.receivedQty ?? item.orderQty);
    let completed = 0;
    let balance = 0;
    let percentage = 0;

    switch (currentModule) {
      case 'Cutting':
        baseQty = item.orderQty;
        completed = item.cutQty;
        balance = item.cutBalance;
        percentage = item.cutPercentage;
        break;
      case 'Sewing':
        baseQty = item.sewingReceivedQty ?? item.receivedQty ?? item.orderQty;
        completed = item.sewOutput;
        balance = item.sewBalance;
        percentage = item.sewPercentage;
        break;
      case 'Finishing':
        baseQty = item.finishingReceivedQty ?? item.receivedQty ?? item.orderQty;
        completed = item.finQty;
        balance = item.finBalance;
        percentage = item.finPercentage;
        break;
      case 'Packing':
        baseQty = item.packingReceivedQty ?? item.receivedQty ?? item.orderQty;
        completed = item.packedQty;
        balance = item.packBalance;
        percentage = item.packPercentage;
        break;
      case 'Shipment':
        baseQty = item.shipmentReceivedQty ?? item.receivedQty ?? item.orderQty;
        completed = item.shippedQty;
        balance = item.shipBalance;
        percentage = item.shipmentPercentage;
        break;
      case 'QC':
        baseQty = item.receivedQty ?? item.orderQty;
        completed = item.qcPassedQty;
        balance = Math.max(0, baseQty - item.qcPassedQty);
        percentage = baseQty > 0 ? Math.min(100, Math.round((item.qcPassedQty / baseQty) * 100)) : 0;
        break;
      default:
        baseQty = isCutting ? item.orderQty : (item.receivedQty ?? item.orderQty);
        completed = item.shippedQty > 0 ? item.shippedQty : item.packedQty > 0 ? item.packedQty : item.finQty > 0 ? item.finQty : item.sewOutput > 0 ? item.sewOutput : item.cutQty;
        balance = Math.max(0, baseQty - completed);
        percentage = baseQty > 0 ? Math.min(100, Math.round((completed / baseQty) * 100)) : 0;
    }

    return { baseQty, completed, balance, percentage };
  };

  // Totals
  const totalBase = sizeBreakdown.reduce((s, i) => s + (getModuleStats(i).baseQty || 0), 0);
  const totalCompleted = sizeBreakdown.reduce((s, i) => s + getModuleStats(i).completed, 0);
  const totalBalance = Math.max(0, totalBase - totalCompleted);
  const totalPct = totalBase > 0 ? Math.round((totalCompleted / totalBase) * 100) : 0;

  const baseQtyLabel = isCutting ? 'Order Qty' : 'Receive Qty';
  const baseQtyShortLabel = isCutting ? 'Order' : 'Receive';

  const moduleLabel =
    currentModule === 'General' ? 'Completed Work' : `${currentModule} Output`;

  return (
    <div id="size-breakdown-matrix-panel" className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs space-y-3 transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Ruler className="h-4 w-4" />
          </div>
          <div>
            <h5 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              {title}
              <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                {sizeBreakdown.length} {sizeBreakdown.length === 1 ? 'Size' : 'Sizes'}
              </span>
            </h5>
            <p className="text-[11px] text-slate-500">
              Click any size to select it directly for this production entry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Metrics Bar */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md border border-slate-200">
              {baseQtyShortLabel}: <strong className="text-slate-900">{totalBase.toLocaleString()}</strong> pcs
            </span>
            <span className="bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-md border border-blue-200">
              Done: <strong className="text-blue-900">{totalCompleted.toLocaleString()}</strong> pcs
            </span>
            <span className={`font-medium px-2 py-0.5 rounded-md border ${
              totalBalance === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              Bal: <strong className="font-extrabold">{totalBalance.toLocaleString()}</strong> ({totalPct}%)
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Cards Grid View"
            >
              <LayoutGrid className="w-3 h-3" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Detailed Table View"
            >
              <Table className="w-3 h-3" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition border border-slate-200"
            title={isExpanded ? 'Collapse Size Matrix' : 'Expand Size Matrix'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isExpanded && (
        <div className="space-y-3">
          {/* 1. Quick "All Sizes" Master Selector Bar */}
          {onSelectSize && (
            <div className="flex items-center justify-between gap-2 bg-slate-50/90 border border-slate-200/80 px-2.5 py-1.5 rounded-lg text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-bold">Fast Size Selection:</span>
                <span className="text-[11px] text-slate-500">Choose all or specific size</span>
              </div>
              <button
                type="button"
                onClick={() => onSelectSize('All Sizes')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 ${
                  !selectedSize || selectedSize === 'All Sizes'
                    ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-500'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                {(!selectedSize || selectedSize === 'All Sizes') && <Check className="w-3 h-3" />}
                <span>All Sizes (Master Batch)</span>
              </button>
            </div>
          )}

          {/* 2. Interactive Cards Grid View */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {sizeBreakdown.map(item => {
                const { baseQty, completed, balance, percentage } = getModuleStats(item);
                const isSelected = selectedSize && selectedSize.trim().toUpperCase() === item.size.trim().toUpperCase();
                const isFinished = completed >= baseQty && baseQty > 0;

                return (
                  <div
                    key={item.size}
                    onClick={() => onSelectSize && onSelectSize(item.size)}
                    className={`group relative cursor-pointer rounded-xl border p-2.5 transition-all flex flex-col justify-between select-none ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/40 shadow-xs scale-[1.02]'
                        : isFinished
                        ? 'bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-400 hover:bg-emerald-50/70'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-2xs hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Top: Size Badge & Status */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg font-mono font-black text-xs transition ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-900 border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-700'
                        }`}
                      >
                        {item.size}
                      </span>

                      {isSelected ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-100/90 px-1.5 py-0.5 rounded">
                          <Check className="w-2.5 h-2.5" /> Active
                        </span>
                      ) : isFinished ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Done
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">
                          {percentage}%
                        </span>
                      )}
                    </div>

                    {/* Middle: Progress Bar */}
                    <div className="space-y-1 my-1.5">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            percentage >= 100
                              ? 'bg-emerald-500'
                              : percentage >= 50
                              ? 'bg-blue-500'
                              : percentage > 0
                              ? 'bg-amber-500'
                              : 'bg-slate-200'
                          }`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom: Numerical Quantities */}
                    <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-100 text-[10px] text-center font-mono">
                      <div>
                        <span className="block text-[9px] text-slate-400 font-sans font-semibold">{baseQtyShortLabel}</span>
                        <span className="font-bold text-slate-800">{baseQty}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-blue-500 font-sans font-semibold">Done</span>
                        <span className="font-bold text-blue-700">{completed}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-rose-500 font-sans font-semibold">Rem</span>
                        <span className={`font-black ${balance === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {balance}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Detailed Table View */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-bold">Size</th>
                    <th className="py-2.5 px-3 font-bold text-right">{baseQtyLabel}</th>
                    <th className="py-2.5 px-3 font-bold text-right text-blue-700">{moduleLabel}</th>
                    <th className="py-2.5 px-3 font-bold text-right text-rose-700">Remaining Balance</th>
                    <th className="py-2.5 px-3 font-bold text-center">Progress %</th>
                    <th className="py-2.5 px-3 font-bold text-center">Status</th>
                    {onSelectSize && <th className="py-2.5 px-3 font-bold text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sizeBreakdown.map(item => {
                    const { baseQty, completed, balance, percentage } = getModuleStats(item);
                    const isSelected = selectedSize && selectedSize.trim().toUpperCase() === item.size.trim().toUpperCase();
                    const isFinished = completed >= baseQty && baseQty > 0;

                    return (
                      <tr
                        key={item.size}
                        onClick={() => onSelectSize && onSelectSize(item.size)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/90 font-semibold text-blue-900'
                            : 'hover:bg-slate-50/80 text-slate-800'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold flex items-center gap-1.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {item.size}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-1.5 py-0.2 rounded">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          {baseQty.toLocaleString()} pcs
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                          {completed.toLocaleString()} pcs
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600">
                          {balance.toLocaleString()} pcs
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  percentage >= 100
                                    ? 'bg-emerald-500'
                                    : percentage >= 50
                                    ? 'bg-blue-500'
                                    : percentage > 0
                                    ? 'bg-amber-500'
                                    : 'bg-slate-300'
                                }`}
                                style={{ width: `${Math.min(100, percentage)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-700 w-8 text-right">
                              {percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isFinished
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : completed > 0
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {isFinished ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Done
                              </>
                            ) : completed > 0 ? (
                              <>
                                <Clock className="w-3 h-3 text-blue-600" />
                                In Progress
                              </>
                            ) : (
                              'Pending'
                            )}
                          </span>
                        </td>
                        {onSelectSize && (
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSize(item.size);
                              }}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700 border border-slate-200'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/95 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td className="py-2.5 px-3 font-black uppercase text-[10px]">Total</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black">{totalBase.toLocaleString()} pcs</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-blue-700">{totalCompleted.toLocaleString()} pcs</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700">{totalBalance.toLocaleString()} pcs</td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-blue-800">{totalPct}% Overall</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          totalCompleted >= totalBase && totalBase > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {totalCompleted >= totalBase && totalBase > 0 ? 'Completed' : 'Running'}
                      </span>
                    </td>
                    {onSelectSize && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

