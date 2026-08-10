/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Search, 
  Plus, 
  Car, 
  User, 
  Calendar, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Briefcase
} from 'lucide-react';
import { Customer, Vehicle, InstallmentPlan, User as SessionUser } from '../types';

interface InstallmentManagementProps {
  customers: Customer[];
  vehicles: Vehicle[];
  installments: InstallmentPlan[];
  onAddInstallment: (plan: Omit<InstallmentPlan, 'id' | 'createdAt' | 'customerName' | 'vehicleName' | 'vehicleNumber' | 'totalPaid' | 'balance' | 'status'> & { saleType?: 'Installment' | 'Cash', commission?: number, salesmanId?: string, salesmanName?: string }) => Promise<any>;
  currentUser: SessionUser | null;
  allUsers?: any[];
}

export default function InstallmentManagement({ 
  customers, 
  vehicles, 
  installments, 
  onAddInstallment,
  currentUser,
  allUsers = []
}: InstallmentManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);

  // Success/Error Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Booking Form States
  const [formCustId, setFormCustId] = useState('');
  const [formVehId, setFormVehId] = useState('');
  const [formVehPrice, setFormVehPrice] = useState(0);
  const [formDownPayment, setFormDownPayment] = useState(0);
  const [formRemaining, setFormRemaining] = useState(0);
  const [formDuration, setFormDuration] = useState(12);
  const [formMonthlyInstallment, setFormMonthlyInstallment] = useState(0);
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDay, setFormDueDay] = useState(5);
  
  // Custom Salesman Tracking States
  const [formSaleType, setFormSaleType] = useState<'Installment' | 'Cash'>('Installment');
  const [formSalesmanId, setFormSalesmanId] = useState('');

  // Set default price when vehicle is chosen
  useEffect(() => {
    const chosenVeh = vehicles.find(v => v.id === formVehId);
    if (chosenVeh) {
      setFormVehPrice(chosenVeh.salePrice);
      if (formSaleType === 'Cash') {
        setFormDownPayment(chosenVeh.salePrice);
        setFormRemaining(0);
      } else {
        const rem = chosenVeh.salePrice - formDownPayment;
        setFormRemaining(rem > 0 ? rem : 0);
      }
    }
  }, [formVehId, vehicles, formSaleType]);

  // Handle price / downpayment updates
  useEffect(() => {
    if (formSaleType === 'Cash') {
      setFormDownPayment(formVehPrice);
      setFormRemaining(0);
    } else {
      const rem = formVehPrice - formDownPayment;
      setFormRemaining(rem > 0 ? rem : 0);
    }
  }, [formVehPrice, formDownPayment, formSaleType]);

  // Handle monthly installment autosuggestion
  useEffect(() => {
    if (formSaleType === 'Cash') {
      setFormMonthlyInstallment(0);
    } else if (formDuration > 0 && formRemaining > 0) {
      const suggest = Math.round(formRemaining / formDuration);
      setFormMonthlyInstallment(suggest);
    } else {
      setFormMonthlyInstallment(0);
    }
  }, [formRemaining, formDuration, formSaleType]);

  // List filtering
  const filteredPlans = installments.filter(p => {
    const matchesSearch = 
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openBookModal = () => {
    setErrorMsg('');
    setFormCustId('');
    setFormVehId('');
    setFormVehPrice(0);
    setFormDownPayment(0);
    setFormRemaining(0);
    setFormDuration(12);
    setFormMonthlyInstallment(0);
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormDueDay(5);
    setFormSaleType('Installment');
    setFormSalesmanId(currentUser?.role === 'Salesman' ? currentUser.id : '');
    setShowBookModal(true);
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formCustId || !formVehId || !formVehPrice || (formSaleType === 'Installment' && !formMonthlyInstallment)) {
      setErrorMsg('Required fields missing. Select Customer, Vehicle, and pricing/repayment terms.');
      return;
    }

    const salesmen = (allUsers || []).filter(u => u.role === 'Salesman');
    const selectedSalesman = salesmen.find(u => u.id === formSalesmanId);

    try {
      await onAddInstallment({
        customerId: formCustId,
        vehicleId: formVehId,
        vehiclePrice: Number(formVehPrice),
        downPayment: Number(formDownPayment),
        remainingAmount: Number(formRemaining),
        monthlyInstallment: Number(formMonthlyInstallment),
        durationMonths: Number(formDuration),
        startDate: formStartDate,
        dueDay: Number(formDueDay),
        saleType: formSaleType,
        salesmanId: formSalesmanId || (currentUser?.role === 'Salesman' ? currentUser.id : undefined),
        salesmanName: selectedSalesman ? selectedSalesman.name : (currentUser?.role === 'Salesman' ? currentUser.name : undefined)
      });
      setSuccessMsg(formSaleType === 'Cash' ? 'Cash sale completed successfully. Vehicle ownership fully assigned.' : 'Installment sale booked successfully. Down payment receipt generated.');
      setShowBookModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error booking transaction.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display">Installment Sales Plans</h2>
          <p className="text-xs text-slate-400 font-medium font-sans">Schedules, initial Down Payments, outstanding balances, month targets, and recovery standings</p>
        </div>
        <button
          id="btn-book-installment-trigger"
          onClick={openBookModal}
          className="bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs text-white px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(79,70,229,0.3)] cursor-pointer"
        >
          <Plus size={15} />
          Instigate Installment Sale
        </button>
      </div>

      {successMsg && (
        <div id="msg-inst-success" className="bg-emerald-500/10 text-emerald-400 p-4 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-500/25">
          <CheckCircle size={14} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div id="msg-inst-error" className="bg-rose-500/10 text-rose-400 p-4 rounded-lg text-xs font-semibold flex items-center gap-2 border border-rose-500/25">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}

      {/* Grid splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main database table */}
        <div className="bg-[#111113] border border-[#2e2e33] rounded-xl shadow-2xl overflow-hidden lg:col-span-2">
          <div className="p-4 border-b border-[#2e2e33] flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#161619]">
            <div className="flex items-center gap-2 bg-[#161619] border border-[#2e2e33] px-3.5 py-2.5 rounded-lg text-xs w-full sm:w-72 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
              <Search size={14} className="text-[#af9268] shrink-0" />
              <input 
                type="text" 
                placeholder="Search Client or Vehicle details..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent outline-none w-full text-white placeholder-slate-500 font-medium"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto py-1">
              {['All', 'Active', 'Overdue', 'Defaulter', 'Completed'].map((status) => (
                <button
                  id={`btn-inst-filter-${status}`}
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`text-[10px] uppercase font-bold px-3 py-2 rounded-lg transition-all ${
                    statusFilter === status 
                      ? 'bg-[#af9268] text-[#111113] shadow-[0_2px_12px_rgba(175,146,104,0.3)]' 
                      : 'bg-[#121214] text-slate-300 border border-[#2e2e33] hover:bg-[#1e1e22]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161619] border-b border-[#2e2e33] text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Vehicle Specs</th>
                  <th className="p-4 text-right">Remaining Balance</th>
                  <th className="p-4 text-right">Next Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e21] font-semibold text-slate-300">
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-500 bg-[#111113]">
                      No active installment agreements match current filter selections.
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => (
                    <tr 
                      key={plan.id} 
                      className={`hover:bg-[#1a1a1d] cursor-pointer transition ${selectedPlan?.id === plan.id ? 'bg-[#af9268]/10' : ''}`}
                      onClick={() => { setSelectedPlan(plan); setErrorMsg(''); setSuccessMsg(''); }}
                    >
                      <td className="p-4">
                        <span className="font-extrabold text-white block">{plan.customerName}</span>
                        <span className="text-[10px] text-slate-400 block font-medium">Created: {plan.startDate}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-extrabold text-white block">{plan.vehicleName}</span>
                        <span className="text-[10px] text-slate-400 block font-medium">Reg: {plan.vehicleNumber}</span>
                      </td>
                      <td className="p-4 text-right">
                        {plan.status === 'Completed' ? (
                          <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 font-bold uppercase text-[9px] px-2 py-0.5 rounded inline-block">Fully Settled</span>
                        ) : (
                          <>
                            <span className="block font-bold font-mono text-[#c5a880] text-sm">Rs. {plan.balance.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 font-medium block">Paid: Rs. {plan.totalPaid.toLocaleString()}</span>
                          </>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {plan.status === 'Completed' ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2.5 py-1 rounded inline-block font-sans">Active Completed</span>
                        ) : (
                          <>
                            <span className="text-[11px] font-mono font-bold block text-white">{plan.nextDueDate}</span>
                            <span className={`inline-block text-[9px] font-bold uppercase rounded px-2 py-0.5 mt-1 ${
                              plan.status === 'Defaulter' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20 animate-pulse' :
                              plan.status === 'Overdue' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {plan.status}
                            </span>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right side detailed pane views */}
        <div className="bg-[#111113] border border-[#2e2e33] rounded-xl p-5 shadow-2xl space-y-4 h-fit lg:sticky lg:top-4">
          {selectedPlan ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#2e2e33] pb-3">
                <div>
                  <h3 className="font-extrabold text-white leading-tight">Agreement Specification</h3>
                  <span className="text-[10px] text-slate-400 block font-semibold font-mono">Plan ID: {selectedPlan.id}</span>
                </div>
                <span className={`text-[9px] uppercase font-bold font-mono px-2.5 py-1 rounded border ${
                  selectedPlan.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
                  selectedPlan.status === 'Defaulter' ? 'bg-rose-500/15 text-rose-400 border-rose-500/20' : 'bg-[#af9268]/15 text-[#c5a880] border-[#af9268]/20'
                }`}>
                  {selectedPlan.status}
                </span>
              </div>

              {/* Data block grid */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Customer Name</span>
                  <span className="text-white font-extrabold block">{selectedPlan.customerName}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Vehicle Assigned</span>
                  <span className="text-white font-extrabold block">{selectedPlan.vehicleName}</span>
                </div>
                
                <div className="col-span-2 border-t border-[#2e2e33] pt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Showroom Sale Price</span>
                      <span className="text-white block font-mono">Rs. {selectedPlan.vehiclePrice.toLocaleString()}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Down Payment Done</span>
                      <span className="text-emerald-450 block font-mono text-emerald-400">Rs. {selectedPlan.downPayment.toLocaleString()}</span>
                    </div>
                    <div className="space-y-0.5 bg-[#17171a] p-2.5 rounded-lg border border-[#2e2e33]">
                      <span className="text-[9px] text-[#c5a880] uppercase tracking-wider block font-bold">Original Remaining Financed</span>
                      <span className="text-white block font-mono font-bold text-sm">Rs. {selectedPlan.remainingAmount.toLocaleString()}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Financed Period</span>
                      <span className="text-white block font-sans">{selectedPlan.durationMonths} Calendar Months</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 border-t border-[#2e2e33] pt-3 bg-indigo-500/5 p-3 rounded-lg border border-dashed border-indigo-500/20">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-300 uppercase tracking-wider block">Monthly Installment</span>
                      <span className="text-indigo-400 block font-bold font-mono text-sm">Rs. {selectedPlan.monthlyInstallment.toLocaleString()}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-300 uppercase tracking-wider block">Next Due Schedule</span>
                      <span className="text-indigo-400 block font-bold font-mono text-sm">{selectedPlan.nextDueDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress metrics */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>Repayment Progress</span>
                  <span className="font-mono">{Math.round((selectedPlan.totalPaid / selectedPlan.vehiclePrice) * 100)}%</span>
                </div>
                <div className="w-full h-2.5 bg-[#161619] border border-[#2e2e33] rounded-full overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition" 
                    style={{ width: `${Math.min(100, (selectedPlan.totalPaid / selectedPlan.vehiclePrice) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-300 font-mono mt-1">
                  <span className="bg-[#121214] border border-[#2e2e33] px-2.5 py-1 rounded">Paid: <strong className="text-emerald-400">Rs. {selectedPlan.totalPaid.toLocaleString()}</strong></span>
                  <span className="bg-[#121214] border border-[#af9268]/20 px-2.5 py-1 rounded">Remaining: <strong className="text-[#c5a880]">Rs. {selectedPlan.balance.toLocaleString()}</strong></span>
                </div>
              </div>

            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 space-y-3 bg-[#111113]">
              <div className="w-12 h-12 rounded-full bg-[#af9268]/10 border border-[#af9268]/20 flex items-center justify-center text-[#c5a880] mx-auto shadow-inner">
                <Calculator size={20} />
              </div>
              <h4 className="font-bold text-white font-display">No Plan Inspected</h4>
              <p className="text-[11px] max-w-[220px] mx-auto text-slate-400 leading-relaxed">Select any ongoing customer row from the left table view to audit scheduled metrics, financed balances, and collection progress indicators.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sale booking slider modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-[#080808]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111113] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-[#2e2e33] font-sans">
            <div className="p-6 border-b border-[#2e2e33] flex items-center justify-between bg-[#161619]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#af9268]/10 border border-[#af9268]/20 flex items-center justify-center shrink-0">
                  <Calculator size={16} className="text-[#c5a880]" />
                </div>
                <h3 className="font-bold text-xl text-white font-display tracking-tight">Instigate Installment Plan Agreement</h3>
              </div>
              <button onClick={() => setShowBookModal(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBookSubmit} className="p-6 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Picker */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wide">Target Customer Profile *</label>
                  <select 
                    value={formCustId} 
                    onChange={(e) => setFormCustId(e.target.value)}
                    className="w-full bg-[#161619] border border-[#2e2e33] focus:border-[#af9268] rounded-lg p-2.5 outline-none font-medium text-white"
                    required
                  >
                    <option value="" className="bg-[#111113]">-- Choose Showroom Client --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#111113]">{c.name} - CNIC: {c.cnic}</option>
                    ))}
                  </select>
                </div>

                {/* Vehicle Picker */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wide">Available Vehicle Unit *</label>
                  <select 
                    value={formVehId} 
                    onChange={(e) => setFormVehId(e.target.value)}
                    className="w-full bg-[#161619] border border-[#2e2e33] focus:border-[#af9268] rounded-lg p-2.5 outline-none font-medium text-white"
                    required
                  >
                    <option value="" className="bg-[#111113]">-- Select Showroom stock --</option>
                    {vehicles.filter(v => v.status === 'Available').map(v => (
                      <option key={v.id} value={v.id} className="bg-[#111113]">{v.company} {v.model} {v.variant} [Price: Rs.{v.salePrice.toLocaleString()}]</option>
                    ))}
                  </select>
                </div>

                {/* Sale Type Selector */}
                <div className="space-y-1 md:col-span-2 bg-[#161619] p-3.5 rounded-lg border border-[#2e2e33] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#c5a880] block uppercase tracking-wide">Deal Transaction Type *</span>
                    <span className="text-[10px] text-slate-400 font-medium">Choose between upfront cash settlement or custom financed repayment.</span>
                  </div>
                  <div className="flex bg-[#121214] p-1 rounded-lg border border-[#2e2e33] shrink-0">
                    <button
                      type="button"
                      onClick={() => setFormSaleType('Installment')}
                      className={`text-[10px] uppercase font-extrabold px-3 py-1.5 rounded-md transition duration-250 cursor-pointer ${formSaleType === 'Installment' ? 'bg-[#af9268] text-[#111113] shadow-[0_2px_10px_rgba(175,146,104,0.3)]' : 'text-slate-400 hover:text-white'}`}
                    >
                      Installment Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormSaleType('Cash')}
                      className={`text-[10px] uppercase font-extrabold px-3 py-1.5 rounded-md transition duration-250 cursor-pointer ${formSaleType === 'Cash' ? 'bg-emerald-500 text-white shadow-[0_2px_10px_rgba(16,185,129,0.3)]' : 'text-slate-400 hover:text-white'}`}
                    >
                      Outright Cash Sale
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2 border-t border-[#2e2e33] pt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Prices breakdown */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 block pb-1">Agreed Selling Price (Rs)</label>
                    <input 
                      type="number" 
                      value={formVehPrice} 
                      onChange={(e) => setFormVehPrice(Number(e.target.value))}
                      className="w-full bg-[#161619] border border-[#2e2e33] focus:border-[#af9268] rounded-lg p-2.5 font-mono text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#c5a880] block pb-1">Initial Down Payment (Rs)</label>
                    <input 
                      type="number" 
                      value={formDownPayment} 
                      disabled={formSaleType === 'Cash'}
                      onChange={(e) => setFormDownPayment(Number(e.target.value))}
                      className="w-full bg-[#161619] border border-[#af9268]/40 focus:border-[#af9268] rounded-lg p-2.5 font-mono text-white disabled:opacity-50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#c5a880] block uppercase tracking-wider pb-1">Remaining Balance</label>
                    <div className="w-full bg-[#18181b] border-2 border-[#af9268] rounded-lg p-2.5 font-mono font-extrabold text-[#c5a880] text-sm shadow-[0_0_15px_rgba(175,146,104,0.12)] flex items-center justify-between">
                      <span>Rs. {formRemaining.toLocaleString()}</span>
                      <span className="text-[8px] uppercase tracking-widest bg-[#af9268]/20 text-[#c5a880] px-1.5 py-0.5 rounded border border-[#c5a880]/30 animate-pulse font-sans">Live Financing</span>
                    </div>
                  </div>
                </div>

                {/* Schedulers */}
                {formSaleType === 'Installment' ? (
                  <div className="md:col-span-2 border-t border-[#2e2e33] pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 block pb-1">Installment Duration (Months)</label>
                      <select 
                        value={formDuration} 
                        onChange={(e) => setFormDuration(Number(e.target.value))}
                        className="w-full bg-[#161619] border border-[#2e2e33] focus:border-[#af9268] rounded-lg p-2.5 text-white outline-none"
                      >
                        <option value={3} className="bg-[#111113]">3 Months Plan</option>
                        <option value={6} className="bg-[#111113]">6 Months Plan</option>
                        <option value={12} className="bg-[#111113]">12 Months (1 Year)</option>
                        <option value={18} className="bg-[#111113]">18 Months Plan</option>
                        <option value={24} className="bg-[#111113]">24 Months (2 Years)</option>
                        <option value={36} className="bg-[#111113]">36 Months (3 Years)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#c5a880] block pb-1">Estimated Monthly Re-payment (Rs)</label>
                      <input 
                        type="number" 
                        value={formMonthlyInstallment} 
                        onChange={(e) => setFormMonthlyInstallment(Number(e.target.value))}
                        className="w-full bg-[#161619] border border-[#2e2e33] focus:border-[#af9268] rounded-lg p-2.5 font-mono font-bold text-white text-sm outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="md:col-span-2 border-t border-[#2e2e33] pt-3.5 bg-emerald-500/5 border border-dashed border-emerald-500/15 p-4 rounded-xl text-center select-none">
                    <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-widest block mb-1">Outright Upfront Cash Settlement Mode</span>
                    <p className="text-[10px] text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">This vehicle will be registered as sold with 100% immediate collection. No financed balances, overdue calculations, or recurring dues apply to this client ledger entry.</p>
                  </div>
                )}

                {/* Sales Agent Assignment */}
                <div className="md:col-span-2 border-t border-[#2e2e33] pt-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 block pb-1">Assigned Sales Agent *</label>
                    <select 
                      value={formSalesmanId} 
                      onChange={(e) => setFormSalesmanId(e.target.value)}
                      className="w-full bg-[#161619] border border-[#2e2e33] focus:border-[#af9268] rounded-lg p-2.5 text-white outline-none disabled:opacity-50"
                      disabled={currentUser?.role === 'Salesman'}
                    >
                      <option value="">-- No explicit salesman / Choose agent --</option>
                      {currentUser?.role === 'Salesman' ? (
                        <option value={currentUser.id}>{currentUser.name} (Myself)</option>
                      ) : (
                        (allUsers || []).filter(u => u.role === 'Salesman').map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2 border-t border-[#2e2e33] pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 block">Agreement Start Date</label>
                    <input 
                      type="date" 
                      value={formStartDate} 
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full bg-[#161619] border border-[#2e2e33] focus:border-[#af9268] rounded-lg p-2.5 font-mono text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 block">Monthly Due Day (e.g. 5th)</label>
                    <input 
                      type="number" 
                      min={1} 
                      max={28}
                      value={formDueDay} 
                      disabled={formSaleType === 'Cash'}
                      onChange={(e) => setFormDueDay(Number(e.target.value))}
                      className="w-full bg-[#161619] border border-[#2e2e33] focus:border-[#af9268] rounded-lg p-2.5 font-mono text-white disabled:opacity-50 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-3 pt-4 border-t border-[#2e2e33] bg-[#161619] -mx-6 -mb-6 p-6 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowBookModal(false)}
                  className="bg-transparent hover:bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-[#0c0c0e] hover:text-[#080808] px-6 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-widest transition-all duration-300 shadow-[0_4px_15px_rgba(165,134,90,0.25)] flex items-center gap-2"
                >
                  <CheckCircle size={14} />
                  Finalize Contract Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
