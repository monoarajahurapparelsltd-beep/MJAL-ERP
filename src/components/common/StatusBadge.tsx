import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeStyle = (val: string) => {
    const s = val.toLowerCase();
    if (['confirmed', 'active', 'approved', 'pass', 'completed', 'shipment complete', 'full received', 'paid', 'shipped'].some(k => s.includes(k))) {
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20';
    }
    if (['running', 'in progress', 'sent', 'washing', 'partial', 'day', 'present'].some(k => s.includes(k))) {
      return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
    }
    if (['pending', 'draft', 'revision required', 'hold', 'pending rework', 'ready'].some(k => s.includes(k))) {
      return 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20';
    }
    if (['cancelled', 'rejected', 'fail', 'inactive', 'delayed', 'absent'].some(k => s.includes(k))) {
      return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20';
    }
    return 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-400/20';
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight ${getBadgeStyle(status)}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80 shrink-0" />
      <span className="whitespace-nowrap">{status}</span>
    </span>
  );
};
