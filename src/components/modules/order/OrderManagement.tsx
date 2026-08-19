import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  ShoppingBag,
  Edit,
  Eye,
  Trash2,
  AlertCircle,
  Building2,
  Layers,
  FileSpreadsheet,
  Palette,
  Ruler,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Scissors,
  Shirt,
  Sparkles,
  CheckSquare,
  Box,
  Truck,
  ArrowRight,
  PlusCircle,
  X
} from 'lucide-react';
import { supabaseDataService } from '../../../services/supabaseDataService';
import { OrderStyle, PurchaseOrder, ColourQty, OrderStatus } from '../../../types';
import { PageHeader } from '../../common/PageHeader';
import { DataTable, Column } from '../../common/DataTable';
import { StatusBadge } from '../../common/StatusBadge';
import { Modal } from '../../common/Modal';
import { ConfirmationDialog } from '../../common/ConfirmationDialog';
import { PermissionGuard } from '../../common/PermissionGuard';
import { useAuth } from '../../../context/AuthContext';
import { ExportPrintToolbar } from '../../common/ExportPrintToolbar';
import { filterOrdersForUser, canAccessOrder, isGlobalUser } from '../../../utils/authUtils';

export const OrderManagement: React.FC = () => {
  const { currentUser, canOperate, canDelete } = useAuth();
  const [orders, setOrders] = useState<OrderStyle[]>(supabaseDataService.getOrders());
  const [masterVersion, setMasterVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<'orders' | 'hierarchy_explorer'>('orders');
  const [selectedExplorerOrder, setSelectedExplorerOrder] = useState<string | null>(null);

  // Dynamic Master Data lists from Master Data Configuration
  const masterBuyers = useMemo(() => supabaseDataService.getMasterBuyers(), [masterVersion]);
  const masterBrands = useMemo(() => supabaseDataService.getMasterBrands(), [masterVersion]);
  const masterGarmentTypes = useMemo(() => supabaseDataService.getMasterGarmentTypes(), [masterVersion]);
  const masterSeasons = useMemo(() => supabaseDataService.getMasterSeasons(), [masterVersion]);
  const masterColours = useMemo(() => supabaseDataService.getMasterColours(), [masterVersion]);
  const masterSizeMatrices = useMemo(() => supabaseDataService.getMasterSizeMatrices(), [masterVersion]);

  // User-based order privacy filtering: regular users see only their own created orders, executives & admins see all
  const visibleOrders = useMemo(() => {
    return filterOrdersForUser(orders, currentUser);
  }, [orders, currentUser]);

  const isExecutiveOrAdmin = useMemo(() => isGlobalUser(currentUser), [currentUser]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OrderStyle | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderStyle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [buyer, setBuyer] = useState('H&M Global');
  const [brand, setBrand] = useState('Divided');
  const [styleNo, setStyleNo] = useState('');
  const [styleName, setStyleName] = useState('');
  const [garmentType, setGarmentType] = useState('Denim Bottom');
  const [season, setSeason] = useState('SS 2026');
  const [currency, setCurrency] = useState('USD');
  const [status, setStatus] = useState<OrderStatus>('Running');
  const [selectedMatrixId, setSelectedMatrixId] = useState<string>('');

  // Multi-PO structure state
  interface FormPurchaseOrder {
    id?: string;
    poNo: string;
    poDate: string;
    deliveryDate: string;
    shipmentDate: string;
    unitPrice: number | '';
    remarks?: string;
    colours: Array<{
      colour: string;
      totalQty: number;
      sizeQuantities: Record<string, number>;
    }>;
  }

  const [formPOs, setFormPOs] = useState<FormPurchaseOrder[]>([
    {
      poNo: '',
      poDate: new Date().toISOString().substring(0, 10),
      deliveryDate: '2026-09-30',
      shipmentDate: '2026-10-02',
      unitPrice: 8.5,
      remarks: '',
      colours: [
        {
          colour: 'Indigo Blue',
          totalQty: 2000,
          sizeQuantities: { '30': 400, '32': 800, '34': 600, '36': 200 }
        }
      ]
    }
  ]);

  useEffect(() => {
    setOrders(supabaseDataService.getOrders());
    const unsub = supabaseDataService.subscribe(() => {
      setOrders([...supabaseDataService.getOrders()]);
      setMasterVersion(v => v + 1);
    });
    return unsub;
  }, []);

  // Compute active sizes for form matrix columns based on chosen Matrix or Order existing sizes
  const activeSizes = useMemo(() => {
    if (selectedMatrixId) {
      const found = masterSizeMatrices.find(m => m.id === selectedMatrixId || m.name === selectedMatrixId || m.code === selectedMatrixId);
      if (found && found.sizes.length > 0) return found.sizes;
    }
    // Check if garment type suggests matrix
    const gt = (garmentType || '').toLowerCase();
    if (gt.includes('knit') || gt.includes('t-shirt') || gt.includes('top') || gt.includes('polo') || gt.includes('jacket')) {
      const alpha = masterSizeMatrices.find(m => m.name.toLowerCase().includes('alpha') || m.code.includes('ALPHA'));
      if (alpha && alpha.sizes.length > 0) return alpha.sizes;
    }
    if (masterSizeMatrices.length > 0) {
      return masterSizeMatrices[0].sizes;
    }
    return ['28', '30', '32', '34', '36', '38'];
  }, [selectedMatrixId, garmentType, masterSizeMatrices]);

  // Summary Metrics based on user-permitted orders
  const stats = useMemo(() => {
    const totalStyles = visibleOrders.length;
    let totalPOs = 0;
    let totalQty = 0;
    let totalValue = 0;
    const buyersSet = new Set<string>();

    visibleOrders.forEach(o => {
      if (o.buyer) buyersSet.add(o.buyer);
      totalQty += o.totalOrderQty || 0;
      totalValue += o.totalOrderValue || 0;
      totalPOs += (o.purchaseOrders || []).length;
    });

    return {
      totalStyles,
      totalPOs,
      totalQty,
      totalValue,
      totalBuyers: buyersSet.size
    };
  }, [visibleOrders]);

  const resetForm = () => {
    setSelectedOrder(null);
    setStyleNo('');
    setStyleName('');
    setBuyer('H&M Global');
    setBrand('H&M Casuals');
    setGarmentType('Denim Bottom');
    setSeason('Autumn / Winter 2026');
    setCurrency('USD');
    setStatus('Running');
    setSelectedMatrixId('');
    setFormPOs([
      {
        poNo: '',
        poDate: new Date().toISOString().substring(0, 10),
        deliveryDate: '2026-09-30',
        shipmentDate: '2026-10-02',
        unitPrice: 8.5,
        remarks: '',
        colours: [
          {
            colour: 'Indigo Blue',
            totalQty: 2000,
            sizeQuantities: { '30': 400, '32': 800, '34': 600, '36': 200 }
          }
        ]
      }
    ]);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleOpenEdit = (order: OrderStyle) => {
    if (!canAccessOrder(currentUser, order)) {
      setErrorMessage(`Access Denied: You can only edit orders created by yourself (${currentUser?.name || currentUser?.email}).`);
      return;
    }
    setSelectedOrder(order);
    setBuyer(order.buyer);
    setBrand(order.brand);
    setStyleNo(order.styleNo);
    setStyleName(order.styleName);
    setGarmentType(order.garmentType);
    setSeason(order.season);
    setCurrency(order.currency || 'USD');
    setStatus(order.status);

    if (order.purchaseOrders && order.purchaseOrders.length > 0) {
      setFormPOs(
        order.purchaseOrders.map(p => ({
          id: p.id,
          poNo: p.poNo,
          poDate: p.poDate,
          deliveryDate: p.deliveryDate,
          shipmentDate: p.shipmentDate,
          unitPrice: p.unitPrice,
          remarks: p.remarks || '',
          colours: p.colours.map(c => ({
            colour: c.colour,
            totalQty: c.totalQty,
            sizeQuantities: c.sizeQuantities || {}
          }))
        }))
      );
    } else {
      setFormPOs([
        {
          poNo: 'PO-DEFAULT',
          poDate: new Date().toISOString().substring(0, 10),
          deliveryDate: '2026-09-30',
          shipmentDate: '2026-10-02',
          unitPrice: 8.5,
          remarks: '',
          colours: [
            {
              colour: 'Standard',
              totalQty: order.totalOrderQty || 1000,
              sizeQuantities: { 'M': order.totalOrderQty || 1000 }
            }
          ]
        }
      ]);
    }
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleAddPO = () => {
    setFormPOs([
      ...formPOs,
      {
        poNo: `PO-${5000 + formPOs.length + 1}`,
        poDate: new Date().toISOString().substring(0, 10),
        deliveryDate: '2026-10-15',
        shipmentDate: '2026-10-18',
        unitPrice: formPOs[0]?.unitPrice || 8.5,
        remarks: '',
        colours: [
          {
            colour: 'Indigo Blue',
            totalQty: 1000,
            sizeQuantities: { '30': 200, '32': 500, '34': 300 }
          }
        ]
      }
    ]);
  };

  const handleRemovePO = (poIdx: number) => {
    if (formPOs.length <= 1) return;
    setFormPOs(formPOs.filter((_, i) => i !== poIdx));
  };

  const handleAddColourToPO = (poIdx: number) => {
    const updated = [...formPOs];
    const initialSizes: Record<string, number> = {};
    activeSizes.forEach(s => {
      initialSizes[s] = 0;
    });

    updated[poIdx].colours.push({
      colour: '',
      totalQty: 0,
      sizeQuantities: initialSizes
    });
    setFormPOs(updated);
  };

  const handleRemoveColourFromPO = (poIdx: number, colIdx: number) => {
    const updated = [...formPOs];
    if (updated[poIdx].colours.length <= 1) return;
    updated[poIdx].colours = updated[poIdx].colours.filter((_, i) => i !== colIdx);
    setFormPOs(updated);
  };

  const handleSizeQtyChange = (poIdx: number, colIdx: number, size: string, qty: number) => {
    const updated = [...formPOs];
    const targetCol = updated[poIdx].colours[colIdx];
    targetCol.sizeQuantities = {
      ...targetCol.sizeQuantities,
      [size]: Math.max(0, qty)
    };
    // Auto calculate colour totalQty from sizes
    const sum = Object.values(targetCol.sizeQuantities).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    targetCol.totalQty = sum;
    setFormPOs(updated);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!styleNo.trim()) {
      setErrorMessage('Style Number is mandatory.');
      return;
    }

    // Validate POs and colours
    for (let i = 0; i < formPOs.length; i++) {
      const p = formPOs[i];
      if (!p.poNo.trim()) {
        setErrorMessage(`Purchase Order #${i + 1} must have a valid PO Number.`);
        return;
      }
      const validCols = p.colours.filter(c => c.colour.trim() !== '');
      if (validCols.length === 0) {
        setErrorMessage(`PO "${p.poNo}" must have at least one defined colour.`);
        return;
      }

      for (const col of validCols) {
        const hasPositiveSize = Object.values(col.sizeQuantities || {}).some(q => Number(q) > 0);
        if (!hasPositiveSize && (col.totalQty || 0) <= 0) {
          setErrorMessage(`Colour "${col.colour}" in PO "${p.poNo}" must have at least one size with quantity greater than 0.`);
          return;
        }
      }
    }

    setErrorMessage(null);
    setIsLoading(true);

    // Build PurchaseOrders and sanitize sizeQuantities (exclude sizes with Order Qty = 0)
    let overallOrderQty = 0;
    let overallOrderValue = 0;

    const purchaseOrdersToSave: PurchaseOrder[] = formPOs.map((p, idx) => {
      const validColours: ColourQty[] = p.colours
        .filter(c => c.colour.trim() !== '')
        .map(c => {
          const cleanSizes: Record<string, number> = {};
          Object.entries(c.sizeQuantities || {}).forEach(([sz, q]) => {
            const num = Number(q) || 0;
            if (num > 0) {
              cleanSizes[sz] = num;
            }
          });
          const qty = Object.values(cleanSizes).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
          return {
            colour: c.colour.trim(),
            totalQty: qty || c.totalQty || 0,
            sizeQuantities: cleanSizes
          };
        });

      const totalPoQty = validColours.reduce((sum, c) => sum + c.totalQty, 0);
      const unitPr = Number(p.unitPrice || 0);
      const totalPoVal = totalPoQty * unitPr;

      overallOrderQty += totalPoQty;
      overallOrderValue += totalPoVal;

      return {
        id: p.id || `po-${Date.now()}-${idx}`,
        poNo: p.poNo.trim(),
        poDate: p.poDate,
        deliveryDate: p.deliveryDate,
        shipmentDate: p.shipmentDate,
        unitPrice: unitPr,
        currency,
        totalValue: totalPoVal,
        totalPoQty,
        status: status === 'Draft' ? 'Draft' : 'Running',
        remarks: p.remarks,
        colours: validColours
      };
    });

    const existingSameStyle = orders.find(
      o => o.styleNo.trim().toUpperCase() === styleNo.trim().toUpperCase() && o.id !== selectedOrder?.id
    );

    const userCreatorId = currentUser?.name || currentUser?.email || currentUser?.username || currentUser?.id || 'Merchandising';
    const userDept = currentUser?.department || 'Merchandising';
    const userCreatorEmail = (currentUser?.email || '').toLowerCase().trim();

    const orderToSave: OrderStyle = {
      id: selectedOrder ? selectedOrder.id : existingSameStyle ? existingSameStyle.id : `ord-${Date.now()}`,
      buyer: buyer.trim(),
      brand: brand.trim(),
      styleNo: styleNo.trim().toUpperCase(),
      styleName: styleName.trim(),
      garmentType,
      season,
      purchaseOrders: purchaseOrdersToSave,
      totalOrderQty: overallOrderQty,
      totalOrderValue: overallOrderValue,
      currency,
      status,
      createdBy: selectedOrder?.createdBy || selectedOrder?.created_by || userCreatorId,
      created_by: selectedOrder?.createdBy || selectedOrder?.created_by || userCreatorId,
      createdDepartment: selectedOrder?.createdDepartment || selectedOrder?.created_department || userDept,
      created_department: selectedOrder?.createdDepartment || selectedOrder?.created_department || userDept,
      creatorEmail: selectedOrder?.creatorEmail || selectedOrder?.creator_email || userCreatorEmail || undefined,
      creator_email: selectedOrder?.creatorEmail || selectedOrder?.creator_email || userCreatorEmail || undefined,
      createdAt: selectedOrder?.createdAt || existingSameStyle?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = await supabaseDataService.saveOrder(orderToSave, currentUser?.name || currentUser?.email);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to save Master Order to Supabase.');
    } else {
      setIsModalOpen(false);
      resetForm();
      setSuccessMessage(`Master Order "${orderToSave.styleNo}" successfully saved with ownership [${orderToSave.createdBy}] and size filtering.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleOpenDelete = (order: OrderStyle) => {
    if (!canAccessOrder(currentUser, order)) {
      setErrorMessage(`Access Denied: You cannot delete orders created by other users.`);
      return;
    }
    setOrderToDelete(order);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    if (!canAccessOrder(currentUser, orderToDelete)) {
      setErrorMessage(`Access Denied: You cannot delete this order.`);
      setIsDeleteModalOpen(false);
      return;
    }
    setIsLoading(true);
    const res = await supabaseDataService.deleteOrder(orderToDelete.id, currentUser?.name);
    setIsLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to delete order from database.');
    } else {
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
      setSuccessMessage(`Order "${orderToDelete.styleNo}" removed.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const columns: Column<OrderStyle>[] = [
    {
      header: 'Style No / Name',
      accessorKey: 'styleNo',
      sortable: true,
      cell: o => (
        <div>
          <span className="font-bold text-blue-600 hover:underline cursor-pointer" onClick={() => handleOpenEdit(o)}>
            {o.styleNo}
          </span>
          <p className="text-[11px] text-slate-500">{o.styleName || o.garmentType}</p>
        </div>
      )
    },
    {
      header: 'Buyer / Brand',
      accessorKey: 'buyer',
      sortable: true,
      cell: o => (
        <div>
          <span className="font-semibold text-slate-800">{o.buyer}</span>
          <p className="text-[11px] text-slate-500">{o.brand || o.season}</p>
        </div>
      )
    },
    {
      header: 'Created By / Dept',
      cell: o => (
        <div>
          <span className="font-semibold text-slate-800 text-xs flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {o.createdBy || o.created_by || 'System Admin'}
          </span>
          <p className="text-[10px] text-slate-500 font-medium">{o.createdDepartment || o.created_department || 'Merchandising'}</p>
        </div>
      )
    },
    {
      header: 'Purchase Orders',
      cell: o => (
        <div className="flex flex-wrap gap-1">
          {o.purchaseOrders?.map(p => (
            <span
              key={p.poNo}
              className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
            >
              {p.poNo} ({p.totalPoQty?.toLocaleString()} pcs)
            </span>
          ))}
        </div>
      )
    },
    {
      header: 'Colours & Active Sizes',
      cell: o => (
        <div className="space-y-1">
          {o.purchaseOrders?.flatMap(p => p.colours).slice(0, 3).map((c, i) => {
            const activeSizes = Object.keys(c.sizeQuantities || {}).filter(k => (Number(c.sizeQuantities[k]) || 0) > 0);
            return (
              <div key={i} className="text-[11px] text-slate-700 flex items-center gap-1.5 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shrink-0" />
                <strong className="text-slate-900">{c.colour}:</strong> {c.totalQty?.toLocaleString()} pcs
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                  {activeSizes.join(', ') || 'Standard'}
                </span>
              </div>
            );
          })}
          {(o.purchaseOrders?.flatMap(p => p.colours).length || 0) > 3 && (
            <span className="text-[10px] text-slate-400 font-medium">
              +{(o.purchaseOrders?.flatMap(p => p.colours).length || 0) - 3} more colours
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Total Order Qty',
      accessorKey: 'totalOrderQty',
      sortable: true,
      cell: o => <span className="font-bold text-slate-900">{o.totalOrderQty?.toLocaleString()} pcs</span>
    },
    {
      header: 'Order Value',
      accessorKey: 'totalOrderValue',
      sortable: true,
      cell: o => (
        <span className="font-bold text-emerald-700">
          ${o.totalOrderValue?.toLocaleString()} {o.currency || 'USD'}
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: o => <StatusBadge status={o.status} />
    },
    {
      header: 'Created By',
      cell: o => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800">{o.createdBy || o.created_by || 'Merchandising'}</div>
          {(o.creatorEmail || o.creator_email) && (
            <div className="text-[11px] text-slate-500 font-mono">{o.creatorEmail || o.creator_email}</div>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      cell: o => {
        const canManageThisOrder = canAccessOrder(currentUser, o);
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setSelectedExplorerOrder(o.styleNo);
                setActiveTab('hierarchy_explorer');
              }}
              title="Inspect Master Hierarchy Pipeline"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            {canOperate('Order Management') && canManageThisOrder && (
              <button
                onClick={() => handleOpenEdit(o)}
                title="Edit Master Order"
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete('Order Management') && canManageThisOrder && (
              <button
                onClick={() => handleOpenDelete(o)}
                title="Delete Master Order"
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Order Management (Master Data Source)"
        description={
          isExecutiveOrAdmin
            ? "Master Source of Truth for all Orders (Executive & Admin Universal Visibility)"
            : `User Order Directory: Displaying orders created by ${currentUser?.name || currentUser?.email || 'you'} (${currentUser?.department || 'Merchandising'})`
        }
        actions={
          <div className="flex items-center gap-2">
            <ExportPrintToolbar title="Master Orders" data={visibleOrders} filename="MJAL_Master_Orders" />
            <PermissionGuard dept="Order Management" permission="CREATE">
              <button
                id="btn-create-master-order"
                onClick={() => {
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Master Order
              </button>
            </PermissionGuard>
          </div>
        }
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-blue-500" /> Active Buyers
          </div>
          <div className="text-xl font-bold text-slate-800 mt-1">{stats.totalBuyers}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-500" /> Master Styles
          </div>
          <div className="text-xl font-bold text-indigo-600 mt-1">{stats.totalStyles}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Total POs
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{stats.totalPOs}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Shirt className="w-3.5 h-3.5 text-amber-500" /> Total Order Qty
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{(stats.totalQty || 0).toLocaleString()} pcs</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Total Order Value
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">${(stats.totalValue || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-2.5 px-2 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Master Orders Directory ({visibleOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('hierarchy_explorer')}
          className={`pb-2.5 px-2 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'hierarchy_explorer'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Master Hierarchy & Live Pipeline Explorer
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tab 1: Orders Table */}
      {activeTab === 'orders' && (
        <DataTable
          data={visibleOrders}
          columns={columns}
          keyExtractor={o => o.id}
          searchPlaceholder="Search Style, PO, Buyer, Colour, Garment Type..."
        />
      )}

      {/* Tab 2: Hierarchy Explorer */}
      {activeTab === 'hierarchy_explorer' && (
        <div className="space-y-4">
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Single Source of Truth:</strong> Every operational transaction in Merchandising, Cutting, Sewing, Washing, Finishing, QC, Packing, and Shipment is tied directly to the Master Orders listed below.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Styles list */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Style to Inspect ({visibleOrders.length})</h4>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {visibleOrders.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedExplorerOrder(o.styleNo)}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors flex flex-col gap-1 ${
                      selectedExplorerOrder === o.styleNo || (!selectedExplorerOrder && visibleOrders[0]?.styleNo === o.styleNo)
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-blue-700">{o.styleNo}</span>
                      <span className="text-[11px] font-semibold text-slate-600">{o.buyer}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{o.styleName}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{o.purchaseOrders?.length || 0} POs</span>
                      <span className="font-bold text-slate-700">{o.totalOrderQty?.toLocaleString()} pcs</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Drilldown Details */}
            <div className="md:col-span-2 space-y-3">
              {(() => {
                const targetStyleNo = selectedExplorerOrder || visibleOrders[0]?.styleNo;
                const order = visibleOrders.find(o => o.styleNo === targetStyleNo);
                if (!order) {
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                      No order selected or no orders available for your account.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-blue-700">{order.styleNo}</span>
                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">
                              {order.buyer}
                            </span>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">{order.styleName} ({order.garmentType})</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Total Style Qty</div>
                          <div className="text-base font-bold text-slate-900">{order.totalOrderQty?.toLocaleString()} pcs</div>
                        </div>
                      </div>

                      {/* POs list */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Purchase Orders & Colours ({order.purchaseOrders?.length || 0})
                        </h5>

                        {order.purchaseOrders?.map(po => (
                          <div key={po.poNo} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200">
                                  PO: {po.poNo}
                                </span>
                                <span className="text-slate-500">
                                  Delivery: <strong>{po.deliveryDate}</strong>
                                </span>
                              </div>
                              <div className="font-bold text-emerald-700">
                                {po.totalPoQty?.toLocaleString()} pcs (${po.totalValue?.toLocaleString()})
                              </div>
                            </div>

                            {/* Colours in this PO */}
                            <div className="space-y-2">
                              {po.colours?.map(c => {
                                const prog = supabaseDataService.getStylePoColourProgress(order.styleNo, po.poNo, c.colour);
                                return (
                                  <div key={c.colour} className="bg-white border border-slate-200 rounded-lg p-2.5">
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <Palette className="w-3.5 h-3.5 text-indigo-500" />
                                        <span className="font-bold text-slate-800">{c.colour}</span>
                                        <span className="text-slate-400">({c.totalQty?.toLocaleString()} pcs)</span>
                                      </div>
                                      <span className="text-[11px] font-semibold text-blue-600">
                                        Pipeline: {prog.packPercentage || 0}% complete
                                      </span>
                                    </div>

                                    {/* Size matrix */}
                                    {c.sizeQuantities && Object.keys(c.sizeQuantities).length > 0 && (
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {Object.entries(c.sizeQuantities).map(([sz, q]) => (
                                          <span
                                            key={sz}
                                            className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                                          >
                                            <strong>{sz}:</strong> {q}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {/* Mini stage pipeline */}
                                    <div className="grid grid-cols-7 gap-1 text-[10px] text-center pt-1 border-t border-slate-100">
                                      <div className="bg-slate-50 p-1 rounded">
                                        <div className="text-slate-400">Cut</div>
                                        <div className="font-bold">{prog.cutQty}</div>
                                      </div>
                                      <div className="bg-slate-50 p-1 rounded">
                                        <div className="text-slate-400">Sew</div>
                                        <div className="font-bold text-blue-600">{prog.sewOutput}</div>
                                      </div>
                                      <div className="bg-slate-50 p-1 rounded">
                                        <div className="text-slate-400">Wash</div>
                                        <div className="font-bold text-indigo-600">{prog.washReceivedQty}</div>
                                      </div>
                                      <div className="bg-slate-50 p-1 rounded">
                                        <div className="text-slate-400">Fin</div>
                                        <div className="font-bold text-purple-600">{prog.finQty}</div>
                                      </div>
                                      <div className="bg-slate-50 p-1 rounded">
                                        <div className="text-slate-400">QC</div>
                                        <div className="font-bold text-emerald-600">{prog.qcPassedQty}</div>
                                      </div>
                                      <div className="bg-slate-50 p-1 rounded">
                                        <div className="text-slate-400">Pack</div>
                                        <div className="font-bold text-amber-600">{prog.packedQty}</div>
                                      </div>
                                      <div className="bg-slate-50 p-1 rounded">
                                        <div className="text-slate-400">Ship</div>
                                        <div className="font-bold text-slate-800">{prog.shippedQty}</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Master Order Entry & Multi-PO / Colour Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedOrder ? `Edit Master Order (${selectedOrder.styleNo})` : 'New Master Order Booking'}
        maxWidth="4xl"
      >
        <form onSubmit={handleSaveOrder} className="space-y-4">
          {/* Master Style Details */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              1. Master Style Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Buyer Name *</label>
                <input
                  type="text"
                  list="buyer-suggestions"
                  value={buyer}
                  onChange={e => setBuyer(e.target.value)}
                  placeholder="e.g. H&M Global"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
                  required
                />
                <datalist id="buyer-suggestions">
                  {masterBuyers.map((b, idx) => (
                    <option key={idx} value={b} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Brand Name *</label>
                <input
                  type="text"
                  list="brand-suggestions"
                  placeholder="e.g. Divided"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
                  required
                />
                <datalist id="brand-suggestions">
                  {masterBrands.map((br, idx) => (
                    <option key={idx} value={br} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Style No *</label>
                <input
                  type="text"
                  placeholder="e.g. MJ-101"
                  value={styleNo}
                  onChange={e => setStyleNo(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-blue-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Style Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Mens Slim Fit Stretch Denim Pants"
                  value={styleName}
                  onChange={e => setStyleName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Garment Type</label>
                <select
                  value={garmentType}
                  onChange={e => setGarmentType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                >
                  {masterGarmentTypes.map((gt, idx) => (
                    <option key={idx} value={gt}>{gt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Season</label>
                <input
                  type="text"
                  list="season-suggestions"
                  value={season}
                  onChange={e => setSeason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
                <datalist id="season-suggestions">
                  {masterSeasons.map((sea, idx) => (
                    <option key={idx} value={sea} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Size Matrix Selector from Master Data */}
          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-indigo-600" />
                Active Size Matrix (Master Data Config):
              </span>
              <span className="text-[11px] text-indigo-700 font-semibold">
                Sizes: {activeSizes.join(', ')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {masterSizeMatrices.map(mat => {
                const isSelected = selectedMatrixId === mat.id || (!selectedMatrixId && activeSizes === mat.sizes);
                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => setSelectedMatrixId(mat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mat.name} ({mat.sizes.join(', ')})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multi-PO Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                2. Purchase Orders, Colours & Size Breakdown
              </h4>
              <button
                type="button"
                onClick={handleAddPO}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                + Add Purchase Order
              </button>
            </div>

            {formPOs.map((po, poIdx) => (
              <div key={poIdx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                {/* PO Header Fields */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-slate-800 text-white px-2 py-0.5 rounded">
                      PO #{poIdx + 1}
                    </span>
                    <input
                      type="text"
                      placeholder="PO Number (e.g. PO-5001)"
                      value={po.poNo}
                      onChange={e => {
                        const updated = [...formPOs];
                        updated[poIdx].poNo = e.target.value.toUpperCase();
                        setFormPOs(updated);
                      }}
                      className="text-xs font-bold border border-slate-300 rounded px-2.5 py-1 text-slate-900 w-36"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {formPOs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePO(poIdx)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove PO
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">PO Date</label>
                    <input
                      type="date"
                      value={po.poDate}
                      onChange={e => {
                        const updated = [...formPOs];
                        updated[poIdx].poDate = e.target.value;
                        setFormPOs(updated);
                      }}
                      className="w-full border border-slate-300 rounded p-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Delivery Date</label>
                    <input
                      type="date"
                      value={po.deliveryDate}
                      onChange={e => {
                        const updated = [...formPOs];
                        updated[poIdx].deliveryDate = e.target.value;
                        setFormPOs(updated);
                      }}
                      className="w-full border border-slate-300 rounded p-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Shipment Date</label>
                    <input
                      type="date"
                      value={po.shipmentDate}
                      onChange={e => {
                        const updated = [...formPOs];
                        updated[poIdx].shipmentDate = e.target.value;
                        setFormPOs(updated);
                      }}
                      className="w-full border border-slate-300 rounded p-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={po.unitPrice}
                      onChange={e => {
                        const updated = [...formPOs];
                        updated[poIdx].unitPrice = e.target.value === '' ? '' : Number(e.target.value);
                        setFormPOs(updated);
                      }}
                      className="w-full border border-slate-300 rounded p-1.5 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Colours & Sizes in this PO */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-600 flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5 text-indigo-500" />
                      Colours & Size Breakdown Matrix
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddColourToPO(poIdx)}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      + Add Colour
                    </button>
                  </div>

                  {po.colours.map((col, colIdx) => (
                    <div key={colIdx} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          list="colour-suggestions"
                          placeholder="Colour Name (e.g. Indigo Blue, White)"
                          value={col.colour}
                          onChange={e => {
                            const updated = [...formPOs];
                            updated[poIdx].colours[colIdx].colour = e.target.value;
                            setFormPOs(updated);
                          }}
                          className="flex-1 border border-slate-300 rounded p-1.5 text-xs font-bold text-slate-800"
                          required
                        />
                        <datalist id="colour-suggestions">
                          {masterColours.map((c, idx) => (
                            <option key={idx} value={c} />
                          ))}
                        </datalist>
                        <div className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                          Total: {(col.totalQty || 0).toLocaleString()} pcs
                        </div>
                        {po.colours.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveColourFromPO(poIdx, colIdx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Size Matrix Inputs from Master Data */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-1.5 pt-1">
                        {activeSizes.map(sz => (
                          <div key={sz} className="bg-slate-50 border border-slate-200 rounded p-1 text-center">
                            <span className="block text-[10px] font-bold text-slate-600 uppercase">{sz}</span>
                            <input
                              type="number"
                              min="0"
                              value={col.sizeQuantities?.[sz] ?? 0}
                              onChange={e => handleSizeQtyChange(poIdx, colIdx, sz, Number(e.target.value))}
                              className="w-full text-center text-xs font-bold border border-slate-300 rounded p-1 bg-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-4 shrink-0 z-10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
            >
              {isLoading ? 'Saving Master Order...' : selectedOrder ? 'Update Master Order' : 'Save Master Order to Supabase'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete Style "${orderToDelete?.styleNo}" and all linked purchase order data?`}
        confirmLabel={isLoading ? 'Deleting...' : 'Delete Master Order'}
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setOrderToDelete(null);
        }}
      />
    </div>
  );
};
