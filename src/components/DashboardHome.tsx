/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Car, 
  DollarSign, 
  Calendar, 
  Clock, 
  Activity, 
  Bell, 
  ArrowUpRight, 
  Search, 
  ChevronRight, 
  MessageSquare, 
  Copy, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';
import { User, InstallmentPlan, Payment, Customer } from '../types';
import SalesmanDashboard from './SalesmanDashboard';

interface DashboardHomeProps {
  summary: {
    totalVehiclesSold: number;
    totalInstallmentCustomers: number;
    totalCashCustomers: number;
    totalPendingRecovery: number;
    totalReceivedAmount: number;
    monthlyCollection: number;
    todayCollection: number;
    overdueInstallments: number;
    totalProfit: number;
    availableVehicles: number;
    revenueGenerated?: number;
    monthlySalesCount?: number;
    activeCustomersCount?: number;
  };
  recentPayments: Payment[];
  recentSales: InstallmentPlan[];
  onNavigate: (tab: string) => void;
  currentUser: User | null;
  customers: Customer[];
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 240, damping: 22 } }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};

export default function DashboardHome({ 
  summary, 
  recentPayments, 
  recentSales, 
  onNavigate,
  currentUser,
  customers
}: DashboardHomeProps) {
  const [draftingPlanId, setDraftingPlanId] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Partners accounting summary calculated for Admin
  const [partnerStats, setPartnerStats] = useState<{
    totalInvested: number;
    totalWithdrawn: number;
    remainingBalance: number;
    profitDistributed: number;
    activePartnersCount: number;
  } | null>(null);

  React.useEffect(() => {
    if (currentUser?.role === 'Admin') {
      Promise.all([
        fetch('/api/partners').then(res => res.json()).catch(() => []),
        fetch('/api/partner-transactions').then(res => res.json()).catch(() => [])
      ]).then(([partners, transactions]) => {
        const activePartners = Array.isArray(partners) ? partners.filter((p: any) => p.status === 'Active') : [];
        
        let totalInvested = 0;
        let totalWithdrawn = 0;
        let profitDistributed = 0;

        if (Array.isArray(transactions)) {
          transactions.forEach((tx: any) => {
            if (tx.type === 'Investment') {
              totalInvested += Number(tx.amount) || 0;
            } else if (tx.type === 'Withdrawal') {
              totalWithdrawn += Number(tx.amount) || 0;
            } else if (tx.type === 'Profit Distribution') {
              profitDistributed += Number(tx.amount) || 0;
            }
          });
        }

        setPartnerStats({
          totalInvested,
          totalWithdrawn,
          remainingBalance: totalInvested - totalWithdrawn,
          profitDistributed,
          activePartnersCount: activePartners.length
        });
      }).catch(err => {
        console.error("Error loading partner stats for dashboard:", err);
      });
    }
  }, [currentUser]);

  // Trigger server-side AI template generator for payment reminders
  const handleAIReminder = async (plan: InstallmentPlan) => {
    setDraftingPlanId(plan.id);
    setAiDraft('Generating draft via Gemini 3.5...');
    setCopied(false);

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
      setAiDraft('Failed to contact AI generator. Here is a fallback template:\n\n*Baheria Motors Reminder*\nDear customer, please pay your due installment.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aiDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (currentUser?.role === 'Salesman') {
    return (
      <SalesmanDashboard 
        currentUser={currentUser}
        customers={customers}
        installments={recentSales}
        payments={recentPayments}
        summary={summary}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 transform translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
          <Car size={320} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="bg-indigo-500/30 text-indigo-300 font-semibold px-3 py-1 rounded-full text-xs uppercase tracking-wider">
              {currentUser?.role || 'Guest'} Session Active
            </span>
            <h1 className="text-3xl font-bold font-display mt-2 tracking-tight">
              Welcome Back, {currentUser?.name || 'Administrator'}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Showroom records are secure and fully synchronized. Here is your real-time cash, installment plans, and collection recovery outlook for <span className="text-indigo-200 font-semibold font-mono-fig">Baheria Motors</span>.
            </p>
          </div>
          <button 
            id="btn-quick-new-sale"
            onClick={() => onNavigate('installments')}
            className="bg-white text-slate-900 font-medium font-sans px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition shadow-lg shrink-0 flex items-center gap-2 text-sm"
          >
            Create Installment Sale
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      {/* Empty Database Sample Data Generator Banner */}
      {currentUser?.role === 'Admin' && (!customers || customers.length === 0) && (
        <div className="bg-[#121215] border border-amber-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden bg-gradient-to-br from-[#121215] to-[#1a1510] flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-yellow-500 rounded-2xl shrink-0 mt-1">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div className="text-left">
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-yellow-500 font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest font-mono">
                No Record Found (Database Empty)
              </span>
              <h3 className="text-lg font-bold text-white mt-1.5 font-display tracking-tight">
                Instantly Populate Your Dealership Ledger & Test the Dashboard!
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                Your database is empty because you haven't entered customers, vehicles, or payments yet. Click the button on the right to instantly inject <strong>5 Premium Vehicles, 4 Installment Customers with Active Agreements, and Recent Repayments</strong>. This will bring the entire dashboard to life and let you try all features!
              </p>
            </div>
          </div>
          <button
            id="btn-seed-sample-data"
            onClick={async () => {
              if (window.confirm("Are you sure you want to inject pre-filled showroom data now? This will instantly populate vehicles, installment ledgers, and collection history.")) {
                try {
                  const resp = await fetch('/api/admin/inject-sample-data', { method: 'POST' });
                  if (resp.ok) {
                    window.location.reload(); // Reload to refresh all statistics
                  } else {
                    alert("Failed to inject demo dataset.");
                  }
                } catch (err) {
                  alert("Error while injecting dataset.");
                }
              }
            }}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg hover:shadow-amber-500/10 transition flex items-center gap-2 cursor-pointer uppercase tracking-wider font-mono select-none shrink-0"
          >
            <Sparkles size={14} />
            Inject Showroom Dataset
          </button>
        </div>
      )}


      {/* Main Large Visual Card - Total Market Recovery */}
      <div className="bg-[#111113] border border-indigo-600/40 rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 bg-indigo-500/5 w-1/3 rounded-l-full pointer-events-none"></div>
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 relative z-10 w-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2.5 bg-[#af9268]/10 text-[#c5a880] rounded-xl border border-[#af9268]/20">
                <DollarSign size={24} className="stroke-[2.5]" />
              </span>
              <span className="text-sm font-bold text-[#c5a880] tracking-wider uppercase">
                Total Market Recovery
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white font-display tracking-tight leading-none mt-1">
              Rs. <span className="font-mono">{(summary.totalPendingRecovery || 0).toLocaleString()}</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              This card represents the aggregate remaining balances across all outstanding customer installment schedules. Directing this balance recovery secures the financial integrity of the showroom portfolio.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-[#101012] p-4 rounded-lg border border-[#2e2e33] shrink-0 shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.65)]">
            <div className="flex items-center gap-3.5 pr-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                <TrendingUp size={16} />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Collections Handled</span>
                <span className="text-base font-extrabold text-[#c5a880] font-mono block tracking-tight">Rs. {(summary.totalReceivedAmount || 0).toLocaleString()}</span>
              </div>
            </div>
            <div className="hidden sm:block w-[1.5px] h-10 bg-[#2e2e33]"></div>
            <div className="flex items-center gap-3.5 pl-0 sm:pl-2">
              <div className="w-10 h-10 rounded-lg bg-[#af9268]/15 border border-[#af9268]/25 flex items-center justify-center text-[#c5a880] shrink-0 shadow-sm animate-pulse">
                <Users size={16} />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Customers Count</span>
                <span className="text-base font-extrabold text-white font-mono block tracking-tight">{(summary.totalInstallmentCustomers || 0)} Accounts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Partners & Equity Summary Section */}
      {currentUser?.role === 'Admin' && partnerStats && (
        <div className="space-y-4 bg-slate-900/5 p-5 border border-slate-200/40 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-display">Partners Capital & Equity</h3>
              <p className="text-xs text-slate-500">Consolidated partner investments, total withdrawals, and active profit distribution assets</p>
            </div>
            <button
              onClick={() => onNavigate('partners-profiles')}
              className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition uppercase tracking-wider font-mono flex items-center gap-1 cursor-pointer"
            >
              Equity Ledger →
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Partner Investment */}
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Investments</span>
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <TrendingUp size={13} />
                </span>
              </div>
              <div className="mt-2.5">
                <h4 className="text-base font-bold text-slate-800 font-mono">
                  Rs. {partnerStats.totalInvested.toLocaleString()}
                </h4>
                <p className="text-[9px] text-slate-400 mt-1">Total invested capital</p>
              </div>
            </div>

            {/* Total Partner Withdrawals */}
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Withdrawals</span>
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Activity size={13} />
                </span>
              </div>
              <div className="mt-2.5">
                <h4 className="text-base font-bold text-slate-800 font-mono">
                  Rs. {partnerStats.totalWithdrawn.toLocaleString()}
                </h4>
                <p className="text-[9px] text-slate-400 mt-1">Total partner withdrawals</p>
              </div>
            </div>

            {/* Remaining Partner Balances */}
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Net Equity Balance</span>
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <DollarSign size={13} />
                </span>
              </div>
              <div className="mt-2.5">
                <h4 className="text-base font-bold text-slate-800 font-mono">
                  Rs. {partnerStats.remainingBalance.toLocaleString()}
                </h4>
                <p className="text-[9px] text-slate-400 mt-1">Net capital active in showroom</p>
              </div>
            </div>

            {/* Profit Distributed */}
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Profit Shared</span>
                <span className="p-1.5 bg-amber-50 text-[#c5a880] rounded-lg">
                  <DollarSign size={13} />
                </span>
              </div>
              <div className="mt-2.5">
                <h4 className="text-base font-bold text-slate-800 font-mono">
                  Rs. {partnerStats.profitDistributed.toLocaleString()}
                </h4>
                <p className="text-[9px] text-slate-400 mt-1">Total profit sharing paid out</p>
              </div>
            </div>

            {/* Active Partners */}
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Active Members</span>
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Users size={13} />
                </span>
              </div>
              <div className="mt-2.5">
                <h4 className="text-base font-bold text-slate-800 font-mono">
                  {partnerStats.activePartnersCount} Partners
                </h4>
                <p className="text-[9px] text-slate-400 mt-1">Active shareholders listed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Dynamic Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Collection */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Collections</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold font-display text-slate-900">
              Rs. <span className="font-mono-fig">{(summary.monthlyCollection || 0).toLocaleString()}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Clock size={12} />
              Collected this current month
            </p>
          </div>
        </div>

        {/* Total Booked Profit */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Booked Profit</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold font-display text-slate-900">
              Rs. <span className="font-mono-fig">{(summary.totalProfit || 0).toLocaleString()}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Info size={12} />
              Total retail sale margins
            </p>
          </div>
        </div>

        {/* Vehicles Sold */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicles Sold</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Car size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold font-display text-slate-900">
              <span className="font-mono-fig">{summary.totalVehiclesSold}</span> Units
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Users size={12} />
              {summary.totalInstallmentCustomers} Inst. / {summary.totalCashCustomers} Cash
            </p>
          </div>
        </div>

        {/* Overdue Accounts */}
        <div className={`border p-5 rounded-2xl shadow-sm transition ${summary.overdueInstallments > 0 ? 'bg-rose-50/50 border-rose-100' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue / Defaulters</span>
            <span className={`p-2 rounded-lg ${summary.overdueInstallments > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
              <Clock size={16} />
            </span>
          </div>
          <div className="mt-4">
            <h3 className={`text-xl font-bold font-display ${summary.overdueInstallments > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              <span className="font-mono-fig">{summary.overdueInstallments}</span> Accounts
            </h3>
            <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-semibold">
              Needs critical recovery prompt
            </p>
          </div>
        </div>
      </div>

      {/* Visual Charts simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recovery Rate and Trends Bar Graph */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-bold text-slate-900 font-display">Collections Recovery Progress</h4>
              <p className="text-xs text-slate-400">Comparing active recovery against expected portfolio expectations (in Millions Rs.)</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Automated Tracker</span>
          </div>
          
          <div className="h-[200px] flex items-end justify-between px-4 pb-6 border-b border-slate-100">
            {/* Custom high-craft CSS representation of visual charts */}
            {[
              { month: 'January', expectedVal: 1.8, actualVal: 1.54, heightExpected: '55%', heightActual: '46%' },
              { month: 'February', expectedVal: 1.8, actualVal: 1.68, heightExpected: '55%', heightActual: '51%' },
              { month: 'March', expectedVal: 1.95, actualVal: 1.89, heightExpected: '60%', heightActual: '58%' },
              { month: 'April', expectedVal: 2.0, actualVal: 1.72, heightExpected: '62%', heightActual: '53%' },
              { month: 'May (Current)', expectedVal: 2.1, actualVal: ((summary.monthlyCollection || 0) / 1000000), heightExpected: '65%', heightActual: `${Math.min(65, Math.max(10, ((summary.monthlyCollection || 0) / 2100000) * 65))}%` }
            ].map((col, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 w-1/5 group">
                <div className="flex items-end gap-1.5 h-[140px] w-full justify-center relative">
                  {/* Tooltips */}
                  <div className="absolute -top-10 scale-0 group-hover:scale-100 bg-slate-900 text-white text-[10px] p-2 rounded-lg font-mono-fig flex flex-col items-center gap-1 shadow z-20 pointer-events-none transition">
                    <span>Expected: Rs. {col.expectedVal.toFixed(2)}M</span>
                    <span className="text-emerald-300 font-bold">Collected: Rs. {col.actualVal.toFixed(2)}M</span>
                  </div>

                  {/* Bars */}
                  <div style={{ height: col.heightExpected }} className="w-4 bg-slate-100 group-hover:bg-slate-200 rounded-t transition-all"></div>
                  <div style={{ height: col.heightActual }} className="w-4 bg-indigo-600 group-hover:bg-indigo-700 rounded-t transition-all shadow-sm"></div>
                </div>
                <span className="text-xs text-slate-500 font-medium">{col.month}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6 mt-4 justify-center text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-slate-200 rounded"></span>
              <span>Target Collection</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-indigo-600 rounded"></span>
              <span>Actual Recieved</span>
            </div>
          </div>
        </div>

        {/* Portfolio Diversification Status Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 font-display">Sales Contribution</h4>
            <p className="text-xs text-slate-400 mb-6">Cash deals vs Active installment customers ratio</p>

            <div className="relative flex items-center justify-center my-4">
              {/* Modern CSS Ring segment indicators */}
              <div className="w-36 h-36 border-12 border-slate-50 rounded-full flex flex-col items-center justify-center relative shadow-inner">
                {/* Visual donut representation via layered circular overlays */}
                <div className="absolute inset-0 rounded-full border-12 border-transparent border-t-indigo-600 border-r-indigo-600 rotate-45"></div>
                
                <span className="text-xs text-slate-400 font-medium">Showroom Total</span>
                <span className="text-2xl font-black text-slate-800 font-mono-fig">
                  {summary.totalVehiclesSold}
                </span>
                <span className="text-[10px] text-slate-400">Sold Units</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                <span className="text-slate-600 font-medium">Installment Plan Sales</span>
              </div>
              <span className="font-semibold text-slate-800 font-mono-fig">{summary.totalInstallmentCustomers} Units ({Math.round((summary.totalInstallmentCustomers / (summary.totalVehiclesSold || 1)) * 100)}%)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-indigo-200 rounded-full"></span>
                <span className="text-slate-500 font-medium">Direct Cash Sales</span>
              </div>
              <span className="font-semibold text-slate-800 font-mono-fig">{summary.totalCashCustomers} Units ({Math.round((summary.totalCashCustomers / (summary.totalVehiclesSold || 1)) * 100)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lists Section: Recent Activity & Due Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming dues and smart AI templates */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <h4 className="font-bold text-slate-900 font-display">Installments Queue</h4>
              <p className="text-xs text-slate-400">Next due customers. Click Gemini to draft WhatsApp outreach templates.</p>
            </div>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Bell size={16} />
            </span>
          </div>

          {recentSales.filter(p => p.status !== 'Completed').length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No outstanding active installment schedules found.
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {recentSales.filter(p => p.status !== 'Completed').map((plan) => (
                <div key={plan.id} className="border border-slate-100 hover:border-indigo-100 p-3 rounded-xl hover:bg-slate-50/50 transition">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800">{plan.customerName}</h5>
                      <span className="text-xs text-slate-400 block">{plan.vehicleName} ({plan.vehicleNumber})</span>
                      <span className="text-[10px] text-slate-500 font-mono-fig mt-1 block">Due Day: Every {plan.dueDay}th | Next due: <span className="font-semibold text-indigo-600">{plan.nextDueDate}</span></span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-slate-800 block font-mono-fig">Rs. {plan.monthlyInstallment.toLocaleString()}</span>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 ${
                        plan.status === 'Defaulter' ? 'bg-rose-100 text-rose-700' :
                        plan.status === 'Overdue' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                  </div>

                  {/* Gemini Smart Assistant button */}
                  <div className="mt-3 pt-2.5 border-t border-dashed border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} />
                      Balance: Rs. {plan.balance.toLocaleString()}
                    </span>
                    <button
                      id={`btn-ai-reminder-${plan.id}`}
                      onClick={() => handleAIReminder(plan)}
                      className="text-xs flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-800 transition py-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-transparent hover:border-indigo-200"
                    >
                      <Sparkles size={11} className="text-indigo-500 fill-indigo-500 animate-pulse" />
                      Gemini Draft
                    </button>
                  </div>

                  {/* Drafting layout if target customer matches */}
                  {draftingPlanId === plan.id && (
                    <div className="mt-3 bg-slate-900 text-slate-100 p-3 rounded-xl text-xs space-y-2.5 shadow-md relative border border-slate-800">
                      <div className="flex items-center justify-between text-[11px] text-indigo-300 font-semibold border-b border-slate-800 pb-1.5">
                        <span className="flex items-center gap-1">
                          <Sparkles size={12} />
                          AI WhatsApp Outreach Generator
                        </span>
                        <div className="flex gap-2">
                          <button 
                            id="btn-copy-draft"
                            onClick={copyToClipboard}
                            className="hover:text-white transition flex items-center gap-1 font-normal bg-slate-800 px-2 py-0.5 rounded"
                          >
                            {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                          <button 
                            onClick={() => setDraftingPlanId(null)}
                            className="text-slate-400 hover:text-white"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                      <p className="whitespace-pre-line font-mono text-[11px] leading-relaxed text-slate-300">
                        {aiDraft}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest payment collections timeline list */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <h4 className="font-bold text-slate-900 font-display">Latest Payments Received</h4>
              <p className="text-xs text-slate-400">Chronological list of cash recovery entries</p>
            </div>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Activity size={16} />
            </span>
          </div>

          {recentPayments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No payment transactions captured yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {recentPayments.map((pay) => (
                <div key={pay.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-none last:pb-0">
                  <div className="space-y-1">
                    <h5 className="text-sm font-semibold text-slate-800">{pay.customerName}</h5>
                    <p className="text-xs text-slate-500 font-medium">{pay.vehicleName}</p>
                    <span className="text-[10px] text-slate-400 block font-mono-fig">{pay.paymentDate} | Receipt: <span className="text-indigo-600 font-semibold">{pay.receiptNumber}</span></span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono-fig font-bold text-emerald-600">+ Rs. {pay.amount.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 block mt-1">Via {pay.paymentMethod}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
