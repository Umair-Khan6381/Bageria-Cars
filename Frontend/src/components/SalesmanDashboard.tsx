/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Car, 
  DollarSign, 
  Calendar, 
  Clock, 
  Activity, 
  Sparkles, 
  Plus, 
  Search, 
  Check, 
  Copy, 
  ArrowUpRight,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Award
} from 'lucide-react';
import { User, Customer, InstallmentPlan, Payment } from '../types';

interface SalesmanDashboardProps {
  currentUser: User | null;
  customers: Customer[];
  installments: InstallmentPlan[];
  payments: Payment[];
  summary: {
    totalVehiclesSold: number;
    totalInstallmentCustomers: number;
    totalCashCustomers: number;
    totalPendingRecovery: number;
    totalReceivedAmount: number;
    monthlyCollection: number;
    overdueInstallments: number;
    revenueGenerated?: number;
    monthlySalesCount?: number;
    activeCustomersCount?: number;
  };
  onNavigate: (tab: string) => void;
}

export default function SalesmanDashboard({
  currentUser,
  customers,
  installments,
  payments,
  summary,
  onNavigate
}: SalesmanDashboardProps) {
  // States
  const [salesmanSearch, setSalesmanSearch] = useState('');
  const [draftingPlanId, setDraftingPlanId] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Filter Salesman's own customers & plans (linked key salesmanId matches currentUser.id)
  const myPlans = installments; // Already filtered on the backend if role is Salesman
  const myCustomers = customers; // Already filtered on the backend if role is Salesman

  // Filter my customers based on local salesman search matching: Name, Phone, Vehicle Number, Engine Number, Chassis Number
  const filteredMyCustomers = myCustomers.filter(c => {
    if (!salesmanSearch.trim()) return true;
    const q = salesmanSearch.toLowerCase().trim();
    
    // Find associated vehicles for engine/chassis/reg number matching
    const matchingPlans = myPlans.filter(p => p.customerId === c.id);
    const hasMatchingVehicle = matchingPlans.some(p => 
      p.vehicleNumber.toLowerCase().includes(q) || 
      p.vehicleName.toLowerCase().includes(q)
    );

    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.cnic.includes(q) ||
      hasMatchingVehicle
    );
  });

  // Calculate stats
  const totalVehiclesSold = summary.totalVehiclesSold || 0;
  const totalInstallmentSales = summary.totalInstallmentCustomers || 0;
  const totalCashSales = summary.totalCashCustomers || 0;
  const revenueGenerated = summary.revenueGenerated || 0;
  const monthlySalesCount = summary.monthlySalesCount || 0;
  const activeCustomersCount = summary.activeCustomersCount || 0;
  const pendingFollowupsCount = summary.overdueInstallments || 0;

  // Trigger Gemini outreach whatsapp draft
  const handleAIReminder = async (plan: InstallmentPlan) => {
    setDraftingPlanId(plan.id);
    setAiDraft('Generating draft via Gemini...');
    setCopied(false);
    setAiLoading(true);

    try {
      const resp = await fetch('/api/ai/draft-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: plan.customerName,
          balance: plan.balance,
          nextDueDate: plan.nextDueDate,
          monthlyInstallment: plan.monthlyInstallment,
          vehicleName: plan.vehicleName,
          isOverdue: plan.status === 'Overdue' || plan.status === 'Defaulter'
        })
      });
      const data = await resp.json();
      setAiDraft(data.draft);
    } catch (e) {
      setAiDraft('Failed to contact Gemini Outreach engine. Fallback reminder:\n\n*Baheria Motors Recovery Outreach*\n\nDear customer, this is a friendly payment prompt to remind you about the upcoming/overdue installment of Rs.' + plan.monthlyInstallment.toLocaleString() + ' on your vehicle.');
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aiDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Sales Head Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 p-8 transform translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
          <Car size={320} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="bg-[#af9268]/20 text-[#c5a880] border border-[#af9268]/30 font-semibold px-3 py-1 rounded-full text-xs uppercase tracking-wider font-mono">
              Authorized Sales Agent Session
            </span>
            <h1 className="text-3xl font-bold font-display mt-2 tracking-tight">
              Aura Dashboard: {currentUser?.name || 'Showroom Salesman'}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl font-sans">
              Welcome to your dedicated workspace. Track your customer registrations, record cash and installment sales, and manage payment follow-ups securely.
            </p>
          </div>
          <button 
            id="btn-salesman-new-sale"
            onClick={() => onNavigate('installments')}
            className="bg-[#af9268] hover:bg-[#997d57] text-[#111113] font-extrabold font-mono uppercase tracking-wider px-5 py-2.5 rounded-xl transition shadow-lg shrink-0 flex items-center gap-2 text-xs border border-[#af9268]/15"
          >
            Create New Sale / Plan
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>

      {/* Salesman Performance Metrics Strip */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shadow-inner">
              <Award size={24} className="stroke-[2.5]" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-mono block">Performance Milestone</span>
              <h2 className="text-xl font-extrabold text-white">Your Performance Ledger</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full md:w-auto">
            <div className="bg-slate-950/30 border border-slate-800/80 px-6 py-3 rounded-xl min-w-[200px]">
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-mono block">Revenue Generated</span>
              <span className="text-2xl font-black text-indigo-400 font-mono block mt-1">Rs. {revenueGenerated.toLocaleString()}</span>
            </div>
            <div className="bg-slate-950/30 border border-slate-800/80 px-6 py-3 rounded-xl min-w-[150px]">
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-mono block">This Month Sales</span>
              <span className="text-2xl font-black text-emerald-400 font-mono block mt-1">{monthlySalesCount} Deals</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Salesman Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Vehicles Sold */}
        <div className="bg-[#111113] border border-[#2e2e33] p-5 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehicles Sold</span>
            <span className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
              <Car size={14} />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white font-mono-fig leading-none">
              {totalVehiclesSold} <span className="text-xs text-slate-400 font-normal font-sans">Units</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Aggregate logged sales</p>
          </div>
        </div>

        {/* Installment Sales */}
        <div className="bg-[#111113] border border-[#2e2e33] p-5 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Installments</span>
            <span className="p-1.5 bg-[#af9268]/15 text-[#c5a880] border border-[#af9268]/20 rounded-lg">
              <TrendingUp size={14} />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white font-mono-fig leading-none">
              {totalInstallmentSales} <span className="text-xs text-slate-400 font-normal font-sans">Plans</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Active payment schedules</p>
          </div>
        </div>

        {/* Cash Sales */}
        <div className="bg-[#111113] border border-[#2e2e33] p-5 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Deals</span>
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
              <DollarSign size={14} />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white font-mono-fig leading-none">
              {totalCashSales} <span className="text-xs text-slate-400 font-normal font-sans">Sold</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Fully upfront payments</p>
          </div>
        </div>

        {/* Active Customers */}
        <div className="bg-[#111113] border border-[#2e2e33] p-5 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Clients</span>
            <span className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
              <Users size={14} />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white font-mono-fig leading-none">
              {activeCustomersCount} <span className="text-xs text-slate-400 font-normal font-sans">Active</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Ongoing financed balances</p>
          </div>
        </div>

        {/* Monthly Sales Count */}
        <div className="bg-[#111113] border border-[#2e2e33] p-5 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Month</span>
            <span className="p-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg">
              <Calendar size={14} />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white font-mono-fig leading-none">
              {monthlySalesCount} <span className="text-xs text-slate-400 font-normal font-sans">Sold</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">In {new Date().toLocaleString('default', { month: 'long' })}</p>
          </div>
        </div>

        {/* Pending Follow-ups */}
        <div className={`border p-5 rounded-2xl shadow-sm transition ${pendingFollowupsCount > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-[#111113] border-[#2e2e33]'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Follow-Ups</span>
            <span className={`p-1.5 rounded-lg ${pendingFollowupsCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
              <Clock size={14} />
            </span>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-black font-mono-fig leading-none ${pendingFollowupsCount > 0 ? 'text-rose-450 text-rose-400' : 'text-white'}`}>
              {pendingFollowupsCount} <span className="text-xs font-normal font-sans">Due</span>
            </h3>
            <p className="text-[10px] text-rose-400 mt-1 font-bold">Overdue / Defaulter plans</p>
          </div>
        </div>
      </div>

      {/* Main Section Separations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column Section: Search My Customers & Payment Status Check */}
        <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[#2e2e33] pb-3">
            <div>
              <h4 className="font-bold text-white font-display">My Registered Customers</h4>
              <p className="text-[11px] text-slate-450 text-slate-400">Search only your assigned customers by name, phone, or vehicle number.</p>
            </div>
            <span className="text-[11px] bg-[#af9268]/15 border border-[#af9268]/20 px-2.5 py-1 text-[#c5a880] rounded font-semibold max-sm:hidden">
              Isolated Ledger
            </span>
          </div>

          {/* Scoped Search Input */}
          <div className="flex items-center gap-3 bg-[#161619] border border-[#2e2e33] focus-within:border-[#af9268] px-4 py-2.5 rounded-xl text-xs shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.6)]">
            <Search size={15} className="text-[#c5a880] shrink-0" />
            <input 
              type="text"
              placeholder="Filter by Customer name, Phone, CNIC or Vehicle chassis..."
              value={salesmanSearch}
              onChange={(e) => setSalesmanSearch(e.target.value)}
              className="bg-transparent outline-none text-white placeholder-slate-500 w-full font-medium"
            />
          </div>

          {/* Customers payment status list */}
          {filteredMyCustomers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs text-slate-400 bg-slate-950/20 rounded-xl border border-[#2e2e33]/50">
              No matching customers registered in your portfolio database yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#161619] text-[#c5a880] uppercase tracking-wider text-[10px] border-b border-[#2e2e33]">
                  <tr>
                    <th className="py-3 px-4 rounded-l-lg">Customer</th>
                    <th className="py-3 px-4">Contact spec</th>
                    <th className="py-3 px-4">Deals Portfolio</th>
                    <th className="py-3 px-4 rounded-r-lg text-right">Payment Stands</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e21]">
                  {filteredMyCustomers.map((cust) => {
                    // Match plans for this customer
                    const plans = myPlans.filter(p => p.customerId === cust.id);
                    return (
                      <tr key={cust.id} className="hover:bg-[#1a1a1d] transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block">{cust.name}</span>
                          <span className="text-[10px] text-slate-405 text-slate-500 block">S/O {cust.fatherName || 'N/A'}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono select-all">
                          <span className="block">{cust.phone}</span>
                          <span className="text-[10px] text-slate-505 text-slate-500 block">CNIC: {cust.cnic}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {plans.length === 0 ? (
                            <span className="text-slate-505 text-slate-500 italic text-[11px] block">No deal completed yet</span>
                          ) : (
                            plans.map(p => (
                              <div key={p.id} className="mb-1 last:mb-0">
                                <span className="font-semibold text-white block">{p.vehicleName}</span>
                                <span className={`inline-block text-[8px] font-bold uppercase rounded-md px-1.5 py-0.5 mt-0.5 ${p.saleType === 'Cash' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-indigo-505/10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/10'}`}>{p.saleType || 'Installment'} sale</span>
                              </div>
                            ))
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {plans.length === 0 ? (
                            <span className="text-slate-500 text-[10px] uppercase font-bold">-</span>
                          ) : (
                            plans.map(p => (
                              <div key={p.id} className="mb-1.5">
                                {p.status === 'Completed' ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded uppercase font-bold inline-block leading-tight">Paid Off</span>
                                ) : (
                                  <div className="inline-flex flex-col items-end">
                                    <span className="text-white font-mono font-bold block">Bal: Rs. {p.balance.toLocaleString()}</span>
                                    <span className={`inline-block text-[8px] font-extrabold uppercase rounded px-1.5 py-0.2 mt-0.5 ${
                                      p.status === 'Defaulter' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
                                      p.status === 'Overdue' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                    }`}>
                                      {p.status}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column Section: Pending Overdue Follow-ups queue */}
        <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#2e2e33] pb-3">
            <div>
              <h4 className="font-bold text-white font-display">Active Follow-up Queue</h4>
              <p className="text-[11px] text-slate-400">Critical payment defaults requiring prompt salesman outreach.</p>
            </div>
          </div>

          {/* List of outstanding payment defaulters under my account */}
          {myPlans.filter(p => p.status === 'Overdue' || p.status === 'Defaulter').length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs leading-relaxed bg-slate-950/20 border border-dashed border-[#2e2e33] rounded-xl">
              <Check className="w-8 h-8 text-emerald-400 mx-auto bg-emerald-500/5 p-1 rounded-full border border-emerald-500/15 mb-2 animate-bounce animate-duration-1000" />
              <h5 className="font-bold text-white text-[12px]">All Payments Cleared!</h5>
              <p className="max-w-[180px] mx-auto text-[10px] text-slate-500 mt-1">None of your assigned customer accounts are currently flag-overdue.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {myPlans.filter(p => p.status === 'Overdue' || p.status === 'Defaulter').map((plan) => (
                <div key={plan.id} className="border border-slate-800 hover:border-indigo-900 bg-slate-950/30 p-3 rounded-xl hover:bg-slate-950/50 transition">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h5 className="text-xs font-bold text-white block">{plan.customerName}</h5>
                      <span className="text-[11px] text-slate-400 block">{plan.vehicleName}</span>
                      <span className="text-[9px] text-slate-500 block font-mono mt-0.5">Next Due: <strong className="text-rose-450 text-rose-400">{plan.nextDueDate}</strong></span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold font-mono text-white block">Rs. {plan.monthlyInstallment.toLocaleString()}</span>
                      <span className={`inline-block text-[8px] font-black uppercase rounded px-1.5 py-0.2 mt-1 ${
                        plan.status === 'Defaulter' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25' : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                  </div>

                  {/* Outreach Button triggering Gemini */}
                  <div className="mt-3.5 pt-2.5 border-t border-dashed border-slate-800/85 flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 block font-mono">
                      Liability: Rs. {plan.balance.toLocaleString()}
                    </span>
                    <button
                      id={`btn-sales-outreach-remind-${plan.id}`}
                      onClick={() => handleAIReminder(plan)}
                      className="text-[10px] flex items-center gap-1.5 font-bold uppercase tracking-wide text-indigo-400 hover:text-indigo-300 transition py-1 px-2 rounded bg-indigo-500/5 hover:bg-indigo-500/15 border border-indigo-500/20"
                    >
                      <Sparkles size={11} className="text-indigo-400" />
                      Gemini Outreach
                    </button>
                  </div>

                  {/* AI drafting details inside follow up widget */}
                  {draftingPlanId === plan.id && (
                    <div className="mt-3.5 bg-slate-950 text-slate-250 border border-slate-800/90 p-3 rounded-lg text-[10px] text-left space-y-2 select-text font-sans shadow-md relative">
                      <div className="flex items-center justify-between text-[9px] text-indigo-400 font-bold border-b border-slate-800 pb-1.5 select-none">
                        <span className="flex items-center gap-1 uppercase tracking-wider">
                          <Sparkles size={11} className="text-indigo-400" />
                          Outreach Template Drafted
                        </span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={copyToClipboard}
                            className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 hover:text-white rounded"
                          >
                            {copied ? 'Copied ✓' : 'Copy'}
                          </button>
                          <button onClick={() => setDraftingPlanId(null)} className="text-slate-500 hover:text-slate-350">
                            ✕
                          </button>
                        </div>
                      </div>
                      <p className="whitespace-pre-line leading-relaxed font-mono select-all text-slate-300">
                        {aiDraft}
                      </p>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Your Own Sales Transaction History */}
      <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h4 className="font-bold text-white font-display">My Sales Ledger & Transaction Logs</h4>
          <p className="text-[11px] text-slate-400">All vehicle showroom sales (cash and installments) logged by you directly.</p>
        </div>

        {myPlans.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No completed sales transactions logged in your database history yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-350">
              <thead className="bg-[#161619] text-[#c5a880] uppercase tracking-wider text-[10px] border-b border-[#2e2e33]">
                <tr>
                  <th className="py-3 px-4">Agreement Date</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Vehicle Unit Info</th>
                  <th className="py-3 px-4">Financed Terms</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e21]">
                {myPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-[#1a1a1d] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold">{plan.saleDate || plan.startDate}</td>
                    <td className="py-3 px-4 font-bold text-white">{plan.customerName}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-white block">{plan.vehicleName}</span>
                      <span className="text-[10px] text-slate-505 font-mono block text-slate-500">Plate: {plan.vehicleNumber}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {plan.saleType === 'Cash' ? (
                        <div className="text-emerald-400">
                          <span className="block font-medium uppercase text-[9px]">Full Payment Cash</span>
                          <span className="font-mono font-bold">Rs. {plan.vehiclePrice.toLocaleString()}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="block text-slate-400 font-mono">Rs. {plan.monthlyInstallment.toLocaleString()} / mo ({plan.durationMonths} months)</span>
                          <span className="text-[10px] font-mono text-slate-500 block">Downpayment: Rs. {plan.downPayment.toLocaleString()}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-block text-[9px] font-bold uppercase rounded px-2.5 py-0.5 ${
                        plan.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' :
                        plan.status === 'Defaulter' ? 'bg-rose-500/15 text-rose-450 border border-rose-500/20' :
                        plan.status === 'Overdue' ? 'bg-amber-500/15 text-amber-450 border border-amber-505/20' : 'bg-[#af9268]/15 text-[#c5a880] border-[#af9268]/20'
                      }`}>
                        {plan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
