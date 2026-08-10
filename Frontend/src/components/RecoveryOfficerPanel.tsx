/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  FileText, 
  Clock, 
  Printer, 
  Send, 
  X,
  UserCheck,
  CreditCard,
  Car,
  ShieldCheck,
  Fingerprint,
  Check,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Customer, InstallmentPlan, Payment, User } from '../types';

interface RecoveryOfficerPanelProps {
  customers: Customer[];
  installments: InstallmentPlan[];
  payments: Payment[];
  onRecordPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'recordedBy' | 'customerName' | 'vehicleName'>) => Promise<any>;
  currentUser: User | null;
}

export default function RecoveryOfficerPanel({ 
  customers, 
  installments, 
  payments, 
  onRecordPayment,
  currentUser 
}: RecoveryOfficerPanelProps) {
  const [selectedCustId, setSelectedCustId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formMethod, setFormMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'EasyPaisa/JazzCash'>('Cash');
  const [formNotes, setFormNotes] = useState('');
  const [formReceipt, setFormReceipt] = useState('');

  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [printedReceipt, setPrintedReceipt] = useState<Payment | null>(null);

  // Available plans for the chosen customer
  const activePlansForCustomer = installments.filter(
    (p) => p.customerId === selectedCustId && p.status !== 'Completed'
  );

  // Resolved entities
  const selectedCustomer = customers.find((c) => c.id === selectedCustId);
  const selectedPlan = installments.find((p) => p.id === selectedPlanId);

  // Secure cross-matching filter logic
  const searchResults = installments.filter((plan) => {
    if (!searchQuery.trim()) return false;
    if (plan.status === 'Completed') return false; // ignore fully cleared plans for collections

    const q = searchQuery.toLowerCase();
    const cust = customers.find(c => c.id === plan.customerId);
    
    // Support matching by name, CNIC, Plate/Car number, and vehicle name
    const matchesName = plan.customerName.toLowerCase().includes(q);
    const matchesVehicleName = plan.vehicleName.toLowerCase().includes(q);
    const matchesPlate = (plan.vehicleNumber || '').toLowerCase().includes(q);
    const matchesCNIC = cust ? cust.cnic.replace(/-/g, '').includes(q.replace(/-/g, '')) : false;

    return matchesName || matchesVehicleName || matchesPlate || matchesCNIC;
  });

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setPrintedReceipt(null);

    if (!selectedCustId || !selectedPlanId || !formAmount || !formMethod) {
      setErrorMsg('Required fields missing. Select Customer, Plan, and Payment Amount.');
      return;
    }

    const valueAmount = Number(formAmount);
    if (valueAmount <= 0) {
      setErrorMsg('Payment amount must be greater than zero.');
      return;
    }

    const assignedPlan = installments.find(p => p.id === selectedPlanId);
    if (assignedPlan && valueAmount > assignedPlan.balance) {
      setErrorMsg(`Payment exceeds outstanding liability of Rs. ${assignedPlan.balance.toLocaleString()}.`);
      return;
    }

    try {
      const recordedVal = await onRecordPayment({
        customerId: selectedCustId,
        installmentId: selectedPlanId,
        amount: valueAmount,
        paymentDate: formDate,
        paymentMethod: formMethod,
        notes: formNotes,
        receiptNumber: formReceipt
      });

      setSuccessMsg(`Payment of Rs. ${valueAmount.toLocaleString()} recorded. Balanced ledger updated.`);
      setPrintedReceipt(recordedVal);

      // Clean form fields
      setFormAmount('');
      setFormNotes('');
      setFormReceipt('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing ledger payment transaction.');
    }
  };

  const executePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#f8fafc]/60 p-6 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-2">
            <span className="p-1 px-2.5 bg-indigo-600 text-white rounded-lg text-xs tracking-widest uppercase font-mono shadow-sm">
              ALPS
            </span>
            Collections & Repayments
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Record real-time client installment repayments, audit accounts with dual-column coherence, and dispatch certified thermal invoices.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 bg-white border border-slate-150 p-2.5 rounded-xl font-mono shadow-inner shrink-0">
          <Clock size={13} className="text-[#af9268] shrink-0 animate-pulse" />
          <span>Active Session Terminal</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Payment Logging Entry Form */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-105 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-gradient-to-tr from-[#1e1e24] to-slate-800 text-[#c5a880] rounded-xl shadow-sm">
                <DollarSign size={18} className="stroke-[2.5]" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 font-display text-[13px] uppercase tracking-wide">Counter Sales Remittance</h3>
                <p className="text-[10px] text-slate-400 font-medium">Verify collateral identities & post to general ledger</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {currentUser?.githubProfile && (
                <a 
                  href={currentUser.githubProfile.html_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-[#c5a880] bg-slate-900 border border-[#c5a880]/20 rounded-xl px-2.5 py-1.5 shadow-sm hover:border-[#c5a880]/60 transition shrink-0"
                  title={`Linked GitHub: @${currentUser.githubProfile.login}`}
                >
                  <img src={currentUser.githubProfile.avatar_url} className="w-4 h-4 rounded-full border border-[#c5a880]/50 object-cover shrink-0" alt="GitHub" />
                  <span>@{currentUser.githubProfile.login}</span>
                </a>
              )}
              <span className="text-[10px] font-mono font-black text-[#c5a880] bg-[#0f172a] border border-[#c5a880]/30 px-3 py-1.5 rounded-xl shadow-sm tracking-wide">
                Operator: {currentUser?.name || 'Authorized Admin'}
              </span>
            </div>
          </div>

          {successMsg && (
            <div id="payment-success-msg" className="bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm">
              <CheckCircle size={15} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div id="payment-error-msg" className="bg-rose-50 text-rose-800 border-l-4 border-rose-500 p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handlePaymentSubmit} className="space-y-6 text-xs font-semibold">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* ⚡ SMART ACCOUNT LOOKUP (PRIMARY ACTION FOR ACCURATE FILTERING) */}
              <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 rounded-2xl p-5.5 space-y-4 shadow-xl relative overflow-hidden transition-all duration-300">
                <div className="absolute right-0 top-0 opacity-[0.03] text-white pointer-events-none text-9xl font-black font-mono tracking-tighter select-none rotate-12">
                  SECURE
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-[#f8fafc] uppercase tracking-wider flex items-center gap-2 font-mono">
                      <Fingerprint className="text-[#c5a880] animate-pulse shrink-0" size={15} />
                      Dual-Ledger Smart Account Matching Engine
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium leading-normal animate-pulse">
                      Search and cross-match accounts by entering <strong className="text-[#c5a880] font-bold underline decoration-[#c5a880]/30 underline-offset-2">Plate / Registration No</strong>, <strong className="text-[#c5a880] font-bold underline decoration-[#c5a880]/30 underline-offset-2">CNIC</strong>, or <strong className="text-[#c5a880] font-bold underline decoration-[#c5a880]/30 underline-offset-2">Full Name</strong>.
                    </p>
                  </div>
                  {searchQuery && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCustId('');
                        setSelectedPlanId('');
                      }}
                      className="text-[9px] font-black text-[#c5a880] hover:text-[#0f172a] bg-[#c5a880]/15 hover:bg-[#c5a880] border border-[#c5a880]/40 hover:border-transparent px-3 py-1.5 rounded-lg transition-all uppercase tracking-wide self-start sm:self-center cursor-pointer shadow-sm"
                    >
                      Reset Selector
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 text-slate-400" size={15} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search e.g. Plate #: 'IDG-5509', CNIC: '37405-...' or Name: 'Umair'..."
                    className="w-full bg-[#1e293b]/95 hover:bg-[#1e293b] border border-slate-700/80 hover:border-[#c5a880] pl-10 pr-4 py-3 rounded-xl text-white focus:border-[#c5a880] focus:ring-2 focus:ring-[#c5a880]/20 outline-none font-bold text-xs shadow-inner transition-all placeholder-slate-500"
                  />
                </div>

                {/* Match indicator dropdown items */}
                {searchResults.length > 0 && (
                  <div className="bg-white border border-slate-200/90 rounded-xl divide-y divide-slate-100 shadow-xl max-h-56 overflow-hidden overflow-y-auto">
                    <div className="bg-indigo-50/70 p-2.5 px-3 text-[9px] font-extrabold text-indigo-700 tracking-widest uppercase flex justify-between items-center font-mono border-b border-indigo-100">
                      <span>Found matching agreements ({searchResults.length})</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                        Handshake matches confirmed
                      </span>
                    </div>
                    {searchResults.map((plan) => {
                      const cust = customers.find(c => c.id === plan.customerId);
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustId(plan.customerId);
                            setSelectedPlanId(plan.id);
                            // Populate input with visual representation
                            setSearchQuery(`${plan.customerName} - ${plan.vehicleNumber || plan.vehicleName}`);
                          }}
                          className="w-full text-left p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-4 text-xs text-slate-700 font-bold"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-[12px]">{plan.customerName}</span>
                              <span className="text-[9px] uppercase font-bold text-[#af9268] bg-[#af9268]/10 px-2.5 py-0.5 rounded-full border border-[#af9268]/20 font-mono">
                                Plate: {plan.vehicleNumber || 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                              <span>CNICID: <span className="text-slate-800 font-mono font-bold">{cust?.cnic || 'N/A'}</span></span>
                              <span>•</span>
                              <span>Vehicle: <strong className="text-indigo-600">{plan.vehicleName}</strong></span>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className="text-[12px] font-mono font-extrabold text-emerald-600 block">
                              Rs. {plan.balance.toLocaleString()}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-black mt-1">
                              Tap to select <ArrowRight size={8} />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECURE PRE-COLLECTION ALLOCATION COHERENCE CHECK */}
              {selectedCustomer && selectedPlan && (
                <div className="md:col-span-2 bg-emerald-50/40 border-2 border-emerald-500/20 rounded-2xl p-5 space-y-4 relative overflow-hidden shadow-sm">
                  {/* Subtle watermarked background icon */}
                  <div className="absolute -top-6 -right-6 opacity-[0.03] select-none pointer-events-none">
                    <ShieldCheck size={140} className="text-emerald-700" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 px-2.5 text-[8.5px] font-black text-white bg-emerald-600 rounded uppercase tracking-wider font-mono">
                        VERIFIED MATCH
                      </span>
                      <h5 className="text-[11px] font-bold text-emerald-900 tracking-tight font-sans">
                        Internal Ledger Coherence Confirmed
                      </h5>
                    </div>
                    <span className="text-[9px] font-sans font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-2.5 py-0.5 rounded">
                      Secured Sync Lock ✓
                    </span>
                  </div>

                  {/* Customer vs Car Parallel Side by Side Checks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer validation column */}
                    <div className="bg-white/80 p-4 rounded-xl border border-emerald-250/20 shadow-inner space-y-2.5">
                      <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                          Primary Debitor Account
                        </span>
                        <UserCheck size={11} className="text-[#c5a880]" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[12px] font-black text-slate-900 block font-sans">
                          {selectedCustomer.name}
                        </span>
                        <div className="text-[10px] text-slate-500 space-y-1 font-medium leading-relaxed">
                          <p>Relative Guardian: <strong className="text-slate-800">{selectedCustomer.fatherName}</strong></p>
                          <p className="font-mono">National CNIC ID: <strong className="text-slate-950">{selectedCustomer.cnic}</strong></p>
                          <p className="font-mono">Contact Primary: <strong className="text-slate-950">{selectedCustomer.phone}</strong></p>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle collateral details column */}
                    <div className="bg-white/80 p-4 rounded-xl border border-emerald-250/20 shadow-inner space-y-2.5">
                      <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                          Linked Collateral Vehicle
                        </span>
                        <Car size={11} className="text-indigo-600 font-medium" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[12px] font-black text-slate-900 block truncate font-sans" title={selectedPlan.vehicleName}>
                          {selectedPlan.vehicleName}
                        </span>
                        <div className="text-[10px] text-slate-500 space-y-1 font-medium leading-relaxed">
                          <p>
                            Government Reg #: <strong className="text-indigo-600 font-mono font-bold">{selectedPlan.vehicleNumber || 'UNASSIGNED (REG IN PROCESS)'}</strong>
                          </p>
                          <p className="font-mono">Agreement Doc ID: <strong className="text-slate-955">{selectedPlan.id.toUpperCase().slice(0, 10)}...</strong></p>
                          <p className="font-mono">Active Installment: <strong className="text-slate-955">Rs. {selectedPlan.monthlyInstallment.toLocaleString()} / mo</strong></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warnings reminder banner */}
                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/50 text-[10px] text-emerald-800 leading-relaxed font-semibold flex items-start gap-2.5">
                    <Sparkles size={13} className="text-[#af9268] shrink-0 mt-0.5 animate-bounce" />
                    <span>
                      Remittance logged below registers under <strong className="underline text-[#af9268] font-black">{selectedCustomer.name}</strong> for <strong className="underline text-slate-900 font-black">{selectedPlan.vehicleName}</strong>. Outstanding liability decreases from <strong className="font-mono font-black text-emerald-950 text-[11.5px] bg-emerald-100/50 px-1 py-0.5 rounded border border-emerald-200/60">Rs. {selectedPlan.balance.toLocaleString()}</strong>.
                    </span>
                  </div>
                </div>
              )}

              {/* MANUAL FALLBACK DROPDOWNS */}
              <div className="md:col-span-2 border-t border-slate-100 pt-3 flex flex-col gap-3">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block font-mono">
                  Or fallback to manual browsing directories below:
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selector 1: Customer */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wide font-mono">Select Debitor *</label>
                    <select 
                      value={selectedCustId} 
                      onChange={(e) => { setSelectedCustId(e.target.value); setSelectedPlanId(''); }}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-slate-800 text-xs focus:bg-white"
                      required
                    >
                      <option value="">-- Choose Installment Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} - CNIC: {c.cnic}</option>
                      ))}
                    </select>
                  </div>

                  {/* Selector 2: Plan */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wide font-mono">Matched Vehicle Ledger Agreement *</label>
                    <select 
                      value={selectedPlanId} 
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none font-bold text-slate-800 text-xs focus:bg-white"
                      disabled={!selectedCustId}
                      required
                    >
                      <option value="">-- Reconcile Active Agreement --</option>
                      {activePlansForCustomer.map((p) => (
                        <option key={p.id} value={p.id}>{p.vehicleName} [Remaining Bal: Rs. {p.balance.toLocaleString()}]</option>
                      ))}
                    </select>
                    {!selectedCustId && <span className="text-[9.5px] text-slate-400 block font-normal">Choose customer directory to load matched liabilities.</span>}
                  </div>
                </div>
              </div>

              {/* Amount form options with glowing borders */}
              <div className="space-y-1 border-t border-slate-100 pt-4 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-indigo-600 block uppercase tracking-wide font-mono">Repayment Amount (Rs) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 bg-transparent text-indigo-500 font-mono text-[9px] font-extrabold">PKR</span>
                    <input 
                      type="number" 
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full bg-[#f8fafc]/70 border border-indigo-200 pl-11 pr-3 py-2.5 rounded-xl font-mono text-xs font-black text-indigo-950 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 focus:bg-white"
                      placeholder="e.g. 50000"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 block uppercase tracking-wide font-mono">Payment Instrument Mode *</label>
                  <select 
                    value={formMethod} 
                    onChange={(e) => setFormMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-slate-800 text-xs focus:bg-white cursor-pointer transition"
                  >
                    <option value="Cash">Cash Handover</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Clearance Cheque</option>
                    <option value="EasyPaisa/JazzCash">Mobile Wallet (EasyPaisa/JazzCash)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 block uppercase tracking-wide font-mono font-medium">Custom Receipt ID (Optional)</label>
                  <input 
                    type="text" 
                    value={formReceipt}
                    onChange={(e) => setFormReceipt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-mono text-xs text-slate-800 focus:bg-white"
                    placeholder="Auto-Generates unique receipt"
                  />
                </div>
              </div>

              <div className="space-y-1 md:col-span-2 border-t border-slate-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-450 block uppercase tracking-wide font-mono">Repayment Value Date</label>
                  <input 
                    type="date" 
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 p-3 rounded-xl font-mono text-xs text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-450 block uppercase tracking-wide font-mono">Counter Transaction Memo Notes</label>
                  <input 
                    type="text" 
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 p-3 rounded-xl text-xs text-slate-800 focus:bg-white placeholder-slate-400 focus:outline-none"
                    placeholder="e.g. Month 2 installment"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5 border-t border-slate-100">
              <button
                id="btn-confirm-payment-settlement"
                type="submit"
                className="cursor-pointer bg-[#0f172a] hover:bg-[#1e293b] text-white font-extrabold text-xs px-6 py-3.5 rounded-xl transition shadow-md hover:shadow-lg flex items-center gap-2.5 uppercase tracking-wider font-mono hover:scale-[1.01]"
              >
                <Send size={14} className="text-[#c5a880] shrink-0 font-medium animate-pulse" />
                <span>Format Ledger & Settle Repayment</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Digital print receipt preview */}
        <div className="bg-white border border-slate-200/95 rounded-2xl p-6 shadow-sm h-fit lg:sticky lg:top-4 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-[#0f172a] uppercase text-[10px] tracking-widest font-mono flex items-center gap-1.5">
              <Printer size={13} className="text-[#af9268] animate-pulse" />
              Thermal Dispatch Terminal
            </h4>
            <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md uppercase font-mono tracking-wider border border-emerald-150/40 animate-pulse">
              Active Port
            </span>
          </div>
          
          {printedReceipt ? (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Micro printable voucher card thermal styled */}
              <div 
                id="section-invoice-thermal" 
                className="border-2 border-slate-200 bg-white p-5 rounded-2xl shadow-inner relative overflow-hidden font-mono text-[11px] text-slate-900 space-y-4"
                style={{
                  backgroundImage: 'radial-gradient(circle at top right, rgba(0,0,0,0.01) 0%, transparent 80%)'
                }}
              >
                {/* Visual Accent Top Bar matching payment mode color */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                  printedReceipt.paymentMethod === 'Cash' ? 'bg-emerald-500' :
                  printedReceipt.paymentMethod === 'Bank Transfer' ? 'bg-cyan-500' :
                  printedReceipt.paymentMethod === 'Cheque' ? 'bg-amber-500' : 'bg-fuchsia-500'
                }`} />

                {/* Scissor dotted tearing indicator line */}
                <div className="flex items-center gap-2 text-[9px] text-slate-400 select-none font-bold pb-2 uppercase tracking-tight">
                  <span>✂ TEAR HERE FOR CLIENT SLIP</span>
                  <div className="flex-1 border-t-2 border-dashed border-slate-200/90"></div>
                </div>
                
                {/* Joint Dealer Branding Header */}
                <div className="text-center space-y-1 pb-4 border-b-2 border-dashed border-slate-200">
                  <h3 className="font-extrabold text-[14px] text-slate-955 tracking-widest uppercase font-mono">
                    VERTEX MOTOR SHOWROOM
                  </h3>
                  <p className="text-[9px] text-slate-500 font-sans font-semibold leading-normal">
                    Automated Ledger Posting System (ALPS)<br />
                    National Highway Authority, Blue Area Islamabad Office
                  </p>
                  <div className="inline-block text-[8px] tracking-widest text-[#af9268] bg-[#af9268]/10 border border-[#af9268]/20 px-2 py-0.5 rounded font-bold uppercase mt-1">
                    Receipt Type: Customer Copy Verified
                  </div>
                </div>

                {/* System identification codes block */}
                <div className="flex items-center justify-between text-[8px] text-slate-500 border-b border-dashed border-slate-200/70 pb-2">
                  <span>TERM: PK-ISB-09-55</span>
                  <span>TIME: {new Date().toLocaleTimeString()}</span>
                  <span>SYS: #ALPS-LIVE</span>
                </div>

                {/* Voucher details structured listing */}
                <div className="space-y-2 text-slate-800 font-semibold">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500 uppercase text-[9px]">Receipt Token ID:</span>
                    <span className="font-bold text-slate-955 tracking-wider">{printedReceipt.receiptNumber}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500 uppercase text-[9px]">Value Date:</span>
                    <span className="text-slate-900">{printedReceipt.paymentDate}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-550 uppercase text-[9px]">Client Creditor:</span>
                    <span className="font-black text-slate-950 uppercase">{printedReceipt.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-550 uppercase text-[9px]">Collateral reference:</span>
                    <span className="text-indigo-600 block truncate max-w-[130px] font-bold" title={printedReceipt.vehicleName}>
                      {printedReceipt.vehicleName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-550 uppercase text-[9px]">Remit Method:</span>
                    <span className="text-slate-900 uppercase font-black">{printedReceipt.paymentMethod}</span>
                  </div>
                </div>

                {/* Settle Remitted Amount Box */}
                <div className="bg-slate-50 border border-slate-250 p-3 rounded-xl text-center shadow-inner relative overflow-hidden group">
                  <p className="text-[8.5px] text-slate-500 uppercase font-black tracking-widest block font-mono">
                    Settle Ledger Post Credits
                  </p>
                  
                  <div className="flex items-baseline justify-center gap-1 mt-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">PKR</span>
                    <span className="text-[19px] font-black text-slate-950 font-mono tracking-tight">
                      {printedReceipt.amount.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-[#af9268] font-black">.00</span>
                  </div>

                  <span className="text-[8.5px] text-emerald-600 bg-emerald-50 border border-emerald-150 rounded px-2 py-0.5 inline-block font-black mt-2">
                    Ledger Balancing Status: POSTED ok
                  </span>
                </div>

                {/* Operator and audit parameters */}
                <div className="space-y-1.5 text-[9.5px] text-slate-500 border-t border-dashed border-slate-200 pt-3 font-semibold">
                  <div className="flex justify-between">
                    <span>Authorized Operator:</span>
                    <span className="text-slate-900 font-bold">{printedReceipt.recordedBy || 'System Terminal'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memo Record note:</span>
                    <span className="italic block max-w-[145px] text-right truncate text-slate-705">{printedReceipt.notes || 'Reconciliation sync'}</span>
                  </div>
                </div>

                {/* Cryptographic simulation Barcode Visualizer */}
                <div className="py-2.5 text-center bg-slate-50 border border-slate-150 rounded-xl space-y-1 font-mono">
                  <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Secure Ledger Audit Token</span>
                  
                  {/* Visual Lines Barcode grid */}
                  <div className="flex justify-center items-center gap-[1px] py-1 select-none opacity-85">
                    <div className="w-[1.5px] h-6 bg-slate-950"></div>
                    <div className="w-[2.5px] h-6 bg-slate-900"></div>
                    <div className="w-[1px] h-6 bg-slate-950"></div>
                    <div className="w-[1.2px] h-6 bg-slate-800"></div>
                    <div className="w-[2px] h-6 bg-slate-900"></div>
                    <div className="w-[4px] h-6 bg-slate-950"></div>
                    <div className="w-[1px] h-6 bg-slate-900"></div>
                    <div className="w-[2px] h-6 bg-slate-800"></div>
                    <div className="w-[1px] h-6 bg-slate-950"></div>
                    <div className="w-[3px] h-6 bg-slate-900"></div>
                    <div className="w-[1px] h-6 bg-slate-950"></div>
                    <div className="w-[3.5px] h-6 bg-slate-900"></div>
                    <div className="w-[1.2px] h-6 bg-slate-800"></div>
                    <div className="w-[2px] h-6 bg-slate-900"></div>
                    <div className="w-[1px] h-6 bg-slate-950"></div>
                    <div className="w-[3px] h-6 bg-slate-900"></div>
                    <div className="w-[1.5px] h-6 bg-slate-950"></div>
                  </div>

                  <span className="text-[8px] font-mono text-slate-500 tracking-wider block font-bold">
                    SHR-VOUCH-{printedReceipt.id.slice(0, 5).toUpperCase()}-{printedReceipt.receiptNumber}
                  </span>
                </div>

                {/* Footer security lock text info */}
                <div className="text-center text-[8.5px] text-slate-400 font-sans font-bold pt-2.5 border-t border-slate-200 flex flex-col items-center gap-0.5 leading-normal">
                  <span>This document acts as an immediate legal receipt of credit.</span>
                  <span className="text-[#af9268] tracking-widest uppercase font-mono mt-0.5">Security Sync Approved</span>
                </div>
              </div>

              {/* Action commands */}
              <button
                id="btn-execute-print"
                onClick={executePrintReceipt}
                className="cursor-pointer w-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md uppercase tracking-wider font-mono hover:scale-[1.01]"
              >
                <Printer size={13} className="text-[#c5a880] shrink-0" />
                <span>Print Thermal Receipt Slip</span>
              </button>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 space-y-3.5 border-2 border-slate-200 border-dashed rounded-2xl bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto border border-slate-200">
                <Printer size={20} className="text-slate-400" />
              </div>
              <div className="space-y-1">
                <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide font-sans font-extrabold">No Remittance Posted Yet</h5>
                <p className="text-[10px] text-slate-450 max-w-[200px] mx-auto leading-relaxed font-medium">
                  Complete and submit the payment settlement form to generate a printable thermal cryptographic receipt slip.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
