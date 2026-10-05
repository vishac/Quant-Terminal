import React, { useState } from 'react';
import { 
  Users, 
  ShieldAlert, 
  Power, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Search, 
  Filter, 
  UserCheck, 
  AlertTriangle, 
  Sliders, 
  ArrowRightLeft, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Briefcase
} from 'lucide-react';
import { useDeskAuth } from '../context/DeskAuthContext';
import { DeskTraderSeat, UserDeskRole } from '../types/quant';

export const MultiUserDesk: React.FC = () => {
  const {
    currentSeat,
    seats,
    globalKillSwitch,
    recentOrders,
    switchSeat,
    updateSeatCapital,
    toggleSeatKillSwitch,
    toggleGlobalDeskKillSwitch,
    updateSeatRole,
    placeDeskOrder,
    setIsAuthModalOpen
  } = useDeskAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [selectedSeatForEdit, setSelectedSeatForEdit] = useState<DeskTraderSeat | null>(null);
  const [editCapitalInput, setEditCapitalInput] = useState('');
  const [editRoleInput, setEditRoleInput] = useState<UserDeskRole>('quant_trader');

  // Quick Order form state
  const [orderSymbol, setOrderSymbol] = useState('NIFTY 25000 CE');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderProduct, setOrderProduct] = useState('FNO_OPT_BUY');
  const [orderQty, setOrderQty] = useState(75);
  const [orderPrice, setOrderPrice] = useState(135.0);
  const [orderNotice, setOrderNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Filter seats
  const filteredSeats = seats.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.desk.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `seat ${s.seatNumber}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || s.role.toUpperCase() === roleFilter.toUpperCase();
    return matchesSearch && matchesRole;
  });

  // Calculate desk-wide aggregates across all 20 seats
  const totalDeskCapital = seats.reduce((acc, s) => acc + s.allocatedCapitalINR, 0);
  const totalMarginUsed = seats.reduce((acc, s) => acc + s.marginUsedINR, 0);
  const netDeskPnl = seats.reduce((acc, s) => acc + s.dayPnlINR, 0);
  const activeSeatsCount = seats.filter((s) => s.status === 'active' && !s.killSwitchActive).length;
  const trippedSeatsCount = seats.filter((s) => s.killSwitchActive).length;

  const handleOpenEditModal = (seat: DeskTraderSeat) => {
    setSelectedSeatForEdit(seat);
    setEditCapitalInput(String(seat.allocatedCapitalINR));
    setEditRoleInput(seat.role);
  };

  const handleSaveEdit = async () => {
    if (!selectedSeatForEdit) return;
    const cap = parseFloat(editCapitalInput);
    if (!isNaN(cap) && cap >= 0) {
      await updateSeatCapital(selectedSeatForEdit.seatNumber, cap);
    }
    if (editRoleInput !== selectedSeatForEdit.role) {
      await updateSeatRole(selectedSeatForEdit.seatNumber, editRoleInput);
    }
    setSelectedSeatForEdit(null);
  };

  const handleExecuteQuickOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOrder(true);
    setOrderNotice(null);

    const res = await placeDeskOrder({
      symbol: orderSymbol,
      side: orderSide,
      productType: orderProduct,
      qty: orderQty,
      price: orderPrice,
    });

    setIsSubmittingOrder(false);
    if (res.success && res.order) {
      setOrderNotice({
        text: `Order ${res.order.id} executed for Seat-${res.order.seatNumber} (${res.order.traderName}): ${res.order.side} ${res.order.qty} ${res.order.symbol} @ ₹${res.order.price}`,
      });
      setTimeout(() => setOrderNotice(null), 5000);
    } else {
      setOrderNotice({ text: res.error || 'Order rejected by Risk Engine.', error: true });
    }
  };

  const fmtInr = (n: number) => {
    if (Math.abs(n) >= 10000000) {
      return `₹${(n / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(n) >= 100000) {
      return `₹${(n / 100000).toFixed(2)} L`;
    }
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  };

  const getRoleBadge = (role: UserDeskRole) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300">ADMIN / HEAD</span>;
      case 'risk_officer':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 border border-rose-500/40 text-rose-300">RISK OFFICER</span>;
      case 'quant_trader':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">QUANT TRADER</span>;
      case 'analyst':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">ANALYST</span>;
    }
  };

  return (
    <div className="space-y-6 font-mono text-slate-200" data-testid="multi-user-desk">
      
      {/* Top Banner: 20-Seat Institutional Quant Desk Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#070d18] via-[#091322] to-[#08101e] border border-cyan-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                20-SEAT PROPRIETARY QUANT DESK
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                FIRESTORE MULTI-USER CLUSTER
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Users className="w-6 h-6 text-cyan-400" />
              <span>Institutional Multi-Trader Desk</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Real-time multi-seat quant floor monitoring 20 active trader allocations, cross-seat margin utilization,
              independent kill-switches, and unified desk order routing with role-based access control.
            </p>
          </div>

          {/* Master Desk Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Seat Auth & Login</span>
            </button>

            {/* Master Global Desk Kill Switch */}
            <button
              onClick={() => toggleGlobalDeskKillSwitch(!globalKillSwitch)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 border ${
                globalKillSwitch
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 animate-pulse shadow-rose-900/40'
                  : 'bg-slate-900 hover:bg-rose-950/60 text-rose-300 border-rose-500/30 hover:border-rose-500/60'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{globalKillSwitch ? 'GLOBAL KILL-SWITCH TRIPPED' : 'MASTER DESK KILL-SWITCH'}</span>
            </button>
          </div>
        </div>

        {/* Global Desk Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Desk Capital</span>
            <span className="text-base sm:text-lg font-black text-cyan-300 mt-0.5 block">{fmtInr(totalDeskCapital)}</span>
            <span className="text-[10px] text-slate-500">20 Dedicated Trader Seats</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Margin Deployed</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-base sm:text-lg font-black text-amber-300">{fmtInr(totalMarginUsed)}</span>
              <span className="text-xs text-slate-400">({totalDeskCapital > 0 ? ((totalMarginUsed / totalDeskCapital) * 100).toFixed(1) : 0}%)</span>
            </div>
            <span className="text-[10px] text-slate-500">Aggregate Intraday Exposure</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Net Desk Day P&L</span>
            <div className="flex items-center gap-1 mt-0.5">
              {netDeskPnl >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
              <span className={`text-base sm:text-lg font-black ${netDeskPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netDeskPnl >= 0 ? '+' : ''}{fmtInr(netDeskPnl)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">Real-time combined P&L</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Floor Status</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-base sm:text-lg font-black text-white">{activeSeatsCount} / 20</span>
              <span className="text-xs text-emerald-400 font-bold">ONLINE</span>
            </div>
            <span className="text-[10px] text-slate-500">{trippedSeatsCount > 0 ? `${trippedSeatsCount} seats halted` : 'All seats healthy'}</span>
          </div>
        </div>
      </div>

      {/* Current Operator Seat Banner */}
      <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-900/60 border border-cyan-400/40 flex items-center justify-center font-bold text-cyan-300 text-sm">
            #{String(currentSeat.seatNumber).padStart(2, '0')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 uppercase">Current Active Operator:</span>
              <span className="text-sm font-bold text-white">{currentSeat.name}</span>
              {getRoleBadge(currentSeat.role)}
            </div>
            <span className="text-xs text-slate-400 font-sans">
              Desk: <span className="text-cyan-300 font-mono font-medium">{currentSeat.desk}</span> &bull; Capital: {fmtInr(currentSeat.allocatedCapitalINR)} &bull; Day P&L: <span className={currentSeat.dayPnlINR >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{currentSeat.dayPnlINR >= 0 ? '+' : ''}{fmtInr(currentSeat.dayPnlINR)}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Quick Seat Switch:</span>
          <select
            value={currentSeat.seatNumber}
            onChange={(e) => switchSeat(parseInt(e.target.value, 10))}
            className="bg-slate-950 border border-cyan-500/40 text-cyan-200 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none cursor-pointer focus:border-cyan-400"
          >
            {seats.map((s) => (
              <option key={s.seatNumber} value={s.seatNumber}>
                Seat {String(s.seatNumber).padStart(2, '0')}: {s.name} ({s.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Floor Grid: 20 Trader Seats Matrix */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              <span>Floor Matrix (20 Seats)</span>
            </h2>
            <span className="text-xs text-slate-400">({filteredSeats.length} shown)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trader, seat, desk…"
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 w-48 sm:w-56"
              />
            </div>

            {/* Role Filter Buttons */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px]">
              {['ALL', 'ADMIN', 'RISK_OFFICER', 'QUANT_TRADER', 'ANALYST'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                    roleFilter === r ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 20 Seats Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredSeats.map((seat) => {
            const isCurrent = seat.seatNumber === currentSeat.seatNumber;
            const marginPct = seat.allocatedCapitalINR > 0 ? (seat.marginUsedINR / seat.allocatedCapitalINR) * 100 : 0;

            return (
              <div
                key={seat.seatNumber}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between relative ${
                  seat.killSwitchActive
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : isCurrent
                    ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.12)]'
                    : 'bg-[#090f1d] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Seat Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
                        isCurrent ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-cyan-300'
                      }`}>
                        SEAT {String(seat.seatNumber).padStart(2, '0')}
                      </span>
                      {seat.killSwitchActive ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-900/80 text-rose-300 border border-rose-500/40">
                          HALTED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ACTIVE
                        </span>
                      )}
                    </div>

                    {getRoleBadge(seat.role)}
                  </div>

                  {/* Trader Info */}
                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-white truncate">{seat.name}</h3>
                    <p className="text-[11px] text-cyan-400 truncate mt-0.5">{seat.desk}</p>
                    <p className="text-[10px] text-slate-500 truncate">{seat.email}</p>
                  </div>

                  {/* Financial Stats */}
                  <div className="space-y-2 py-2 border-t border-b border-slate-800/80 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[11px]">Allocated Capital:</span>
                      <span className="font-bold text-slate-200">{fmtInr(seat.allocatedCapitalINR)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[11px]">Margin Utilized:</span>
                      <span className="font-bold text-amber-300">{fmtInr(seat.marginUsedINR)} ({marginPct.toFixed(0)}%)</span>
                    </div>

                    {/* Margin Progress Bar */}
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          marginPct > 85 ? 'bg-rose-500' : marginPct > 60 ? 'bg-amber-400' : 'bg-cyan-400'
                        }`}
                        style={{ width: `${Math.min(100, marginPct)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-400 text-[11px]">Day Realized P&L:</span>
                      <span className={`font-bold ${seat.dayPnlINR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {seat.dayPnlINR >= 0 ? '+' : ''}{fmtInr(seat.dayPnlINR)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>Positions: {seat.activePositionsCount}</span>
                      <span>Active: {seat.lastActive}</span>
                    </div>
                  </div>
                </div>

                {/* Seat Action Buttons */}
                <div className="mt-3 pt-2 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => switchSeat(seat.seatNumber)}
                    disabled={isCurrent}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-default ${
                      isCurrent
                        ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-950 hover:bg-cyan-900/40 text-slate-300 hover:text-cyan-200 border border-slate-800 hover:border-cyan-500/30'
                    }`}
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>{isCurrent ? 'Current Seat' : 'Assume Seat'}</span>
                  </button>

                  {/* Individual Seat Kill Switch */}
                  <button
                    onClick={() => toggleSeatKillSwitch(seat.seatNumber, 'Manual Risk Officer Trip')}
                    title={seat.killSwitchActive ? 'Resume Trader Trading' : 'Halt Trader Trading (Kill Switch)'}
                    className={`p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                      seat.killSwitchActive
                        ? 'bg-rose-900/80 border-rose-500 text-rose-200 hover:bg-rose-800'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  {/* Edit Seat Modal Button */}
                  <button
                    onClick={() => handleOpenEditModal(seat)}
                    title="Edit Trader Capital & Role"
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Quick Order Terminal for Active Seat + Live Multi-Trader Order Tape */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Quick Order Dock attributed to current Seat */}
        <div className="p-5 rounded-2xl bg-[#090f1d] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-cyan-400" />
                <span>Seat-{currentSeat.seatNumber} Execution Terminal</span>
              </h3>
              <span className="text-[10px] text-cyan-400 font-bold">{currentSeat.name}</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
              Formulate orders with real-time attribution to <strong className="text-slate-200">{currentSeat.name}</strong>. Margin and risk limits are checked per-seat.
            </p>

            <form onSubmit={handleExecuteQuickOrder} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Contract / Symbol</label>
                <select
                  value={orderSymbol}
                  onChange={(e) => setOrderSymbol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="NIFTY 25000 CE">NIFTY 25000 CE (ATM)</option>
                  <option value="NIFTY 24800 PE">NIFTY 24800 PE</option>
                  <option value="BANKNIFTY 52000 PE">BANKNIFTY 52000 PE</option>
                  <option value="RELIANCE">RELIANCE (Cash Equity)</option>
                  <option value="HDFCBANK">HDFCBANK (Cash Equity)</option>
                  <option value="TCS">TCS (Cash Equity)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Side</label>
                  <div className="flex rounded-lg overflow-hidden border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setOrderSide('BUY')}
                      className={`flex-1 py-1.5 text-xs font-bold transition cursor-pointer ${
                        orderSide === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderSide('SELL')}
                      className={`flex-1 py-1.5 text-xs font-bold transition cursor-pointer ${
                        orderSide === 'SELL' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Product</label>
                  <select
                    value={orderProduct}
                    onChange={(e) => setOrderProduct(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="FNO_OPT_BUY">Option Buy</option>
                    <option value="FNO_OPT_SELL">Option Sell (Span)</option>
                    <option value="EQUITY_INTRADAY">Equity Intraday</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={orderQty}
                    onChange={(e) => setOrderQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
                <span>Estimated Notional:</span>
                <span className="font-bold text-cyan-300">₹{(orderQty * orderPrice).toLocaleString('en-IN')}</span>
              </div>

              {orderNotice && (
                <div
                  className={`p-2.5 rounded-lg text-xs border ${
                    orderNotice.error
                      ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                      : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {orderNotice.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingOrder || currentSeat.killSwitchActive || globalKillSwitch}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
              >
                {isSubmittingOrder ? 'Routing to Desk…' : `Route Order via Seat-${currentSeat.seatNumber}`}
              </button>
            </form>
          </div>
        </div>

        {/* Live Multi-Trader Order Tape */}
        <div className="p-5 rounded-2xl bg-[#090f1d] border border-slate-800 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Live Multi-Seat Floor Order Tape</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">REAL-TIME CLUSTER FEED</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Live audit stream of orders routed across the 20 institutional trader seats with risk clearance status:
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono gap-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-[10px] text-slate-500 shrink-0">{ord.timestamp}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                      SEAT {String(ord.seatNumber).padStart(2, '0')}
                    </span>
                    <span className="text-slate-300 font-semibold truncate max-w-[110px]">{ord.traderName}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      ord.side === 'BUY' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                    }`}>
                      {ord.side}
                    </span>
                    <span className="text-white font-bold truncate">{ord.symbol}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-400 text-[11px]">{ord.qty} qty @ ₹{ord.price}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Seat Modal (Admin / Capital Allocation) */}
      {selectedSeatForEdit && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono animate-in fade-in duration-150">
          <div className="bg-[#080d1a] border border-cyan-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Configure Seat {String(selectedSeatForEdit.seatNumber).padStart(2, '0')}: {selectedSeatForEdit.name}
              </h3>
              <button
                onClick={() => setSelectedSeatForEdit(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Desk Assignment</label>
                <input
                  type="text"
                  disabled
                  value={selectedSeatForEdit.desk}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Allocated Capital (INR)</label>
                <input
                  type="number"
                  value={editCapitalInput}
                  onChange={(e) => setEditCapitalInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Current: {fmtInr(parseFloat(editCapitalInput) || 0)}</span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Institutional Role</label>
                <select
                  value={editRoleInput}
                  onChange={(e) => setEditRoleInput(e.target.value as UserDeskRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="admin">Admin / Head of Quant Desk</option>
                  <option value="risk_officer">Risk Officer</option>
                  <option value="quant_trader">Quant Trader</option>
                  <option value="analyst">Analyst / Viewer</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedSeatForEdit(null)}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
              >
                Save Allocation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
