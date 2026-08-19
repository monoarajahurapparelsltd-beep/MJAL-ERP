import React from 'react';
import { Search, ShoppingBag, Shirt, Users, ArrowRight } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    globalSearchQuery,
    setGlobalSearchQuery,
    searchResults,
    setActiveModule
  } = useERP();

  if (!isSearchOpen) return null;

  const totalResults =
    searchResults.orders.length + searchResults.sewing.length + searchResults.employees.length;

  return (
    <Modal
      isOpen={isSearchOpen}
      onClose={() => setIsSearchOpen(false)}
      title="Global Factory Search"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={globalSearchQuery}
            onChange={e => setGlobalSearchQuery(e.target.value)}
            placeholder="Search by Buyer, Style No (MJ-101), PO No (PO-5001), Colour, Employee ID..."
            className="w-full rounded-xl border border-slate-300 pl-11 pr-4 py-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
          />
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto space-y-6 pt-2">
          {!globalSearchQuery ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">Type a keyword to search factory records</p>
              <p className="text-xs text-slate-400 mt-1">Try searching "PO-5001", "H&M", "MJ-101", "Navy", "Rafiqul"</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-medium text-slate-600">No matching records found for "{globalSearchQuery}"</p>
            </div>
          ) : (
            <>
              {/* Orders & Styles Results */}
              {searchResults.orders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <ShoppingBag className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Orders & Styles ({searchResults.orders.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                    {searchResults.orders.map(order => (
                      <div
                        key={order.id}
                        onClick={() => {
                          setActiveModule('orders');
                          setIsSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-blue-600">{order.styleNo}</span>
                            <span className="text-xs text-slate-500">• {order.buyer}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">{order.styleName} ({order.season})</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span>Qty: {order.totalOrderQty.toLocaleString()} pcs</span>
                            <span>•</span>
                            <span>POs: {order.purchaseOrders.map(p => p.poNo).join(', ')}</span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sewing Production Results */}
              {searchResults.sewing.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Shirt className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Sewing Production Records ({searchResults.sewing.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                    {searchResults.sewing.map(sew => (
                      <div
                        key={sew.id}
                        onClick={() => {
                          setActiveModule('sewing');
                          setIsSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800">{sew.lineNo}</span>
                            <span className="text-xs font-semibold text-blue-600">{sew.styleNo}</span>
                            <span className="text-xs text-slate-500">({sew.poNo} - {sew.colour})</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Date: {sew.date} | Output: {sew.totalOutput} pcs (Target: {sew.dailyTarget})
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Employees Results */}
              {searchResults.employees.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Employees ({searchResults.employees.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                    {searchResults.employees.map(emp => (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setActiveModule('hr');
                          setIsSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{emp.name}</span>
                            <span className="text-xs text-slate-500">({emp.empId})</span>
                            <StatusBadge status={emp.status} />
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{emp.designation} — {emp.department}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
