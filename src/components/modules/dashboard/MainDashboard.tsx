import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Shirt,
  Truck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Scissors,
  ClipboardCheck,
  Building2,
  Factory,
  Filter,
  DollarSign,
  Coins
} from 'lucide-react';
import { supabaseDataService } from '../../../services/supabaseDataService';
import { useAuth } from '../../../context/AuthContext';
import { canViewExecutiveOrderSummary } from '../../../utils/authUtils';
import { StatCard } from '../../common/StatCard';
import { StatusBadge } from '../../common/StatusBadge';
import { ExportPrintToolbar } from '../../common/ExportPrintToolbar';
import { StylePoColourProgressDashboard } from './StylePoColourProgressDashboard';
import { formatBDT, USD_TO_BDT_RATE } from '../../../utils/currencyUtils';

export const MainDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState(supabaseDataService.getOrders());
  const [sewing, setSewing] = useState(supabaseDataService.getSewingProduction());
  const [cutting, setCutting] = useState(supabaseDataService.getCuttingEntries());
  const [shipments, setShipments] = useState(supabaseDataService.getShipmentRecords());
  const [qc, setQc] = useState(supabaseDataService.getQCInspections());

  const [selectedBuyer, setSelectedBuyer] = useState('All');
  const [selectedStyle, setSelectedStyle] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  useEffect(() => {
    const updateState = () => {
      setOrders([...supabaseDataService.getOrders()]);
      setSewing([...supabaseDataService.getSewingProduction()]);
      setCutting([...supabaseDataService.getCuttingEntries()]);
      setShipments([...supabaseDataService.getShipmentRecords()]);
      setQc([...supabaseDataService.getQCInspections()]);
    };

    updateState();
    const unsub = supabaseDataService.subscribe(updateState);
    return unsub;
  }, []);

  // Metrics
  const totalOrderQty = orders.reduce((sum, o) => sum + (o.totalOrderQty || 0), 0);
  const totalRunningOrders = orders.filter(o => o.status === 'Running').length;
  const totalOrderValueUSD = orders.reduce((sum, o) => sum + (o.totalOrderValue || 0), 0);
  const totalOrderValueBDT = totalOrderValueUSD * USD_TO_BDT_RATE;
  const bdtFormatted = formatBDT(totalOrderValueBDT);

  // Total sewing output today
  const todaySewingOutput = sewing.reduce((sum, s) => sum + (s.totalOutput || 0), 0);
  const todaySewingTarget = sewing.reduce((sum, s) => sum + (s.dailyTarget || 0), 0);
  const sewingAchievement = todaySewingTarget > 0 ? Math.round((todaySewingOutput / todaySewingTarget) * 100) : 0;

  const totalShippedQty = shipments.reduce((sum, s) => sum + (s.shippedQty || 0), 0);
  const shipmentRate = totalOrderQty > 0 ? Math.round((totalShippedQty / totalOrderQty) * 100) : 0;

  // Average QC Pass rate
  const totalQCInspected = qc.reduce((sum, q) => sum + (q.inspectedQty || 0), 0);
  const totalQCPassed = qc.reduce((sum, q) => sum + (q.passedQty || 0), 0);
  const qcPassRate = totalQCInspected > 0 ? Math.round((totalQCPassed / totalQCInspected) * 100) : 100;

  // Filter options
  const uniqueBuyers = Array.from(new Set(orders.map(o => o.buyer))).filter(Boolean);
  const uniqueStyles = Array.from(new Set(orders.map(o => o.styleNo))).filter(Boolean);

  const filteredOrders = orders.filter(o => {
    if (selectedBuyer !== 'All' && o.buyer !== selectedBuyer) return false;
    if (selectedStyle !== 'All' && o.styleNo !== selectedStyle) return false;
    if (selectedStatus !== 'All' && o.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white shadow-md border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600/30 border border-blue-400/30 text-blue-400">
              <Factory className="h-3.5 w-3.5" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300">Monoara Jahur Apparels Ltd.</span>
            <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[8px] font-bold text-blue-300 border border-blue-400/30">MJAL ERP</span>
          </div>
          <h1 className="text-xl font-black tracking-tight mt-1 font-sans">Factory Operational Dashboard</h1>
          <p className="text-xs text-slate-300 mt-0.5 font-medium">Live Database Synchronized Order, Production & Progress Tracking</p>
        </div>
        <ExportPrintToolbar
          title="Main Factory Report"
          data={orders.map(o => ({
            StyleNo: o.styleNo,
            Buyer: o.buyer,
            GarmentType: o.garmentType,
            OrderQty: o.totalOrderQty,
            ValueUSD: o.totalOrderValue,
            ValueBDT: o.totalOrderValue * USD_TO_BDT_RATE,
            Status: o.status
          }))}
          filename="factory_summary"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <StatCard
          title="Total Order Volume"
          value={`${totalOrderQty.toLocaleString()} pcs`}
          subtitle={`${orders.length} Styles | ${totalRunningOrders} Running`}
          icon={ShoppingBag}
          variant="blue"
        />
        <StatCard
          title="Order Value (BDT)"
          value={bdtFormatted.display}
          subtitle={bdtFormatted.isCrore ? `Full: ${bdtFormatted.fullAmount}` : `$${totalOrderValueUSD.toLocaleString()} USD (@ ৳120)`}
          trend={bdtFormatted.isCrore ? `$${(totalOrderValueUSD / 1000).toFixed(0)}k USD` : `@ ৳120 Rate`}
          trendType="neutral"
          icon={Coins}
          variant="amber"
        />
        <StatCard
          title="Daily Sewing Production"
          value={`${todaySewingOutput.toLocaleString()} pcs`}
          subtitle={`Target: ${todaySewingTarget.toLocaleString()} pcs (${sewingAchievement}%)`}
          trend={`${sewingAchievement}%`}
          trendType={sewingAchievement >= 90 ? 'positive' : 'negative'}
          icon={Shirt}
          variant="indigo"
        />
        <StatCard
          title="QC Inspection Pass Rate"
          value={`${qcPassRate}%`}
          subtitle={`Inspected: ${totalQCInspected} pcs | Passed: ${totalQCPassed} pcs`}
          trend={qcPassRate >= 95 ? 'High Quality' : 'Needs Rework'}
          trendType={qcPassRate >= 95 ? 'positive' : 'negative'}
          icon={ClipboardCheck}
          variant="emerald"
        />
        <StatCard
          title="Shipped Volume"
          value={`${totalShippedQty.toLocaleString()} pcs`}
          subtitle={`Shipment Rate: ${shipmentRate}%`}
          trend={`${shipmentRate}% Completed`}
          trendType="neutral"
          icon={Truck}
          variant="cyan"
        />
      </div>

      {/* Production Pipeline Progress per Style & PO (Management / Global Users Only) */}
      {canViewExecutiveOrderSummary(currentUser) && (
        <StylePoColourProgressDashboard
          embedded={true}
          title="Order & Production Progress Engine"
          subtitle="Live Department-wise Balance & Pipeline for Active Styles, POs & Colours"
        />
      )}
    </div>
  );
};

