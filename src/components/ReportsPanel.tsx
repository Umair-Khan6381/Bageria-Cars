/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  Car, 
  PieChart,
  Check,
  Copy,
  QrCode,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Sparkles,
  Info,
  Search,
  Users,
  DollarSign,
  User,
  Clock,
  ChevronRight,
  MessageSquare,
  AlertOctagon,
  FileSpreadsheet,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { Customer, Vehicle, InstallmentPlan, Payment } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ReportsPanelProps {
  customers: Customer[];
  vehicles: Vehicle[];
  installments: InstallmentPlan[];
  payments: Payment[];
  summary: {
    totalProfit: number;
    totalReceivedAmount: number;
    totalPendingRecovery: number;
  };
}

export default function ReportsPanel({ 
  customers, 
  vehicles, 
  installments, 
  payments, 
  summary 
}: ReportsPanelProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registry' | 'defaulters' | 'ledger'>('dashboard');
  
  // Searching & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid On Time' | 'Defaulter' | 'Active' | 'Completed' | 'Overdue' | 'High Risk'>('All');
  
  // Defaulter Tab Filters
  const [defaulterMonth, setDefaulterMonth] = useState<string>('All');
  const [defaulterAmount, setDefaulterAmount] = useState<number>(0);
  const [defaulterVehicle, setDefaulterVehicle] = useState<string>('All');
  const [defaulterOfficer, setDefaulterOfficer] = useState<string>('All');

  // Audit state persistence
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'scanning' | 'verified'>('idle');

  // Local state persistence for notes, reminder status, and extra fine charges
  const [notesState, setNotesState] = useState<{ [key: string]: string }>({});
  const [reminderState, setReminderState] = useState<{ [key: string]: string }>({});
  const [finesState, setFinesState] = useState<{ [key: string]: number }>({});

  // Input fields inside the ledger/notes
  const [newNoteText, setNewNoteText] = useState('');
  const [fineInputAmount, setFineInputAmount] = useState('');

  // Initializing local states
  useEffect(() => {
    const loadedNotes: { [key: string]: string } = {};
    const loadedReminders: { [key: string]: string } = {};
    const loadedFines: { [key: string]: number } = {};

    installments.forEach(plan => {
      const n = localStorage.getItem(`recovery_notes_${plan.id}`);
      if (n) loadedNotes[plan.id] = n;

      const r = localStorage.getItem(`reminder_status_${plan.id}`);
      if (r) loadedReminders[plan.id] = r;

      const f = localStorage.getItem(`fine_charges_${plan.id}`);
      if (f) loadedFines[plan.id] = Number(f);
    });

    setNotesState(loadedNotes);
    setReminderState(loadedReminders);
    setFinesState(loadedFines);

    // Default select first plan if available for audit statement tab
    if (installments.length > 0 && !selectedPlanId) {
      setSelectedPlanId(installments[0].id);
    }
  }, [installments, activeTab]);

  // Helper date parsing (Installment End Date)
  const calculateEndDate = (start: string, months: number) => {
    if (!start) return 'N/A';
    try {
      const d = new Date(start);
      d.setMonth(d.getMonth() + months);
      return d.toISOString().split('T')[0];
    } catch (e) {
      return 'N/A';
    }
  };

  // Status mapping matching criteria
  const getEnrichedPlanData = (plan: InstallmentPlan) => {
    const customer = customers.find(c => c.id === plan.customerId);
    const vehicle = vehicles.find(v => v.id === plan.vehicleId);
    
    // Add extra fines from state
    const customFine = finesState[plan.id] || 0;
    const adjustedBalance = Math.max(0, plan.balance + customFine);
    const totalDue = plan.monthlyInstallment;

    // Days overdue
    let overdueDays = 0;
    if (plan.nextDueDate && (plan.status === 'Overdue' || plan.status === 'Defaulter')) {
      const today = new Date();
      const dueDate = new Date(plan.nextDueDate);
      if (today > dueDate) {
        const diffTime = Math.abs(today.getTime() - dueDate.getTime());
        overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    // Status behavioral evaluation
    let computedStatus: 'Active' | 'Paid On Time' | 'Late Payment' | 'Defaulter' | 'Completed' | 'Overdue' | 'High Risk' = 'Active';
    let recoveryStatusColor: 'green' | 'yellow' | 'orange' | 'red' = 'green';

    if (plan.status === 'Completed') {
      computedStatus = 'Completed';
      recoveryStatusColor = 'green';
    } else if (plan.status === 'Defaulter') {
      computedStatus = 'Defaulter';
      recoveryStatusColor = 'red';
    } else if (plan.status === 'Overdue') {
      if (overdueDays > 45) {
        computedStatus = 'High Risk';
        recoveryStatusColor = 'red';
      } else {
        computedStatus = 'Overdue';
        recoveryStatusColor = 'orange';
      }
    } else {
      // Check upcoming due day
      const today = new Date();
      if (plan.nextDueDate) {
        const dueDate = new Date(plan.nextDueDate);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 5) {
          computedStatus = 'Active';
          recoveryStatusColor = 'yellow'; // upcoming due
        } else {
          computedStatus = 'Paid On Time';
          recoveryStatusColor = 'green';
        }
      } else {
        computedStatus = 'Active';
        recoveryStatusColor = 'green';
      }
    }

    const note = notesState[plan.id] || '';
    const reminder = reminderState[plan.id] || 'Not Sent';

    return {
      ...plan,
      customer,
      vehicle,
      customFine,
      adjustedBalance,
      overdueDays,
      computedStatus,
      recoveryStatusColor,
      note,
      reminder
    };
  };

  const enrichedPlans = installments.map(getEnrichedPlanData);

  // --- OVERALL METRICS ---
  const totalRecoverable = enrichedPlans.reduce((sum, p) => sum + p.remainingAmount, 0);
  const totalReceived = enrichedPlans.reduce((sum, p) => sum + p.totalPaid, 0);
  const totalRemaining = enrichedPlans.reduce((sum, p) => sum + p.adjustedBalance, 0);

  // Calculate this month's payments
  const currentMonthStr = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
  const monthlyReceived = payments
    .filter(p => p.paymentDate.startsWith(currentMonthStr))
    .reduce((sum, p) => sum + p.amount, 0);

  // Overdue total pool
  const totalOverdue = enrichedPlans
    .filter(p => p.computedStatus === 'Overdue' || p.computedStatus === 'High Risk' || p.computedStatus === 'Defaulter')
    .reduce((sum, p) => sum + p.adjustedBalance, 0);

  const activeCustomersCount = enrichedPlans.filter(p => p.computedStatus !== 'Completed').length;
  const completedAccountsCount = enrichedPlans.filter(p => p.computedStatus === 'Completed').length;
  const totalDefaultersCount = enrichedPlans.filter(p => p.computedStatus === 'Defaulter' || p.computedStatus === 'High Risk').length;

  // --- FILTERS FOR MAIN REGISTRY TABLE ---
  const filteredPlans = enrichedPlans.filter(p => {
    // Search fields
    const query = searchQuery.toLowerCase();
    const matchName = p.customerName.toLowerCase().includes(query);
    const matchPhone = p.customer?.phone?.toLowerCase().includes(query) || false;
    const matchCnic = p.customer?.cnic?.toLowerCase().includes(query) || false;
    const matchReg = p.vehicleNumber.toLowerCase().includes(query);
    const matchEngine = p.vehicle?.engineNumber?.toLowerCase().includes(query) || false;
    const matchChassis = p.vehicle?.chassisNumber?.toLowerCase().includes(query) || false;

    const matchesSearch = matchName || matchPhone || matchCnic || matchReg || matchEngine || matchChassis;

    // Status filter matches
    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Paid On Time') {
      return matchesSearch && (p.computedStatus === 'Paid On Time' || p.computedStatus === 'Completed');
    }
    return matchesSearch && p.computedStatus === statusFilter;
  });

  // --- FILTERS FOR DEFAULTERS GRID ---
  const defaultersList = enrichedPlans.filter(p => 
    p.computedStatus === 'Overdue' || p.computedStatus === 'High Risk' || p.computedStatus === 'Defaulter'
  ).filter(p => {
    // 1. Month filter
    if (defaulterMonth !== 'All' && p.nextDueDate) {
      const monthIndex = new Date(p.nextDueDate).getMonth();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      if (monthNames[monthIndex] !== defaulterMonth) return false;
    }
    // 2. Amount filter
    if (defaulterAmount > 0 && p.adjustedBalance < defaulterAmount) return false;
    // 3. Vehicle Model filter
    if (defaulterVehicle !== 'All' && p.vehicle?.model !== defaulterVehicle) return false;
    // 4. Recovery Officer
    if (defaulterOfficer !== 'All') {
      // Find payments recorded for this plan and verify user
      const hasOfficerMatch = payments.some(pay => pay.installmentId === p.id && pay.recordedBy === defaulterOfficer);
      if (!hasOfficerMatch) return false;
    }
    return true;
  });

  // Extract unique elements for dropdown filters
  const uniqueModels = Array.from(new Set(vehicles.map(v => v.model)));
  const uniqueOfficers = Array.from(new Set(payments.map(p => p.recordedBy).filter(Boolean)));

  // Current active audited plan
  const selectedPlan = enrichedPlans.find(p => p.id === selectedPlanId) || enrichedPlans[0];
  const selectedPlanPayments = selectedPlan ? payments.filter(p => p.installmentId === selectedPlan.id) : [];

  // Active receipt voucher for details view
  const activeReceipt = selectedReceiptId 
    ? payments.find(p => p.id === selectedReceiptId) 
    : (selectedPlanPayments.length > 0 ? selectedPlanPayments[0] : null);

  // Save changes wrapper
  const handleSaveNote = (planId: string, note: string) => {
    localStorage.setItem(`recovery_notes_${planId}`, note);
    setNotesState(prev => ({ ...prev, [planId]: note }));
    setNewNoteText('');
  };

  const handleUpdateReminder = (planId: string, status: string) => {
    localStorage.setItem(`reminder_status_${planId}`, status);
    setReminderState(prev => ({ ...prev, [planId]: status }));
  };

  const handleApplyFine = (planId: string, amount: number) => {
    if (isNaN(amount) || amount < 0) return;
    const currentFine = finesState[planId] || 0;
    const updated = currentFine + amount;
    localStorage.setItem(`fine_charges_${planId}`, String(updated));
    setFinesState(prev => ({ ...prev, [planId]: updated }));
    setFineInputAmount('');
  };

  const handleResetFines = (planId: string) => {
    localStorage.removeItem(`fine_charges_${planId}`);
    setFinesState(prev => {
      const copy = { ...prev };
      delete copy[planId];
      return copy;
    });
  };

  // --- CRYPTOGRAPHIC SCANNING SIMULATOR ---
  const handleRowClick = (payment: Payment) => {
    setSelectedReceiptId(payment.id);
    setVerifyStatus('scanning');
    setTimeout(() => {
      setVerifyStatus('verified');
    }, 1100);
  };

  // --- EXPORT TO CSV SHEETS ENGINES ---
  const handleCSVExport = (type: 'recovery' | 'defaulters' | 'ledger' | 'outstanding') => {
    let dataset: any[] = [];
    let filename = 'export_report';

    if (type === 'recovery') {
      filename = `recovery_and_installment_audit_registry_${new Date().toISOString().split('T')[0]}`;
      dataset = enrichedPlans.map(p => ({
        CustomerName: p.customerName,
        CNIC: p.customer?.cnic || 'N/A',
        Phone: p.customer?.phone || 'N/A',
        Vehicle: p.vehicleName,
        RegNo: p.vehicleNumber,
        ChassisNumber: p.vehicle?.chassisNumber || 'N/A',
        EngineNumber: p.vehicle?.engineNumber || 'N/A',
        TotalVehiclePrice: p.vehiclePrice,
        DownPayment: p.downPayment,
        InstallmentPrincipal: p.remainingAmount,
        TotalPaidInstallments: p.totalPaid,
        RemainingLedgerBalance: p.adjustedBalance,
        MonthlyAmortization: p.monthlyInstallment,
        UnpaidFines: p.customFine,
        NextDueDate: p.nextDueDate || 'N/A',
        InstallmentEndDate: calculateEndDate(p.startDate, p.durationMonths),
        BehaviorStatus: p.computedStatus,
        ReminderStatus: p.reminder
      }));
    } else if (type === 'defaulters') {
      filename = `installment_defaulters_portfolio_${new Date().toISOString().split('T')[0]}`;
      dataset = defaultersList.map(p => ({
        CustomerName: p.customerName,
        Phone: p.customer?.phone || 'N/A',
        CNIC: p.customer?.cnic || 'N/A',
        Vehicle: p.vehicleName,
        RegNo: p.vehicleNumber,
        MonthlyInstallment: p.monthlyInstallment,
        RemainingBalance: p.adjustedBalance,
        DaysOverdue: p.overdueDays,
        NextDueDate: p.nextDueDate || 'N/A',
        ReminderStatus: p.reminder,
        Notes: p.note || 'None logged'
      }));
    } else if (type === 'ledger' && selectedPlan) {
      filename = `ledger_statements_customer_${selectedPlan.customerName.replace(/\s+/g, '_')}`;
      dataset = selectedPlanPayments.map(p => ({
        ReceiptNumber: p.receiptNumber,
        CustomerName: p.customerName,
        Vehicle: p.vehicleName,
        PaymentDate: p.paymentDate,
        Method: p.paymentMethod,
        AmountReceived: p.amount,
        Notes: p.notes || '',
        RecordedBy: p.recordedBy
      }));
    } else if (type === 'outstanding') {
      filename = `outstanding_aging_report_${new Date().toISOString().split('T')[0]}`;
      dataset = enrichedPlans.filter(p => p.adjustedBalance > 0).map(p => ({
        CustomerName: p.customerName,
        Vehicle: p.vehicleName,
        RegNo: p.vehicleNumber,
        InstallmentEnd: calculateEndDate(p.startDate, p.durationMonths),
        RemainingBalance: p.adjustedBalance,
        MonthlyInstallment: p.monthlyInstallment,
        NextDueDate: p.nextDueDate || 'N/A',
        BehaviorStatus: p.computedStatus
      }));
    }

    if (dataset.length === 0) {
      alert('Selected ledger report dataset is empty. Record agreements first.');
      return;
    }

    const headers = Object.keys(dataset[0]);
    const csvContent = [
      headers.join(','),
      ...dataset.map((row) => 
        headers.map((fieldName) => {
          const value = row[fieldName] !== undefined ? row[fieldName] : '';
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- PRINT SUPPORT TRIPPERS ---
  const handlePrint = () => {
    window.print();
  };

  // --- SVG CHANGER TREND CURVES ---
  // Calculates real-time recovery collections dynamically by grouping past payments
  const getCollectionsTrend = () => {
    const trendMap: { [key: string]: number } = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Default last 6 months list
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
      trendMap[key] = 0;
      chartData.push({ key, label, value: 0 });
    }

    // Populate actuals
    payments.forEach(p => {
      const prefix = p.paymentDate.substring(0, 7); // 'YYYY-MM'
      if (trendMap[prefix] !== undefined) {
        trendMap[prefix] += p.amount;
      }
    });

    return chartData.map(item => ({
      ...item,
      value: trendMap[item.key]
    }));
  };

  const trendData = getCollectionsTrend();
  const maxTrendVal = Math.max(...trendData.map(t => t.value), 100000);

  // Status mapping colors helper
  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
      case 'Defaulter':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse';
      case 'Overdue':
      case 'Late Payment':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
      case 'High Risk':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/25 font-bold';
      case 'Paid On Time':
        return 'bg-teal-500/10 text-teal-400 border border-teal-500/25';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25';
    }
  };

  const getMethodTheme = (method: string) => {
    switch (method) {
      case 'Cash':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
          pill: 'bg-emerald-500/20 text-emerald-405 border-emerald-500/30',
          accent: '#10b981',
          colorName: 'Emerald Green'
        };
      case 'Bank Transfer':
        return {
          bg: 'bg-cyan-500/10',
          border: 'border-cyan-500/30',
          text: 'text-cyan-400',
          glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
          pill: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
          accent: '#06b6d4',
          colorName: 'Cobalt Cyan'
        };
      case 'Cheque':
        return {
          bg: 'bg-[#af9268]/10',
          border: 'border-[#af9268]/30',
          text: 'text-[#c5a880]',
          glow: 'shadow-[0_0_20px_rgba(175,146,104,0.15)]',
          pill: 'bg-[#af9268]/25 text-[#c5a880] border-[#af9268]/30',
          accent: '#af9268',
          colorName: 'Showroom Amber'
        };
      case 'EasyPaisa/JazzCash':
      default:
        return {
          bg: 'bg-fuchsia-500/10',
          border: 'border-fuchsia-500/30',
          text: 'text-fuchsia-400',
          glow: 'shadow-[0_0_20px_rgba(217,70,239,0.15)]',
          pill: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
          accent: '#d946ef',
          colorName: 'Neon Fuchsia'
        };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION HEADER BLOCK */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white font-display tracking-tight flex items-center gap-2">
            <span className="p-2 bg-[#af9268]/10 rounded-xl border border-[#af9268]/20 text-[#c5a880]">
              <FileText size={20} className="stroke-[2.5]" />
            </span>
            <span>Recovery & Audit Dashboard</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Authorized workstation managing showroom receivables, customer payment tracking, audit ledgers, and defaults aging.
          </p>
        </div>

        {/* PRINT & EXCEL CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-print-screen"
            onClick={handlePrint}
            className="border border-[#2e2e33] hover:border-slate-600 bg-[#161619] text-slate-350 hover:text-white font-bold p-2.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Print Current View"
          >
            <Printer size={14} />
            <span>Print Sheet</span>
          </button>

          <div className="relative group">
            <button
              id="btn-export-dropdown"
              className="bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs text-white px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-[0_4px_12px_rgba(79,70,229,0.25)] cursor-pointer"
            >
              <Download size={14} />
              <span>Export Statements</span>
            </button>
            <div className="absolute right-0 mt-1 w-52 bg-[#121214] border border-[#2e2e33] rounded-xl shadow-2xl p-1 z-50 hidden group-hover:block hover:block">
              <button
                onClick={() => handleCSVExport('recovery')}
                className="w-full text-left px-3 py-2 text-[10px] text-slate-300 hover:bg-[#1a1a1c] hover:text-white font-semibold transition rounded-lg flex items-center gap-1.5"
              >
                <FileSpreadsheet size={12} className="text-emerald-500" />
                <span>Recovery General Ledger</span>
              </button>
              <button
                onClick={() => handleCSVExport('defaulters')}
                className="w-full text-left px-3 py-2 text-[10px] text-slate-300 hover:bg-[#1a1a1c] hover:text-white font-semibold transition rounded-lg flex items-center gap-1.5"
              >
                <FileSpreadsheet size={12} className="text-rose-500" />
                <span>Installment Defaulters</span>
              </button>
              <button
                onClick={() => handleCSVExport('outstanding')}
                className="w-full text-left px-3 py-2 text-[10px] text-slate-300 hover:bg-[#1a1a1c] hover:text-white font-semibold transition rounded-lg flex items-center gap-1.5"
              >
                <FileSpreadsheet size={12} className="text-amber-500" />
                <span>Outstanding Aging CSV</span>
              </button>
              {selectedPlan && (
                <button
                  onClick={() => handleCSVExport('ledger')}
                  className="w-full text-left px-3 py-2 text-[10px] text-[#c5a880] hover:bg-[#1a1a1c] hover:text-white font-semibold transition rounded-lg border-t border-[#2e2e33]/50 mt-1 flex items-center gap-1.5"
                >
                  <FileSpreadsheet size={12} className="text-[#af9268]" />
                  <span>Statements for {selectedPlan.customerName}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD TAB HEADERS */}
      <div className="flex border-b border-[#2e2e33] overflow-x-auto gap-2 no-scrollbar">
        {[
          { id: 'dashboard', label: '1. Financial Summary Desktop' },
          { id: 'registry', label: '2. Customer Recovery Table (19 cols)' },
          { id: 'defaulters', label: '3. Delinquency Cockpit' },
          { id: 'ledger', label: '4. Statements & Audit Ledger' }
        ].map((tab) => (
          <button
            id={`btn-dashboard-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`text-[10px] uppercase font-bold tracking-wider px-4 py-3 shrink-0 transition-all -mb-px border-b-2 font-mono ${
              activeTab === tab.id 
                ? 'border-[#af9268] text-[#c5a880] bg-[#af9268]/5' 
                : 'border-transparent text-slate-400 hover:text-slate-100 hover:border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* RENDER ACTIVE VIEW */}
      <div className="space-y-6">
        
        {/* ========================================================
            TAB 1: FINANCIAL SUMMARY DASHBOARD
            ======================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 8 SUMMARY METRIC CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Recoverable Amount */}
              <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-4.5 space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#af9268]/5 rounded-bl-full pointer-events-none group-hover:bg-[#af9268]/10 transition-colors" />
                <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 block font-mono">Total Recoverable Amount</span>
                <span className="text-slate-400 text-[10px] font-bold block pt-1">Sale Installments Base</span>
                <div className="text-xl font-black font-mono text-white tracking-tight">
                  Rs. {totalRecoverable.toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Sales ledger principal to recover</span>
                </div>
              </div>

              {/* Card 2: Total Recovered Amount */}
              <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-4.5 space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-550/5 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
                <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 block font-mono">Total Amount Received</span>
                <span className="text-emerald-450 text-[10px] font-bold block pt-1 text-emerald-450">Remitted Payments</span>
                <div className="text-xl font-black font-mono text-emerald-400 tracking-tight">
                  Rs. {totalReceived.toLocaleString()}
                </div>
                <div className="text-[9px] text-[#af9268] font-semibold flex items-center gap-1">
                  <span>Progress: {totalRecoverable > 0 ? ((totalReceived / totalRecoverable) * 100).toFixed(1) : 0}% settled</span>
                </div>
              </div>

              {/* Card 3: Remaining Portfolio Recovery */}
              <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-4.5 space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-bl-full pointer-events-none group-hover:bg-indigo-550/10 transition-colors" />
                <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 block font-mono">Total Remaining Recovery</span>
                <span className="text-indigo-400 text-[10px] font-bold block pt-1">Portfolio Outstanding</span>
                <div className="text-xl font-black font-mono text-indigo-400 tracking-tight">
                  Rs. {totalRemaining.toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-500 font-semibold flex items-center gap-1">
                  <span>Balance sheet current asset value</span>
                </div>
              </div>

              {/* Card 4: Monthly Collections */}
              <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-4.5 space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-550/10 transition-colors" />
                <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 block font-mono">Monthly Recovery Collection</span>
                <span className="text-cyan-400 text-[10px] font-bold block pt-1">This Calendar Month</span>
                <div className="text-xl font-black font-mono text-cyan-400 tracking-tight">
                  Rs. {monthlyReceived.toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-500 font-semibold flex items-center gap-1">
                  <span>Collections in {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Card 5: Delinquent Overdue amount */}
              <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-4.5 space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-bl-full pointer-events-none group-hover:bg-rose-500/10 transition-colors" />
                <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 block font-mono">Overdue Recovery Amount</span>
                <span className="text-rose-450 text-[10px] font-bold block pt-1 text-rose-400">Aging Arrears</span>
                <div className="text-xl font-black font-mono text-rose-500 tracking-tight flex items-center gap-1.5">
                  <span>Rs. {totalOverdue.toLocaleString()}</span>
                </div>
                <div className="text-[9px] text-rose-300 font-semibold flex items-center gap-1">
                  <AlertTriangle size={10} className="text-rose-400 animate-bounce" />
                  <span>Unpaid dues past grace periods</span>
                </div>
              </div>

              {/* Card 6: Active customers count */}
              <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-4.5 space-y-2 relative overflow-hidden group">
                <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 block font-mono">Active Installment Customers</span>
                <span className="text-slate-400 text-[10px] font-bold block pt-1">Subscribers Ledger</span>
                <div className="text-xl font-black font-mono text-white tracking-tight">
                  {activeCustomersCount} <span className="text-xs font-normal text-slate-450">Accounts</span>
                </div>
                <div className="text-[9px] text-slate-500 font-semibold flex items-center gap-1">
                  <span>Amortizing agreements under execution</span>
                </div>
              </div>

              {/* Card 7: Completed contracts */}
              <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-4.5 space-y-2 relative overflow-hidden group">
                <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 block font-mono">Total Completed Accounts</span>
                <span className="text-emerald-450 text-[10px] font-bold block pt-1 text-emerald-450">100% Settle Contracts</span>
                <div className="text-xl font-black font-mono text-emerald-400 tracking-tight">
                  {completedAccountsCount} <span className="text-xs font-normal text-slate-450">Clients</span>
                </div>
                <div className="text-[9px] text-emerald-450 font-semibold flex items-center gap-1">
                  <CheckCircle size={10} className="text-emerald-400" />
                  <span>Fully paid vehicles ownership clear</span>
                </div>
              </div>

              {/* Card 8: Defaulters Count */}
              <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-4.5 space-y-2 relative overflow-hidden group border-rose-950/20">
                <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 block font-mono">Total Defaulters</span>
                <span className="text-rose-450 text-[10px] font-bold block pt-1 text-rose-400">Delinquent accounts</span>
                <div className="text-xl font-black font-mono text-rose-450 text-rose-500 tracking-tight">
                  {totalDefaultersCount} <span className="text-xs font-normal text-rose-450">Defaulters</span>
                </div>
                <div className="text-[9px] text-rose-300 font-semibold flex items-center gap-1">
                  <span>Requires recovery officer physical outreach</span>
                </div>
              </div>

            </div>

            {/* VISUAL REPORT CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chart 1: Month Recovery Trend (Custom SVG Chart) */}
              <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-6 lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Dynamic Recovery Collection Trend
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Rolling 6-month payments reconciliation statistics
                    </p>
                  </div>
                  <span className="text-[9px] text-[#c5a880] font-mono bg-[#af9268]/15 border border-[#af9268]/20 px-2 py-0.5 rounded uppercase">
                    Showroom Ledger Real-time
                  </span>
                </div>

                {/* SVG Visual graph container */}
                <div className="w-full h-48 bg-[#161619] rounded-xl border border-[#2e2e33] p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-2 left-4 text-[9px] font-mono text-slate-500">PKR</div>
                  
                  {/* Chart Grid Lines */}
                  <div className="absolute inset-x-0 top-1/4 border-t border-slate-800/30 border-dashed" />
                  <div className="absolute inset-x-0 top-2/4 border-t border-slate-800/30 border-dashed" />
                  <div className="absolute inset-x-0 top-3/4 border-t border-slate-800/30 border-dashed" />

                  {/* SVG Canvas Area */}
                  <div className="flex-1 w-full relative pt-4">
                    <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                      {/* Gradient below line */}
                      <defs>
                        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Area Fill */}
                      <path
                        d={`
                          M 25 120
                          ${trendData.map((d, idx) => {
                            const x = 25 + (idx * 90);
                            const y = 110 - (d.value / maxTrendVal * 90);
                            return `L ${x} ${y}`;
                          }).join(' ')}
                          L 475 120 Z
                        `}
                        fill="url(#chartGlow)"
                      />

                      {/* Stroke Line */}
                      <path
                        d={trendData.map((d, idx) => {
                          const x = 25 + (idx * 90);
                          const y = 110 - (d.value / maxTrendVal * 90);
                          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Node Dots */}
                      {trendData.map((d, idx) => {
                        const x = 25 + (idx * 90);
                        const y = 110 - (d.value / maxTrendVal * 90);
                        return (
                          <g key={idx}>
                            <circle cx={x} cy={y} r="5" fill="#111113" stroke="#10b981" strokeWidth="2.5" />
                            <circle cx={x} cy={y} r="2" fill="#10b981" />
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Chart Labels */}
                  <div className="flex justify-between px-6 border-t border-[#2e2e33]/50 pt-2 font-mono text-[9px] text-slate-400 font-bold">
                    {trendData.map((t, i) => (
                      <div key={i} className="text-center">
                        <span className="block">{t.label}</span>
                        <span className="block text-[8px] text-emerald-450 text-emerald-400">Rs. {t.value >= 1000 ? `${(t.value/1000).toFixed(0)}k` : t.value}</span>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* Chart 2: Account Status Distributions (Donut Block) */}
              <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Portfolio Segmentations
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Deals allocation by customer status behavior
                  </p>
                </div>

                {/* Custom Donut visual with pure CSS & SVGs */}
                <div className="bg-[#161619] border border-[#2e2e33] rounded-xl p-4 flex flex-col justify-between h-48 relative overflow-hidden">
                  <div className="flex items-center justify-center pt-2">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                      {/* Base Track */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#222" strokeWidth="3.2" />
                      
                      {/* Active Segments */}
                      {(() => {
                        const total = installments.length || 1;
                        const complPct = (completedAccountsCount / total) * 100;
                        const defPct = (totalDefaultersCount / total) * 100;
                        const activePct = 100 - complPct - defPct;

                        return (
                          <>
                            {/* Completed segment (Emerald) */}
                            <circle 
                              cx="18" cy="18" r="15.915" 
                              fill="none" 
                              stroke="#10b981" 
                              strokeWidth="3.2" 
                              strokeDasharray={`${complPct} ${100 - complPct}`} 
                              strokeDashoffset="0" 
                            />
                            {/* Defaulters segment (Rose) */}
                            <circle 
                              cx="18" cy="18" r="15.915" 
                              fill="none" 
                              stroke="#ef4444" 
                              strokeWidth="3.2" 
                              strokeDasharray={`${defPct} ${100 - defPct}`} 
                              strokeDashoffset={-complPct} 
                            />
                            {/* Active segment (Indigo) */}
                            <circle 
                              cx="18" cy="18" r="15.915" 
                              fill="none" 
                              stroke="#6366f1" 
                              strokeWidth="3.2" 
                              strokeDasharray={`${activePct} ${100 - activePct}`} 
                              strokeDashoffset={-(complPct + defPct)} 
                            />
                          </>
                        );
                      })()}
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="font-mono text-xs font-black text-white">{installments.length}</span>
                      <span className="text-[8px] uppercase font-bold text-slate-500 font-mono">Deals Total</span>
                    </div>
                  </div>

                  {/* Indicators legend */}
                  <div className="grid grid-cols-3 text-center gap-1 border-t border-[#2e2e33]/50 pt-2 text-[9px] font-mono font-bold">
                    <div>
                      <span className="text-emerald-400 block">• Completed</span>
                      <span className="text-[8px] text-slate-400 font-semibold">{completedAccountsCount} / {installments.length}</span>
                    </div>
                    <div>
                      <span className="text-indigo-400 block">• Active</span>
                      <span className="text-[8px] text-slate-400 font-semibold">{installments.length - completedAccountsCount - totalDefaultersCount}</span>
                    </div>
                    <div>
                      <span className="text-rose-400 block">• Defaulter</span>
                      <span className="text-[8px] text-slate-400 font-semibold">{totalDefaultersCount}</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* QUICK AUDIT HIGHLIGHT NOTES SECTION */}
            <div className="bg-[#161619] border border-[#2e2e33] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#af9268]/15 text-[#c5a880] rounded-xl shrink-0 mt-0.5 border border-[#af9268]/20">
                  <ShieldCheck size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#c5a880] uppercase tracking-wider font-mono">
                    Financial Recovery Operations System
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Double-ledger auditing matches counter collections immediately with live customer ledger cards. Filter high-risk default portfolios, apply delay penalties / fines, and download audit sheets with immediate bank alignment.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('registry')}
                className="px-4 py-2 bg-[#af9268] hover:bg-[#967d56] text-white font-extrabold text-xs rounded-xl transition shrink-0 uppercase tracking-wider self-start md:self-center font-mono cursor-pointer"
              >
                Inspect Installment Customers Table
              </button>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: CUSTOMER RECOVERY TABLE (19 COLUMNS)
            ======================================================== */}
        {activeTab === 'registry' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Search and filter controls panel */}
            <div className="flex flex-col lg:flex-row gap-3 justify-between items-center bg-[#111113] p-4 rounded-xl border border-[#2e2e33]">
              
              {/* Search text input */}
              <div className="relative w-full lg:max-w-md">
                <Search size={14} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search Customer, CNIC, Phone, Vehicle, Engine, Chassis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#161619] border border-[#2e2e33] rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 hover:border-slate-800 transition"
                />
              </div>

              {/* Quick behavior status filter */}
              <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto justify-end">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">Deals Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="bg-[#161619] border border-[#2e2e33] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer font-bold"
                >
                  <option value="All">All Installments</option>
                  <option value="Paid On Time">🟢 Paid / Healthy</option>
                  <option value="Active">🔵 Active (Awaiting Due)</option>
                  <option value="Overdue">🟠 Overdue (Arrears)</option>
                  <option value="Defaulter">🔴 Defaulters</option>
                  <option value="High Risk">⚠️ High Risk Delinquent</option>
                  <option value="Completed">🏆 Completed Contracts</option>
                </select>

                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('All');
                  }}
                  className="text-[10px] uppercase font-bold px-3 py-1.5 rounded-xl border border-[#2e2e33] text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Reset Filtering
                </button>
              </div>

            </div>

            {/* DENSE HORIZONTAL SCROLL 19-COLUMN TABLE CONTAINER */}
            <div className="overflow-x-auto border border-[#2e2e33] rounded-xl bg-[#111113]">
              <table className="w-full min-w-[2400px] text-left text-xs table-fixed">
                <thead className="bg-[#161619] border-b border-[#2e2e33] uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-3.5 w-48 shrink-0">1. Customer Name</th>
                    <th className="p-3.5 w-40 shrink-0">2. CNIC Number</th>
                    <th className="p-3.5 w-36 shrink-0">3. Phone Number</th>
                    <th className="p-3.5 w-44 shrink-0">4. Vehicle Model</th>
                    <th className="p-3.5 w-36 shrink-0">5. Reg Number</th>
                    <th className="p-3.5 w-36 shrink-0">6. Chassis Number</th>
                    <th className="p-3.5 w-36 shrink-0">7. Engine Number</th>
                    <th className="p-3.5 w-36 shrink-0 text-right">8. Total Price</th>
                    <th className="p-3.5 w-32 shrink-0 text-right">9. Down Payment</th>
                    <th className="p-3.5 w-36 shrink-0 text-right">10. Installment Amount</th>
                    <th className="p-3.5 w-32 shrink-0 text-right">11. Paid by Customer</th>
                    <th className="p-3.5 w-36 shrink-0 text-right">12. Remaining Balance</th>
                    <th className="p-3.5 w-36 shrink-0 text-right">13. Monthly Installment</th>
                    <th className="p-3.5 w-32 shrink-0 text-center">14. Due Installments</th>
                    <th className="p-3.5 w-36 shrink-0">15. Last Payment</th>
                    <th className="p-3.5 w-36 shrink-0">16. Next Due</th>
                    <th className="p-3.5 w-36 shrink-0">17. Installment End</th>
                    <th className="p-3.5 w-32 shrink-0">18. Customer behavior</th>
                    <th className="p-3.5 w-32 shrink-0">19. Recovery Status</th>
                    <th className="p-3.5 w-32 shrink-0 text-center">Ledger Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e21] font-semibold text-slate-300">
                  {filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan={20} className="p-10 text-center text-slate-500 italic bg-[#111113]">
                        No installment profiles matching the search query or status criteria. Expand your filter thresholds.
                      </td>
                    </tr>
                  ) : (
                    filteredPlans.map((p) => {
                      const installmentEnd = calculateEndDate(p.startDate, p.durationMonths);
                      const computedDueInstallments = Math.max(0, Math.ceil(p.adjustedBalance / p.monthlyInstallment));

                      return (
                        <tr 
                          key={p.id} 
                          className="hover:bg-[#161619]/55 transition-all duration-150 relative group"
                        >
                          {/* 1. Name */}
                          <td className="p-3 font-extrabold text-white truncate sticky left-0 bg-[#111113] group-hover:bg-[#161619]/90 border-r border-[#2e2e33]">
                            <span className="flex items-center gap-2">
                              {p.computedStatus === 'Defaulter' || p.computedStatus === 'High Risk' ? (
                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" />
                              ) : p.computedStatus === 'Completed' ? (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                              )}
                              <span className="truncate">{p.customerName}</span>
                            </span>
                          </td>
                          {/* 2. CNIC */}
                          <td className="p-3 font-mono tracking-wider">{p.customer?.cnic || 'N/A'}</td>
                          {/* 3. Phone */}
                          <td className="p-3 text-slate-350">{p.customer?.phone || 'N/A'}</td>
                          {/* 4. Model */}
                          <td className="p-3 truncate">{p.vehicleName}</td>
                          {/* 5. Reg */}
                          <td className="p-3 font-mono text-indigo-400 font-bold uppercase">{p.vehicleNumber}</td>
                          {/* 6. Chassis */}
                          <td className="p-3 font-mono text-slate-400 uppercase truncate">{p.vehicle?.chassisNumber || 'N/A'}</td>
                          {/* 7. Engine */}
                          <td className="p-3 font-mono text-slate-400 uppercase truncate">{p.vehicle?.engineNumber || 'N/A'}</td>
                          {/* 8. Total Price */}
                          <td className="p-3 text-right font-mono font-bold">Rs. {p.vehiclePrice.toLocaleString()}</td>
                          {/* 9. Down payment */}
                          <td className="p-3 text-right font-mono text-slate-400">Rs. {p.downPayment.toLocaleString()}</td>
                          {/* 10. Installment base */}
                          <td className="p-3 text-right font-mono text-slate-400">Rs. {p.remainingAmount.toLocaleString()}</td>
                          {/* 11. Paid customer */}
                          <td className="p-3 text-right font-mono text-emerald-400 font-extrabold">Rs. {p.totalPaid.toLocaleString()}</td>
                          {/* 12. Remaining Balance */}
                          <td className="p-3 text-right font-mono text-indigo-400 font-extrabold bg-slate-950/20">Rs. {p.adjustedBalance.toLocaleString()}</td>
                          {/* 13. Monthly Installment */}
                          <td className="p-3 text-right font-mono">Rs. {p.monthlyInstallment.toLocaleString()}</td>
                          {/* 14. Due Installments count */}
                          <td className="p-3 text-center font-mono font-bold text-slate-300">
                            {computedDueInstallments} pmts left
                          </td>
                          {/* 15. Last Payment */}
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{p.lastPaymentDate || 'No payments yet'}</td>
                          {/* 16. Next Due */}
                          <td className="p-3 text-amber-400 font-mono font-bold text-[11px]">{p.nextDueDate || 'Fully Paid'}</td>
                          {/* 17. Period Finish */}
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{installmentEnd}</td>
                          
                          {/* 18. Customer behavior */}
                          <td className="p-3">
                            <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded ${getStatusStyle(p.computedStatus)}`}>
                              {p.computedStatus}
                            </span>
                          </td>
                          {/* 19. Status Indicator pill */}
                          <td className="p-3">
                            {p.recoveryStatusColor === 'green' && (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1.5 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Paid/Healthy</span>
                              </span>
                            )}
                            {p.recoveryStatusColor === 'yellow' && (
                              <span className="text-[10px] text-amber-400 flex items-center gap-1.5 font-bold animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>Upcoming Due</span>
                              </span>
                            )}
                            {p.recoveryStatusColor === 'orange' && (
                              <span className="text-[10px] text-orange-400 flex items-center gap-1.5 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                <span>Late/Overdue</span>
                              </span>
                            )}
                            {p.recoveryStatusColor === 'red' && (
                              <span className="text-[10px] text-rose-500 flex items-center gap-1.5 font-black uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>Defaulter</span>
                              </span>
                            )}
                          </td>

                          {/* Action Button to launch selective Ledger */}
                          <td className="p-3 text-center sticky right-0 bg-[#111113] group-hover:bg-[#161619]/90 border-l border-[#2e2e33]">
                            <button
                              onClick={() => {
                                setSelectedPlanId(p.id);
                                setActiveTab('ledger');
                              }}
                              className="px-2.5 py-1.5 bg-[#af9268]/15 hover:bg-[#af9268] text-[#c5a880] hover:text-white border border-[#af9268]/20 hover:border-transparent text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer"
                            >
                              View Statement
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[10.5px] text-slate-500 px-1 font-mono flex items-center gap-1.5 mt-1">
              <Info size={12} className="text-[#af9268]" />
              <span>Rows highlighted adaptively in real-time. Use the static right sidebar actions to launch deep transaction ledgers.</span>
            </p>

          </div>
        )}

        {/* ========================================================
            TAB 3: DELINQUENCY COCKPIT (DEFAULTERS OUTREACH)
            ======================================================== */}
        {activeTab === 'defaulters' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* INFORMATIVE ALERTS BANNER */}
            <div className="p-5 bg-rose-950/20 border border-rose-900/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-rose-400">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl shrink-0 mt-0.5 border border-rose-500/20">
                  <AlertOctagon size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono text-rose-350">
                    Sovereign Outstanding Defaulters Dashboard
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    The lists below show active agreements where next installment calendars are past maturity. Review pending balances, add official recovery status logs, configure legal notices, and trigger recovery reminders.
                  </p>
                </div>
              </div>
              <span className="shrink-0 bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-black px-4 py-2 rounded-xl h-fit self-start md:self-center font-mono">
                {defaultersList.length} Accounts delinquent
              </span>
            </div>

            {/* THREE COLUMN SEARCH FILTERS FOR COCKPIT */}
            <div className="bg-[#111113] border border-[#2e2e33] p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              
              {/* Filter 1: By Month */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1 font-mono">Defaulters by Month</label>
                <select
                  value={defaulterMonth}
                  onChange={(e) => setDefaulterMonth(e.target.value)}
                  className="bg-[#161619] border border-[#2e2e33] w-full p-2.5 focus:border-[#af9268] rounded-xl text-xs text-white outline-none font-bold cursor-pointer"
                >
                  <option value="All">All Overdue Months</option>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Filter 2: By Amount */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1 font-mono">Remaining Balance {defaulterAmount > 0 ? `(> Rs. ${defaulterAmount.toLocaleString()})` : ''}</label>
                <select
                  value={defaulterAmount}
                  onChange={(e) => setDefaulterAmount(Number(e.target.value))}
                  className="bg-[#161619] border border-[#2e2e33] w-full p-2.5 focus:border-[#af9268] rounded-xl text-xs text-white outline-none font-bold cursor-pointer"
                >
                  <option value={0}>Any Defaulter Amount</option>
                  <option value={20000}>Remaining &gt; Rs. 20k PKR</option>
                  <option value={50000}>Remaining &gt; Rs. 50k PKR</option>
                  <option value={100000}>Remaining &gt; Rs. 100k PKR</option>
                  <option value={200000}>Remaining &gt; Rs. 200k PKR</option>
                </select>
              </div>

              {/* Filter 3: Vehicle selection */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1 font-mono">By Vehicle Model</label>
                <select
                  value={defaulterVehicle}
                  onChange={(e) => setDefaulterVehicle(e.target.value)}
                  className="bg-[#161619] border border-[#2e2e33] w-full p-2.5 focus:border-[#af9268] rounded-xl text-xs text-white outline-none font-bold cursor-pointer"
                >
                  <option value="All">All Vehicle Models</option>
                  {uniqueModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Recording Recovery officer */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1 font-mono">By Recording Officer</label>
                <select
                  value={defaulterOfficer}
                  onChange={(e) => setDefaulterOfficer(e.target.value)}
                  className="bg-[#161619] border border-[#2e2e33] w-full p-2.5 focus:border-[#af9268] rounded-xl text-xs text-white outline-none font-bold cursor-pointer"
                >
                  <option value="All">All Counter Officers</option>
                  {uniqueOfficers.map(off => (
                    <option key={off} value={off}>{off}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* DEFAULTERS CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              {defaultersList.length === 0 ? (
                <div className="p-12 text-center text-slate-500 border border-dashed border-[#2e2e33] rounded-2xl md:col-span-2 bg-[#111113]">
                  <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
                  <h5 className="font-extrabold text-white text-xs uppercase font-mono tracking-wider">Maturity Ledger Is Clean</h5>
                  <p className="text-[10.5px] text-slate-400 mt-1 max-w-sm mx-auto">
                    Outstanding ledger contains no defaulters matching these parameters! Let outstanding contracts mature or modify filters.
                  </p>
                </div>
              ) : (
                defaultersList.map((plan) => (
                  <div 
                    key={plan.id}
                    className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-5 hover:border-rose-950/60 transition-all flex flex-col justify-between gap-4 card-glow-rose relative overflow-hidden"
                  >
                    {/* Visual alarm strip */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600 via-orange-500 to-rose-600" />
                    
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] uppercase font-mono font-bold text-rose-400 bg-rose-950/30 border border-rose-900/40 px-2 py-0.5 rounded">
                          {plan.computedStatus} • Delay: {plan.overdueDays} Days
                        </span>
                        <h4 className="text-sm font-black text-white mt-1.5">{plan.customerName}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">Phone: {plan.customer?.phone}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block font-mono font-bold uppercase">Outstanding</span>
                        <span className="text-sm font-black font-mono text-rose-500">Rs. {plan.adjustedBalance.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Middle specs */}
                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-[#2e2e33]/50 text-[11px] font-semibold text-slate-350 bg-[#161619]/40 rounded-xl p-2.5">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 uppercase block font-mono">Collateral Car</span>
                        <span className="text-white block font-bold truncate">{plan.vehicleName}</span>
                        <span className="text-[9px] text-[#af9268] font-mono font-bold block">{plan.vehicleNumber}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 uppercase block font-mono">Amortization Due</span>
                        <span className="text-white block font-mono">Rs. {plan.monthlyInstallment.toLocaleString()} / mo</span>
                        <span className="text-[9px] text-slate-400 block">Due Date: {plan.nextDueDate}</span>
                      </div>
                    </div>

                    {/* Actionable note-entry form & reminder selector */}
                    <div className="space-y-3">
                      
                      {/* Reminder Status selector */}
                      <div className="flex items-center justify-between gap-3 text-xs bg-[#121214] p-2 rounded-xl border border-[#2e2e33]">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono select-none">Reminder Mode:</span>
                        <select
                          value={plan.reminder}
                          onChange={(e) => handleUpdateReminder(plan.id, e.target.value)}
                          className="bg-[#161619] border border-[#2e2e33] text-[10px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1 text-white outline-none focus:border-rose-500 transition cursor-pointer"
                        >
                          <option value="Not Sent">🔘 Not Sent</option>
                          <option value="Call Initiated">📞 Telephonic Call</option>
                          <option value="First Notice Delivered">📬 1st Notice Transmitted</option>
                          <option value="Refused Settle (Seizure)">🚨 Seizure Action Warrant</option>
                        </select>
                      </div>

                      {/* Notes persistence */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">Official Recovery Log notes</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={plan.note ? plan.note : "Insert current recovery outcome note..."}
                            className="bg-[#161619] border border-[#2e2e33] text-xs text-white placeholder-slate-500 rounded-xl px-3 py-2 w-full outline-none focus:border-rose-500 font-mono font-semibold"
                            id={`input-note-${plan.id}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveNote(plan.id, e.currentTarget.value);
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              const v = (document.getElementById(`input-note-${plan.id}`) as HTMLInputElement)?.value;
                              if (v) handleSaveNote(plan.id, v);
                            }}
                            className="px-3 bg-[#af9268] hover:bg-[#8e7450] text-white text-[10px] font-bold uppercase rounded-xl transition cursor-pointer font-mono shadow-md shrink-0"
                          >
                            Save
                          </button>
                        </div>
                        {plan.note && (
                          <div className="bg-rose-950/10 border border-rose-950/20 rounded-lg p-2 flex items-start gap-1.5 text-[10px] text-rose-350 font-mono mt-1">
                            <MessageSquare size={11} className="text-[#af9268] shrink-0 mt-0.5" />
                            <p className="leading-relaxed">"{plan.note}"</p>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Go to statements footer button */}
                    <button
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setActiveTab('ledger');
                      }}
                      className="w-full text-center py-2 bg-[#202024] hover:bg-slate-900 border border-[#2e2e33] hover:border-slate-700 text-[10px] text-slate-350 hover:text-white font-extrabold uppercase rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                    >
                      <span>Analyze Full Audit Invoice Statements</span>
                      <ChevronRight size={12} />
                    </button>

                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 4: RECOVERY AUDIT STATEMENT MODULE
            ======================================================== */}
        {activeTab === 'ledger' && (
          <div className="space-y-6 animate-fade-in print:bg-white print:text-black">
            
            {/* SEARCH SELECTOR DRAWER FOR INVOICER */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-[#111113] p-4 rounded-xl border border-[#2e2e33] print:hidden">
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase font-bold text-[#c5a880] font-mono tracking-wider">Select Customer Portfolio Tracker:</span>
                <select
                  value={selectedPlanId}
                  onChange={(e) => {
                    setSelectedPlanId(e.target.value);
                    setVerifyStatus('idle');
                  }}
                  className="bg-[#161619] border border-[#2e2e33] py-2 px-3 rounded-xl text-xs text-white outline-none focus:border-[#af9268] font-black cursor-pointer shadow-inner"
                >
                  <option value="">Choose debtor contract...</option>
                  {enrichedPlans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.customerName} • Reg: {plan.vehicleNumber} ({plan.computedStatus})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlan && (
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500 bg-slate-950/45 border border-[#2e2e33] rounded-xl px-3 py-1.5">
                  Contract ID: #{selectedPlan.id.slice(0, 8).toUpperCase()}
                </span>
              )}
            </div>

            {selectedPlan ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* LEFT COLUMN: CUSTOMER BIOGRAPHIC CARD & COLLATERAL SHEET */}
                <div className="lg:col-span-1 space-y-6 print:hidden">
                  
                  {/* Ledger summary & Progress card */}
                  <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-5 space-y-4">
                    <span className="text-[9px] uppercase font-mono font-black text-slate-500 tracking-widest block">Contract Clearance Progress</span>
                    
                    <div className="pt-2">
                      <div className="flex justify-between text-xs font-bold text-slate-300 font-mono mb-1.5">
                        <span>Total Settle Rate:</span>
                        <span className="text-emerald-450 text-emerald-400">
                          {selectedPlan.remainingAmount > 0 
                            ? ((selectedPlan.totalPaid / selectedPlan.remainingAmount) * 100).toFixed(1) 
                            : 0}%
                        </span>
                      </div>
                      
                      {/* Horizontal bar */}
                      <div className="w-full bg-[#1e1e21] rounded-full h-3.5 border border-[#2e2e33] overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-indigo-600 via-[#af9268] to-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, selectedPlan.remainingAmount > 0 
                              ? (selectedPlan.totalPaid / selectedPlan.remainingAmount) * 100 
                              : 0)}%` 
                          }}
                        />
                      </div>
                    </div>

                    {/* Numeric key-value breakdowns for statements */}
                    <div className="space-y-2 text-xs font-semibold text-slate-300 border-t border-[#2e2e33]/50 pt-4 font-mono">
                      <div className="flex justify-between">
                        <span>Sale Vehicle Price:</span>
                        <span>Rs. {selectedPlan.vehiclePrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Down Payment Paid:</span>
                        <span>- Rs. {selectedPlan.downPayment.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Amortized Core:</span>
                        <span className="text-white">Rs. {selectedPlan.remainingAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#2e2e33]/40 pb-2">
                        <span className="text-emerald-400">Total Regular Paid:</span>
                        <span className="text-emerald-400 font-black">+ Rs. {selectedPlan.totalPaid.toLocaleString()}</span>
                      </div>
                      {selectedPlan.customFine > 0 && (
                        <div className="flex justify-between text-rose-400 pt-1">
                          <span>Applied Penal Fines:</span>
                          <span className="font-bold">+ Rs. {selectedPlan.customFine.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-indigo-400 pt-2 text-sm border-t border-[#2e2e33] font-black">
                        <span>Ledger Net Unpaid:</span>
                        <span>Rs. {selectedPlan.adjustedBalance.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Action form to add fine to this client */}
                    <div className="bg-[#161619] border border-[#2e2e33] p-4 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between items-center bg-[#111113] p-1 px-2 rounded-lg border border-[#2e2e33]/40">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Apply Delay Fines Penalties</span>
                        {selectedPlan.customFine > 0 && (
                          <button
                            onClick={() => handleResetFines(selectedPlan.id)}
                            className="text-[9px] text-rose-400 underline uppercase tracking-wider font-extrabold flex items-center gap-1 cursor-pointer"
                            title="Purge custom fines"
                          >
                            <RotateCcw size={10} />
                            Reset Fines
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2.5">
                        <input
                          type="number"
                          placeholder="e.g. 1000, 5000"
                          value={fineInputAmount}
                          onChange={(e) => setFineInputAmount(e.target.value)}
                          className="bg-[#111113] border border-[#2e2e33] text-xs text-white placeholder-slate-500 rounded-xl px-3 py-2 w-full outline-none focus:border-rose-500 font-mono"
                        />
                        <button
                          onClick={() => {
                            const val = Number(fineInputAmount);
                            if (val > 0) handleApplyFine(selectedPlan.id, val);
                          }}
                          className="px-3 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-850 text-white font-extrabold text-[10px] rounded-xl transition cursor-pointer font-mono shrink-0 uppercase tracking-wide"
                        >
                          Charge Fine
                        </button>
                      </div>
                      <span className="text-[9.5px] text-slate-500 italic block leading-relaxed">
                        💡 Fine immediately updates balance sheet andoutstanding totals on statements ledger.
                      </span>
                    </div>

                  </div>

                  {/* Customer Biographical profile card */}
                  <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-5 space-y-4">
                    <span className="text-[9px] uppercase font-mono font-black text-slate-500 tracking-widest block">Customer Biographical Register</span>
                    
                    <div className="space-y-3 pt-2 text-xs">
                      <div>
                        <span className="text-[9px] text-[#c5a880] uppercase block font-mono">1. Primary Debtor Name</span>
                        <span className="text-white font-black text-sm block">{selectedPlan.customer?.name}</span>
                        <span className="text-[10px] text-slate-400">Father's Name: {selectedPlan.customer?.fatherName || 'N/A'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-mono">CNIC Number</span>
                          <span className="text-white font-mono break-all font-bold">{selectedPlan.customer?.cnic || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-mono">Primary Phone</span>
                          <span className="text-white font-mono font-bold">{selectedPlan.customer?.phone || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block font-mono">Residential Address</span>
                        <p className="text-slate-300 font-semibold leading-relaxed break-words">{selectedPlan.customer?.address || 'N/A'}</p>
                      </div>

                      {/* Guarantor block */}
                      <div className="pt-3 border-t border-[#2e2e33]/40 space-y-2">
                        <span className="text-[9.5px] uppercase font-mono font-black text-slate-400 block">Guarantor Endorsee card</span>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-mono">Guarantor full Name</span>
                          <span className="text-white font-bold block">{selectedPlan.customer?.guarantorName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-mono">Guarantor CNIC Code</span>
                          <span className="text-white font-mono font-bold">{selectedPlan.customer?.guarantorCnic || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* CENTRE + RIGHT SPACE: AUDITED STATEMENT SLIP & RECORDED PAYMENTS LEDGER */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* MAIN AUDIT STATEMENT PRINTER BLOCK */}
                  <div className="bg-[#111113] border border-[#2e2e33] rounded-2xl p-6 space-y-6 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
                    
                    {/* Invoice/Statement Header */}
                    <div className="flex justify-between items-start pb-4 border-b border-[#2e2e33] print:border-slate-350">
                      <div>
                        <div className="flex items-center gap-1.5 print:text-black">
                          <span className="font-mono text-xs uppercase font-extrabold text-[#af9268] print:text-slate-800">BAHERIA PREMIUM MOTORS</span>
                        </div>
                        <h3 className="text-base font-black text-white mt-1 uppercase print:text-black tracking-tight">Active Installment Account Ledger</h3>
                        <p className="text-[9.5px] text-slate-400 font-mono mt-0.5 print:text-slate-600">Reconciled portfolio records. Generated on {new Date().toISOString().split('T')[0]}</p>
                      </div>

                      {/* Barcode visual to feel premium */}
                      <div className="text-right flex flex-col items-end print:hidden">
                        <QrCode size={34} className="text-slate-500 stroke-[1.5]" />
                        <span className="text-[8px] font-mono text-slate-500 leading-none mt-1">SYSREF: #{selectedPlan.id.slice(0, 10).toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Collateral Vehicle details */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase font-mono font-black text-slate-400 block border-b border-[#2e2e33]/40 pb-1 flex items-center gap-1 print:text-slate-900 print:border-slate-300">
                        <Car size={11} className="text-[#af9268]" />
                        <span>Collateral Vehicle Attributes</span>
                      </h4>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-mono">Company Mode</span>
                          <span className="text-white font-bold block print:text-black">{selectedPlan.vehicle?.company || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-505 text-slate-500 uppercase block font-mono">Registration</span>
                          <span className="text-indigo-400 font-mono font-black uppercase block print:text-slate-900">{selectedPlan.vehicleNumber}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-505 text-slate-500 uppercase block font-mono">Engine Number</span>
                          <span className="text-white font-mono block print:text-black truncate" title={selectedPlan.vehicle?.engineNumber}>{selectedPlan.vehicle?.engineNumber || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-505 text-slate-500 uppercase block font-mono">Chassis Number</span>
                          <span className="text-white font-mono block print:text-black truncate" title={selectedPlan.vehicle?.chassisNumber}>{selectedPlan.vehicle?.chassisNumber || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold pt-1">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-mono">Car Color</span>
                          <span className="text-white font-bold block print:text-black">{selectedPlan.vehicle?.color || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-550 text-slate-505 uppercase block font-mono">Model specifications</span>
                          <span className="text-white block print:text-black">{selectedPlan.vehicleName}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-550 uppercase block font-mono">Settle Term</span>
                          <span className="text-white font-mono block print:text-black">{selectedPlan.durationMonths} Months duration</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-550 uppercase block font-mono">Installment End Date</span>
                          <span className="text-slate-300 font-mono block print:text-black font-bold">{calculateEndDate(selectedPlan.startDate, selectedPlan.durationMonths)}</span>
                        </div>
                      </div>
                    </div>

                    {/* COMPREHENSIVE PAST PAYMENTS RECORD GRID */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase font-mono font-black text-slate-400 block border-b border-[#2e2e33]/40 pb-1 flex items-center gap-1 print:text-slate-900 print:border-slate-300">
                        <DollarSign size={11} className="text-emerald-500" />
                        <span>Every Payment Record ledger entries</span>
                      </h4>

                      <div className="overflow-x-auto border border-[#2e2e33]/80 rounded-xl bg-[#161619]/40 print:bg-white print:border-slate-350">
                        <table className="w-full text-left text-[11px] table-fixed print:text-black">
                          <thead className="bg-[#161619] text-slate-400 uppercase font-bold text-[9px] tracking-wider border-b border-[#2e2e33]/80 print:bg-slate-100 print:text-black print:border-slate-350">
                            <tr>
                              <th className="p-3 w-28 shrink-0">Voucher Ref</th>
                              <th className="p-3 w-28 shrink-0">Remit Date</th>
                              <th className="p-3 w-28 shrink-0">Reconcile Mode</th>
                              <th className="p-3 w-24 shrink-0 text-right">Amount PKR</th>
                              <th className="p-3 w-32 shrink-0">Approved By</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1e1e21] text-slate-300 font-semibold print:divide-slate-200 print:text-black">
                            {selectedPlanPayments.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-505 font-sans bg-[#111113] italic print:bg-white">
                                  No transaction receipts recorded in the ledger database for this debtor yet. Settle installments via showcase desk or collections window.
                                </td>
                              </tr>
                            ) : (
                              selectedPlanPayments.map((p) => {
                                const isSelected = selectedReceiptId === p.id;
                                const theme = getMethodTheme(p.paymentMethod);
                                return (
                                  <tr 
                                    key={p.id} 
                                    onClick={() => handleRowClick(p)}
                                    className={`cursor-pointer transition-colors hover:bg-slate-900 border-l-4 leading-normal ${isSelected ? 'bg-indigo-950/20 font-bold border-indigo-500' : 'border-transparent'} print:bg-transparent print:hover:none print:text-black`}
                                    style={{
                                      borderLeftColor: isSelected ? theme.accent : 'transparent'
                                    }}
                                  >
                                    <td className="p-3 font-mono text-[#c5a880] print:text-slate-800 font-bold">
                                      {p.receiptNumber}
                                    </td>
                                    <td className="p-3 font-mono">{p.paymentDate}</td>
                                    <td className="p-3">
                                      <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${theme.pill} print:border-slate-300 print:bg-slate-100 print:text-black`}>
                                        {p.paymentMethod}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right font-mono font-extrabold text-[#11b981] print:text-slate-950">
                                      + Rs. {p.amount.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-slate-400 truncate print:text-slate-800 font-semibold text-[10.5px]">
                                      {p.recordedBy || 'Showroom Cashier'}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[10px] text-slate-505 text-slate-500 italic px-1 flex items-center gap-1.5 mt-1 print:hidden">
                        <Info size={11} className="text-[#af9268]" />
                        <span>Interactive Grid: Select any ledger entry row above to live stamp and preview the thermal voucher receipts modal.</span>
                      </p>
                    </div>

                    {/* VOUCHER MODAL CONTAINER NESTED INAUDIT INVOICE COCKPIT */}
                    {activeReceipt && (
                      <div className="pt-4 border-t border-dashed border-[#2e2e33] print:hidden">
                        <h4 className="text-[10px] uppercase font-mono font-bold text-[#c5a880] mb-3 flex items-center gap-1.5 select-none">
                          <Receipt size={13} className="text-[#af9268]" />
                          <span>Generated Handshake Thermal Invoice Slip</span>
                        </h4>

                        {/* Slip markup */}
                        {(() => {
                          const theme = getMethodTheme(activeReceipt.paymentMethod);
                          const signatureHash = `SHR-SEC-${activeReceipt.id.slice(0, 5).toUpperCase()}-${activeReceipt.receiptNumber}`;
                          
                          return (
                            <div className="relative rounded-2xl bg-[#141416] border border-[#2e2e33]/90 overflow-hidden text-slate-350">
                              <div className="h-1.5 w-full" style={{ backgroundColor: theme.accent }} />
                              
                              <div className="p-5 space-y-4">
                                <div className="text-center space-y-1">
                                  <div className="flex items-center justify-between text-[8px] font-mono tracking-wider text-slate-500 uppercase pb-2 border-b border-[#2e2e33]/50">
                                    <span>Voucher Mode: ALPS v2</span>
                                    <span>Term: #{activeReceipt.receiptNumber}</span>
                                    <span className="text-[#c5a880] font-bold">Showroom Copy</span>
                                  </div>
                                  <div className="pt-1.5">
                                    <h5 className="text-[12px] font-extrabold text-white tracking-widest font-mono uppercase">VERIFIED LEDGER POSTING</h5>
                                  </div>
                                </div>

                                <div className="bg-[#18181b] border border-[#2e2e33]/65 p-4 rounded-xl text-center">
                                  <p className="text-[8.5px] uppercase font-bold tracking-widest text-slate-500 font-mono">Remitted & Authorized amount</p>
                                  <div className="mt-1 flex items-baseline justify-center gap-1 font-mono">
                                    <span className="text-[11px] text-slate-500 font-bold">PKR</span>
                                    <h2 className="text-xl font-black text-white">{activeReceipt.amount.toLocaleString()}</h2>
                                    <span className="text-[9px] text-emerald-400">.00</span>
                                  </div>
                                  <span className={`inline-block text-[8px] tracking-wider uppercase font-bold mt-1 px-2 py-0.5 rounded border ${theme.pill}`}>
                                    {activeReceipt.paymentMethod} Settle
                                  </span>
                                </div>

                                <div className="space-y-1.5 text-[10.5px] font-sans">
                                  <div className="flex justify-between items-center py-1 border-b border-[#1e1e21]/40">
                                    <span className="text-slate-400">Receipt Ref # :</span>
                                    <span className="font-mono font-bold text-white">{activeReceipt.receiptNumber}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-[#1e1e21]/40">
                                    <span className="text-slate-400">Creditor Client :</span>
                                    <span className="font-bold text-white">{activeReceipt.customerName}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-[#1e1e21]/40">
                                    <span className="text-slate-400">Remit Timestamp :</span>
                                    <span className="font-mono text-slate-350">{activeReceipt.paymentDate}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-[#1e1e21]/40">
                                    <span className="text-slate-400">Official cashier :</span>
                                    <span className="text-slate-305 text-slate-300 font-bold">{activeReceipt.recordedBy || 'System Auditor'}</span>
                                  </div>
                                </div>

                                {activeReceipt.notes && (
                                  <div className="bg-[#18181b] p-2 rounded-lg border border-[#2e2e33]/50 text-[9.5px]">
                                    <span className="font-bold text-[#c5a880] block font-mono uppercase mb-0.5">Cashier Memo Logging</span>
                                    <p className="italic font-mono text-slate-300 leading-relaxed">"{activeReceipt.notes}"</p>
                                  </div>
                                )}

                                {/* Barcode */}
                                <div className="space-y-1.5 py-2 text-center bg-[#18181b]/30 border border-[#2e2e33]/40 rounded-xl relative group overflow-hidden">
                                  {/* Dynamic visual lines of varying widths */}
                                  <div className="flex justify-center items-center gap-[1.5px] py-1 select-none opacity-80">
                                    {Array.from({ length: 18 }).map((_, idx) => (
                                      <div 
                                        key={idx} 
                                        className="h-5 bg-slate-300 shrink-0" 
                                        style={{ width: idx % 3 === 0 ? '3px' : idx % 5 === 0 ? '4px' : '1.5px' }} 
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[8.5px] font-mono tracking-widest text-[#af9268] block mt-0.5">{signatureHash}</span>
                                </div>

                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                  </div>

                </div>

              </div>
            ) : (
              <div className="border border-dashed border-[#2e2e33] rounded-2xl p-12 text-center text-slate-500 bg-[#111113] h-64 flex flex-col justify-center items-center">
                <FileText size={28} className="text-slate-600 mb-2" />
                <h5 className="font-extrabold text-white text-xs uppercase font-mono tracking-wider">No Debtor Settle Contract Selected</h5>
                <p className="text-[10.5px] text-slate-400 max-w-sm mt-1 mx-auto leading-relaxed">
                  Choose an active installment customer portfolio record inside the selection dropdown drawer above to reconcile transaction ledgers or charge delay penalties.
                </p>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
