import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardCheck, Plus, AlertTriangle, Edit, Trash2, AlertCircle, Info, RotateCcw, Send } from 'lucide-react';
import { supabaseDataService } from '../../../services/supabaseDataService';
import { QCInspection, QCDefectItem, InterDeptTransfer } from '../../../types';
import { PageHeader } from '../../common/PageHeader';
import { DataTable, Column } from '../../common/DataTable';
import { StatusBadge } from '../../common/StatusBadge';
import { Modal } from '../../common/Modal';
import { ConfirmationDialog } from '../../common/ConfirmationDialog';
import { ExportPrintToolbar } from '../../common/ExportPrintToolbar';
import { useAuth } from '../../../context/AuthContext';
import { useERP } from '../../../context/ERPContext';
import { PermissionGuard } from '../../common/PermissionGuard';
import { OrderHierarchySelector, OrderSelectionValue } from '../../common/OrderHierarchySelector';
import { DepartmentTransferQueue } from '../../common/DepartmentTransferQueue';
import { TransferChallanModal } from '../../common/TransferChallanModal';
import { useToast } from '../../../context/ToastContext';

export const QCModule: React.FC = () => {
  const { currentUser, canOperate, canDelete } = useAuth();
  const { activeModule } = useERP();
  const { toast } = useToast();
  const [inspections, setInspections] = useState<QCInspection[]>(supabaseDataService.getQCInspections());
  const [orders, setOrders] = useState(supabaseDataService.getOrders());
  const [transfers, setTransfers] = useState<InterDeptTransfer[]>(supabaseDataService.getTransfers());
  const [activeTab, setActiveTab] = useState<'inspections' | 'transfers'>('inspections');

  useEffect(() => {
    if (activeModule === 'qc' || activeModule === 'qc_inspections') {
      setActiveTab('inspections');
    } else if (activeModule === 'qc_transfers') {
      setActiveTab('transfers');
    }
  }, [activeModule]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferModalType, setTransferModalType] = useState<'Transfer' | 'Return'>('Return');
  const [transferDefaultToDept, setTransferDefaultToDept] = useState<'Sewing' | 'Cutting'>('Sewing');
  const [transferTargetItem, setTransferTargetItem] = useState<{ styleNo: string; poNo: string; colour: string; size: string; qty: number } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedQC, setSelectedQC] = useState<QCInspection | null>(null);
  const [qcToDelete, setQcToDelete] = useState<QCInspection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [inspectionType, setInspectionType] = useState<any>('End Line QC');
  const [buyer, setBuyer] = useState('');
  const [styleNo, setStyleNo] = useState('');
  const [poNo, setPoNo] = useState('');
  const [colour, setColour] = useState('');
  const [size, setSize] = useState('All Sizes');
  const [lineNo, setLineNo] = useState('Line No 1');
  const [inspectedQty, setInspectedQty] = useState<number | ''>('');
  const [passedQty, setPassedQty] = useState<number | ''>('');
  const [reworkQty, setReworkQty] = useState<number | ''>('');
  const [rejectQty, setRejectQty] = useState<number | ''>('');

  useEffect(() => {
    const update = () => {
      setInspections([...supabaseDataService.getQCInspections()]);
      setOrders([...supabaseDataService.getOrders()]);
      setTransfers([...supabaseDataService.getTransfers()]);
    };
    update();
    const unsub = supabaseDataService.subscribe(update);
    return unsub;
  }, []);

  const handleOpenTransferModal = (type: 'Transfer' | 'Return' = 'Return', toDept: 'Sewing' | 'Cutting' = 'Sewing', item?: QCInspection) => {
    setTransferModalType(type);
    setTransferDefaultToDept(toDept);
    if (item) {
      const returnQty = (item.reworkQty || 0) + (item.rejectQty || 0);
      setTransferTargetItem({
        styleNo: item.styleNo,
        poNo: item.poNo,
        colour: item.colour,
        size: item.size || 'All Sizes',
        qty: returnQty > 0 ? returnQty : item.inspectedQty || 0
      });
    } else {
      setTransferTargetItem(null);
    }
    setIsTransferModalOpen(true);
  };

  const handleOrderHierarchySelect = (selection: OrderSelectionValue) => {
    setBuyer(selection.buyer);
    setStyleNo(selection.styleNo);
    setPoNo(selection.poNo);
    setColour(selection.colour);
    setSize(selection.size || 'All Sizes');

    if (selection.progress && selection.progress.sewOutput > 0 && (!inspectedQty || inspectedQty === '')) {
      setInspectedQty(selection.progress.sewOutput);
    }
  };

  const resetForm = () => {
    setSelectedQC(null);
    setInspectionType('End Line QC');
    setBuyer('');
    setStyleNo('');
    setPoNo('');
    setColour('');
    setSize('All Sizes');
    setLineNo('Line No 1');
    setInspectedQty('');
    setPassedQty('');
    setReworkQty('');
    setRejectQty('');
    setErrorMessage(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (qc: QCInspection) => {
    setSelectedQC(qc);
    setInspectionType(qc.inspectionType);
    setStyleNo(qc.styleNo);
    setPoNo(qc.poNo);
    setColour(qc.colour);
    setSize(qc.size || 'All Sizes');
    setLineNo(qc.lineNo);
    setInspectedQty(qc.inspectedQty);
    setPassedQty(qc.passedQty);
    setReworkQty(qc.reworkQty);
    setRejectQty(qc.rejectQty);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (qc: QCInspection) => {
    setQcToDelete(qc);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!qcToDelete) return;
    setIsLoading(true);
    const res = await supabaseDataService.deleteQCInspection(qcToDelete.id, currentUser?.name);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to delete QC inspection record from database.');
    } else {
      toast.success('QC Inspection record deleted successfully.');
      setIsDeleteModalOpen(false);
      setQcToDelete(null);
    }
  };

  const handleSaveQC = async (e: React.FormEvent) => {
    e.preventDefault();
    const sNo = styleNo.trim();
    const pNo = poNo.trim();
    const col = colour.trim();

    if (!sNo || !pNo || !col || inspectedQty === '' || passedQty === '') {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    const inspNum = Number(inspectedQty) || 0;
    const passNum = Number(passedQty) || 0;
    const rewNum = Number(reworkQty) || 0;
    const rejNum = Number(rejectQty) || 0;

    const targetId = selectedQC ? selectedQC.id : 'qc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

    const totalDefects = Math.max(0, inspNum - passNum);
    const dhu = inspNum > 0 ? Number(((totalDefects / inspNum) * 100).toFixed(1)) : 0;

    const record: QCInspection = {
      id: targetId,
      date: selectedQC ? selectedQC.date : new Date().toISOString().substring(0, 10),
      inspectionType,
      styleNo: sNo,
      poNo: pNo,
      colour: col,
      size: size || 'All Sizes',
      lineNo,
      inspectedQty: inspNum,
      passedQty: passNum,
      reworkQty: rewNum,
      rejectQty: rejNum,
      dhu,
      defects: [
        { defectCategory: 'Stitch Fault / Skip', defectQty: Math.ceil(totalDefects * 0.6) },
        { defectCategory: 'Oil / Stain', defectQty: Math.floor(totalDefects * 0.4) }
      ],
      inspectorName: selectedQC ? selectedQC.inspectorName : (currentUser?.name || 'QC Inspector'),
      result: dhu <= 5.0 ? 'Pass' : 'Fail'
    };

    const res = await supabaseDataService.saveQCInspection(record, currentUser?.name);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to save QC inspection to Supabase.');
    } else {
      toast.success(`QC Inspection record for Style ${sNo} (Passed: ${passNum.toLocaleString()} pcs, Result: ${record.result}) saved successfully!`);
      setIsModalOpen(false);
      resetForm();
    }
  };

  const columns: Column<QCInspection>[] = [
    {
      header: 'Last Update Date',
      accessorKey: 'lastUpdateDate',
      sortable: true,
      cell: q => <span className="font-bold text-slate-800">{q.lastUpdateDate || q.date}</span>
    },
    { header: 'Inspection Type', accessorKey: 'inspectionType', cell: q => <span className="font-bold text-slate-800">{q.inspectionType}</span> },
    { header: 'Line', accessorKey: 'lineNo' },
    { header: 'Style / PO / Colour', cell: q => <span className="font-bold text-blue-600">{q.styleNo} ({q.poNo} - {q.colour})</span> },
    {
      header: 'Size',
      accessorKey: 'size',
      cell: q => (
        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200 text-xs">
          {q.size || 'All Sizes'}
        </span>
      )
    },
    { header: 'Inspected Qty', cell: q => <span>{(q.inspectedQty || 0).toLocaleString()} pcs</span> },
    { header: 'Passed Qty', cell: q => <span className="font-bold text-emerald-700">{(q.passedQty || 0).toLocaleString()} pcs</span> },
    { header: 'Rework / Reject', cell: q => <span className="text-slate-600">{q.reworkQty} / {q.rejectQty}</span> },
    { header: 'DHU %', cell: q => <span className={`font-extrabold ${q.dhu <= 5 ? 'text-emerald-600' : 'text-rose-600'}`}>{q.dhu}%</span> },
    { header: 'Result', accessorKey: 'result', cell: q => <StatusBadge status={q.result} /> },
    {
      header: 'Actions',
      cell: q => (
        <div className="flex items-center gap-1">
          {((q.reworkQty && q.reworkQty > 0) || (q.rejectQty && q.rejectQty > 0)) && (
            <PermissionGuard dept="QC" permission="CREATE">
              <button
                onClick={() => handleOpenTransferModal('Return', 'Sewing', q)}
                title="Issue Defect/Rework Return Challan to Sewing"
                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 hover:text-amber-800 transition-colors flex items-center gap-1 text-[11px] font-bold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Return</span>
              </button>
            </PermissionGuard>
          )}
          {canOperate('QC') && (
            <button
              onClick={() => handleOpenEdit(q)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
              title="Edit QC Record"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          )}
          {canDelete('QC') && (
            <button
              onClick={() => handleOpenDelete(q)}
              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
              title="Delete QC Record"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  const pendingQCRejections = transfers.filter(t => (t.transferType === 'Return' || t.transferType === 'Rework') && t.status === 'Dispatched').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Quality Control & Defect DHU Management"
        description="Inline, End Line, Final QC & AQL Inspection DHU % Analysis"
        actions={
          <div className="flex items-center gap-2">
            <ExportPrintToolbar title="QC Inspections" data={inspections} filename="MJAL_QC_Report" />
            <PermissionGuard dept="QC" permission="CREATE">
              <button
                onClick={() => handleOpenTransferModal('Return', 'Sewing')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 shadow-2xs transition-colors"
              >
                <RotateCcw className="h-4 w-4 text-amber-700" />
                <span>Issue Rework Return Challan</span>
              </button>
            </PermissionGuard>
            <PermissionGuard department="QC">
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                New QC Inspection
              </button>
            </PermissionGuard>
          </div>
        }
      />

      {activeTab === 'inspections' && (
        <DataTable data={inspections} columns={columns} keyExtractor={q => q.id} searchPlaceholder="Search QC inspection records..." />
      )}

      {activeTab === 'transfers' && (
        <DepartmentTransferQueue
          department="All"
          defaultToDept="Sewing"
          title="QC & Production Defect Return Challan Central Queue"
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={selectedQC ? 'Edit QC Inspection Record' : 'Submit QC Inspection Record'}
      >
        <form onSubmit={handleSaveQC} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Master Hierarchy Selector (Select, Don't Retype) */}
          <OrderHierarchySelector
            selectedBuyer={buyer}
            selectedStyleNo={styleNo}
            selectedPoNo={poNo}
            selectedColour={colour}
            selectedSize={size}
            onSelect={handleOrderHierarchySelect}
            currentModule="QC"
            showSizeSelector={true}
            customTitle="Select Order Master for Quality Inspection"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Inspection Type *</label>
              <select value={inspectionType} onChange={e => setInspectionType(e.target.value)} className="w-full rounded border p-2 text-xs">
                <option value="Inline QC">Inline QC</option>
                <option value="End Line QC">End Line QC</option>
                <option value="Final QC">Final QC</option>
                <option value="AQL Inspection">AQL Inspection</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sewing Line *</label>
              <select value={lineNo} onChange={e => setLineNo(e.target.value)} className="w-full rounded border p-2 text-xs font-bold">
                <option value="Line No 1">Line No 1</option>
                <option value="Line No 2">Line No 2</option>
                <option value="Line No 3">Line No 3</option>
                <option value="Line No 4">Line No 4</option>
                <option value="Line No 5">Line No 5</option>
                <option value="Line No 6">Line No 6</option>
                <option value="Line No 7">Line No 7</option>
                <option value="Line No 8">Line No 8</option>
                <option value="Line No 9">Line No 9</option>
                <option value="Line No 10">Line No 10</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Inspected Qty *</label>
              <input
                type="number"
                placeholder="Enter Inspected Qty"
                value={inspectedQty}
                onChange={e => setInspectedQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded border p-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Passed Qty *</label>
              <input
                type="number"
                placeholder="Enter Passed Qty"
                value={passedQty}
                onChange={e => setPassedQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded border p-2 text-xs font-bold text-emerald-700 focus:ring-1 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rework Qty</label>
              <input
                type="number"
                placeholder="Enter Rework Qty"
                value={reworkQty}
                onChange={e => setReworkQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded border p-2 text-xs text-amber-600 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reject Qty</label>
              <input
                type="number"
                placeholder="Enter Reject Qty"
                value={rejectQty}
                onChange={e => setRejectQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded border p-2 text-xs text-rose-600 focus:ring-1 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="px-4 py-2 text-xs rounded border border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : selectedQC ? 'Update QC Record' : 'Save QC Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete the QC record for Style "${qcToDelete?.styleNo}" (${qcToDelete?.inspectionType})?`}
        confirmLabel={isLoading ? 'Deleting...' : 'Delete Record'}
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setIsDeleteModalOpen(false); setQcToDelete(null); }}
      />

      {/* Transfer & Defect Return Challan Modal */}
      {isTransferModalOpen && (
        <TransferChallanModal
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setTransferTargetItem(null);
          }}
          defaultFromDept="QC"
          defaultToDept={transferDefaultToDept}
          initialStyleNo={transferTargetItem?.styleNo || ''}
          initialPoNo={transferTargetItem?.poNo || ''}
          initialColour={transferTargetItem?.colour || ''}
          initialSize={transferTargetItem?.size || 'All Sizes'}
          maxAvailableQty={transferTargetItem?.qty || 0}
          initialTransferType={transferModalType}
          onSuccess={() => {
            setInspections([...supabaseDataService.getQCInspections()]);
            setTransfers([...supabaseDataService.getTransfers()]);
          }}
        />
      )}
    </div>
  );
};
