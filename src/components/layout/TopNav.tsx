import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  History,
  LogOut,
  ChevronDown,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useERP } from '../../context/ERPContext';

interface TopNavProps {
  onToggleMobileSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleMobileSidebar }) => {
  const { currentUser, logout } = useAuth();
  const {
    setIsSearchOpen,
    setIsAuditOpen,
    setIsSetupOpen,
    notifications,
    unreadNotificationCount,
    markNotificationRead
  } = useERP();

  const [isNotifPopoverOpen, setIsNotifPopoverOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="flex-shrink-0 flex h-12 w-full items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4 shadow-xs z-30">
      {/* Left side */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="rounded p-1 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Search Bar Button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500 hover:border-slate-300 hover:bg-slate-100 transition-colors w-44 sm:w-72"
        >
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <span className="truncate">Search Buyers, Styles, POs, Lines...</span>
          <kbd className="hidden sm:inline-block ml-auto rounded bg-white px-1 py-0.2 text-[9px] font-semibold text-slate-400 border border-slate-200">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Supabase Status / Setup Modal Trigger */}
        <button
          onClick={() => setIsSetupOpen(true)}
          title="Supabase System Setup & Status"
          className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/80 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
        >
          <Database className="h-3.5 w-3.5 text-emerald-600" />
          <span className="hidden md:inline">Supabase & Setup</span>
        </button>

        {/* Audit Log Trigger */}
        <button
          onClick={() => setIsAuditOpen(true)}
          title="View Audit Logs"
          className="flex items-center gap-1 rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <History className="h-3.5 w-3.5" />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsNotifPopoverOpen(!isNotifPopoverOpen)}
            className="relative rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white animate-pulse">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Notifications Popover */}
          {isNotifPopoverOpen && (
            <div className="absolute right-0 mt-1.5 w-80 rounded-md border border-slate-200 bg-white p-2.5 shadow-lg z-50">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-800">Factory Alerts & Notifications</h4>
                <span className="text-[10px] text-slate-400">{unreadNotificationCount} unread</span>
              </div>
              <div className="mt-1.5 max-h-64 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <p className="py-3 text-center text-xs text-slate-400">No active alerts</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                        n.read ? 'bg-white text-slate-600' : 'bg-blue-50/70 font-medium text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">{n.title}</span>
                        <span className="text-[9px] text-slate-400">{n.timestamp}</span>
                      </div>
                      <p className="mt-0.5 text-slate-600 text-[10px] leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 p-1 pl-1.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {currentUser?.name.substring(0, 2).toUpperCase() || 'MJ'}
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-bold text-slate-800 leading-none">{currentUser?.name}</p>
              <p className="text-[9px] text-slate-500 leading-tight mt-0.5">{currentUser?.role}</p>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 rounded-md border border-slate-200 bg-white p-2 shadow-lg z-50">
              <div className="px-2.5 py-1.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-500">{currentUser?.email}</p>
                <span className="mt-1 inline-block rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-semibold text-blue-800">
                  {currentUser?.department}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsSetupOpen(true);
                }}
                className="mt-1 flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Database className="h-3.5 w-3.5 text-emerald-600" />
                System & Setup
              </button>
              <button
                onClick={async () => {
                  setIsUserMenuOpen(false);
                  setIsSetupOpen(false);
                  await logout();
                }}
                className="mt-1 flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
