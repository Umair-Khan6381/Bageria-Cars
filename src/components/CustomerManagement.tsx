/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  X, 
  Phone, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileCode,
  Upload,
  UserCheck
} from 'lucide-react';
import { Customer, InstallmentPlan, Payment, User } from '../types';

interface CustomerManagementProps {
  customers: Customer[];
  installments: InstallmentPlan[];
  payments: Payment[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<any>;
  onEditCustomer: (id: string, customer: Partial<Customer>) => Promise<any>;
  onDeleteCustomer: (id: string) => Promise<any>;
  currentUser: User | null;
}

export default function CustomerManagement({ 
  customers, 
  installments, 
  payments, 
  onAddCustomer, 
  onEditCustomer, 
  onDeleteCustomer,
  currentUser
}: CustomerManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form States
  const [formName, setFormName] = useState('');
  const [formFatherName, setFormFatherName] = useState('');
  const [formCnic, setFormCnic] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAlternatePhone, setFormAlternatePhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formGuarantorName, setFormGuarantorName] = useState('');
  const [formGuarantorCnic, setFormGuarantorCnic] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formDocs, setFormDocs] = useState<string[]>([]);

  // Filtering
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnic.includes(searchTerm) ||
    c.phone.includes(searchTerm)
  );

  // Helper file uploader base64 proxy
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isDoc = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Str = reader.result as string;
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, base64Data: base64Str })
        });
        const data = await res.json();
        if (data.url) {
          if (isDoc) {
            setFormDocs(prev => [...prev, data.url]);
          } else {
            setFormPhoto(data.url);
          }
        }
      } catch (err) {
        console.error('Upload fail', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const openAddModal = () => {
    setErrorMsg('');
    setFormName('');
    setFormFatherName('');
    setFormCnic('');
    setFormPhone('');
    setFormAlternatePhone('');
    setFormAddress('');
    setFormGuarantorName('');
    setFormGuarantorCnic('');
    setFormPhoto('');
    setFormDocs([]);
    setShowAddModal(true);
  };

  const openEditModal = (cust: Customer) => {
    setErrorMsg('');
    setSelectedCustomer(cust);
    setFormName(cust.name);
    setFormFatherName(cust.fatherName);
    setFormCnic(cust.cnic);
    setFormPhone(cust.phone);
    setFormAlternatePhone(cust.alternatePhone);
    setFormAddress(cust.address);
    setFormGuarantorName(cust.guarantorName);
    setFormGuarantorCnic(cust.guarantorCnic);
    setFormPhoto(cust.photoUrl || '');
    setFormDocs(cust.documents || []);
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formName || !formCnic || !formPhone) {
      setErrorMsg('Name, CNIC and primary Phone are required.');
      return;
    }

    try {
      await onAddCustomer({
        name: formName,
        fatherName: formFatherName,
        cnic: formCnic,
        phone: formPhone,
        alternatePhone: formAlternatePhone,
        address: formAddress,
        guarantorName: formGuarantorName,
        guarantorCnic: formGuarantorCnic,
        photoUrl: formPhoto,
        documents: formDocs
      });
      setSuccessMsg('Customer added successfully!');
      setShowAddModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving customer details.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await onEditCustomer(selectedCustomer.id, {
        name: formName,
        fatherName: formFatherName,
        cnic: formCnic,
        phone: formPhone,
        alternatePhone: formAlternatePhone,
        address: formAddress,
        guarantorName: formGuarantorName,
        guarantorCnic: formGuarantorCnic,
        photoUrl: formPhoto,
        documents: formDocs
      });
      setSuccessMsg('Customer updated successfully!');
      setShowEditModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed updating customer.');
    }
  };

  const confirmDelete = (cust: Customer) => {
    setCustomerToDelete(cust);
  };

  const handleExecuteDelete = async () => {
    if (!customerToDelete) return;
    const id = customerToDelete.id;
    setCustomerToDelete(null);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await onDeleteCustomer(id);
      setSuccessMsg('Customer profile removed successfully.');
      setSelectedCustomer(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Cannot delete customer because of active loan liabilities.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display">Installment Customer Profile</h2>
          <p className="text-xs text-slate-400">Secure record directories for clients, guarantors, CNICs and photos</p>
        </div>
        <button
          id="btn-add-customer-trigger"
          onClick={openAddModal}
          className="bg-indigo-600 text-white font-semibold text-xs px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
        >
          <Plus size={15} />
          Add Customer Record
        </button>
      </div>

      {successMsg && (
        <div id="msg-cust-success" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 p-4 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={14} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div id="msg-cust-error" className="bg-rose-500/11 text-rose-400 border border-rose-500/25 p-4 rounded-lg text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}

      {/* Main split grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: searchable data table */}
        <div className="bg-[#111113] border border-[#2e2e33] rounded-xl shadow-2xl overflow-hidden lg:col-span-2">
          <div className="p-4 border-b border-[#2e2e33] flex items-center gap-3 bg-[#161619] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
            <Search size={15} className="text-[#af9268] shrink-0" />
            <input 
              type="text" 
              placeholder="Search by Name, CNIC, or Mobile..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs text-white bg-transparent outline-none w-full placeholder-slate-500 font-medium"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161619] border-b border-[#2e2e33] uppercase text-slate-400 font-bold tracking-wider">
                <tr>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">CNIC Number</th>
                  <th className="p-4">Primary Phone</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e21] font-medium text-slate-300">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 font-sans">
                      No customer directories match the search parameters.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-[#1a1a1d] transition cursor-pointer ${selectedCustomer?.id === c.id ? 'bg-[#af9268]/10' : ''}`}
                      onClick={() => { setSelectedCustomer(c); setErrorMsg(''); setSuccessMsg(''); }}
                    >
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-[#2e2e33] overflow-hidden bg-[#161619] flex items-center justify-center shrink-0">
                          {c.photoUrl ? (
                            <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users size={16} className="text-slate-500" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{c.name}</span>
                          <span className="text-[10px] text-slate-400 block">S/O {c.fatherName || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-100">{c.cnic}</td>
                      <td className="p-4 font-mono text-slate-100">{c.phone}</td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1.5 justify-end">
                          <button
                            id={`btn-view-${c.name}`}
                            onClick={() => { setSelectedCustomer(c); setErrorMsg(''); setSuccessMsg(''); }}
                            className="bg-[#121214] border border-[#2e2e33] hover:border-[#af9268]/50 p-2 rounded-lg hover:bg-[#1f1f23] text-slate-300 hover:text-white transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
                            title="View Full Profile & Loan History"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            id={`btn-edit-${c.name}`}
                            onClick={() => openEditModal(c)}
                            className="bg-[#af9268]/10 border border-[#af9268]/20 hover:border-[#af9268]/50 p-2 rounded-lg hover:bg-[#af9268]/20 text-[#c5a880] hover:text-[#d9be96] transition-all"
                            title="Modify Profile Details"
                          >
                            <Edit2 size={13} />
                          </button>
                          {currentUser?.role === 'Admin' && (
                            <button
                              id={`btn-delete-${c.name}`}
                              onClick={() => confirmDelete(c)}
                              className="bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/50 p-2 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all"
                              title="Delete Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Detailed Profile Viewer */}
        <div className="bg-[#111113] border border-[#2e2e33] rounded-xl p-5 shadow-2xl space-y-5 h-fit lg:sticky lg:top-4">
          {selectedCustomer ? (
            <div className="space-y-6">
              {/* Header profile brief */}
              <div className="flex items-center gap-4 border-b border-[#2e2e33] pb-4">
                <div className="w-16 h-16 rounded-lg border-2 border-[#2e2e33] overflow-hidden bg-[#161619] flex items-center justify-center shrink-0">
                  {selectedCustomer.photoUrl ? (
                    <img src={selectedCustomer.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={28} className="text-slate-550" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white leading-tight">{selectedCustomer.name}</h3>
                  <span className="text-xs text-slate-400 block">S/O {selectedCustomer.fatherName || 'N/A'}</span>
                  <span className="text-[10px] text-[#c5a880] font-mono mt-1.5 block bg-[#af9268]/10 border border-[#af9268]/20 px-2 py-0.5 rounded-md w-fit">ID: {selectedCustomer.id}</span>
                </div>
              </div>

              {/* Action Toolbar on the Selected Customer Profile Pane */}
              <div className="flex gap-2 items-center justify-stretch border-b border-[#2e2e33] pb-4">
                <button
                  id="btn-profile-edit"
                  onClick={() => openEditModal(selectedCustomer)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#af9268]/10 border border-[#af9268]/25 hover:border-[#af9268] hover:bg-[#af9268]/20 text-[#c5a880] hover:text-[#d9be96] rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
                >
                  <Edit2 size={11} /> Edit Profile
                </button>
                {currentUser?.role === 'Admin' && (
                  <button
                    id="btn-profile-delete"
                    onClick={() => confirmDelete(selectedCustomer)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-rose-300 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
                  >
                    <Trash2 size={11} /> Delete Profile
                  </button>
                )}
              </div>

              {/* Bio details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">CNIC Number</span>
                  <span className="text-white font-mono block">{selectedCustomer.cnic}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Phone Number</span>
                  <span className="text-white font-mono block">{selectedCustomer.phone}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Alternate Contact</span>
                  <span className="text-white font-mono block">{selectedCustomer.alternatePhone || 'None'}</span>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Residency Address</span>
                  <span className="text-white block leading-relaxed">{selectedCustomer.address || 'Address not listed'}</span>
                </div>
                
                {/* Guarantor Info */}
                <div className="space-y-1 col-span-2 bg-[#161619] border border-[#2e2e33] rounded-lg p-3 mt-1 shadow-md">
                  <span className="text-[10px] text-[#c5a880] font-bold uppercase tracking-wider block flex items-center gap-1.5">
                    <UserCheck size={13} />
                    Securing Guarantor Profile
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#2e2e33]/50">
                    <div>
                      <span className="text-[9px] text-slate-400 block">Guarantor Name</span>
                      <span className="text-white font-bold">{selectedCustomer.guarantorName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">Guarantor CNIC</span>
                      <span className="text-white font-mono font-bold">{selectedCustomer.guarantorCnic || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Installment History Section */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Active Loan Agreements</span>
                {installments.filter(i => i.customerId === selectedCustomer.id).length === 0 ? (
                  <span className="text-xs text-slate-500 italic block py-4 border border-[#2e2e33] border-dashed rounded-lg text-center bg-[#161619]">No active installment schedules.</span>
                ) : (
                  installments.filter(i => i.customerId === selectedCustomer.id).map(plan => (
                    <div key={plan.id} className="border border-[#2e2e33] p-3 rounded-lg bg-[#161619] hover:bg-[#1f1f23] transition duration-300 text-xs relative overflow-hidden shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-white block">{plan.vehicleName}</span>
                          <span className="text-[10px] text-[#c5a880] block font-mono">Reg: {plan.vehicleNumber}</span>
                        </div>
                        <span className={`inline-block text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          plan.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          plan.status === 'Defaulter' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse' : 'bg-[#af9268]/15 text-[#c5a880] border border-[#af9268]/20'
                        }`}>
                          {plan.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#2e2e33] font-medium text-[10px] text-slate-400">
                        <span>Balance: <strong className="text-white font-mono">Rs. {plan.balance.toLocaleString()}</strong></span>
                        <span className="text-right">Paid: <strong className="text-emerald-400 font-mono">Rs. {plan.totalPaid.toLocaleString()}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Scanned copies list */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Customer Documents</span>
                {selectedCustomer.documents && selectedCustomer.documents.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCustomer.documents.map((doc, idx) => (
                      <a 
                        key={idx} 
                        href={doc} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-[#161619] border border-[#2e2e33] p-2 rounded-lg flex items-center gap-2 hover:bg-[#18181b] hover:border-[#af9268]/30 text-white transition-all text-xs shrink-0"
                      >
                        <FileText size={14} className="text-[#c5a880] shrink-0" />
                        <span className="truncate block font-semibold text-slate-300 hover:text-white">Doc {idx + 1}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-550 italic block py-4 border border-[#2e2e33] border-dashed rounded-lg text-center bg-[#161619]">CNIC/Agreement scans missing.</span>
                )}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 space-y-3 bg-[#111113]">
              <div className="w-12 h-12 rounded-full bg-[#af9268]/10 border border-[#af9268]/20 flex items-center justify-center text-[#c5a880] mx-auto shadow-inner">
                <Users size={20} />
              </div>
              <h4 className="font-bold font-display text-white">No Profile Selected</h4>
              <p className="text-[11px] max-w-[220px] mx-auto text-slate-400 leading-relaxed">Select any client row from the left database list to display complete biographical information, recovery schedules, and contract scans.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#080808]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111113] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-[#2e2e33] font-sans">
            <div className="p-6 border-b border-[#2e2e33] flex items-center justify-between bg-[#161619]">
              <h3 className="font-bold text-xl text-white font-display tracking-tight">Add New Customer Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition mb-1">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Biographical Details */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Customer Name *</label>
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium outline-indigo-505"
                    placeholder="e.g. Baheria Muhammad"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Father's Name</label>
                  <input 
                    type="text" 
                    value={formFatherName}
                    onChange={(e) => setFormFatherName(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium outline-none"
                    placeholder="Father Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">CNIC Number *</label>
                  <input 
                    type="text" 
                    value={formCnic}
                    onChange={(e) => setFormCnic(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium font-mono-fig outline-none"
                    placeholder="e.g. 42101-1234567-3"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Mobile *</label>
                  <input 
                    type="text" 
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium font-mono-fig outline-none"
                    placeholder="Primary phone"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Alternate Contact</label>
                  <input 
                    type="text" 
                    value={formAlternatePhone}
                    onChange={(e) => setFormAlternatePhone(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium font-mono-fig"
                    placeholder="Backup mobile"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Address</label>
                  <textarea 
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium"
                    placeholder="Residential address details"
                  />
                </div>

                {/* Guarantor Profile Info */}
                <div className="md:col-span-2 border-t border-slate-100 pt-3 mt-1">
                  <h4 className="text-xs font-bold text-indigo-600 mb-3 uppercase tracking-wider">Securing Guarantor Profile</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Guarantor Name</label>
                      <input 
                        type="text" 
                        value={formGuarantorName}
                        onChange={(e) => setFormGuarantorName(e.target.value)}
                        className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium"
                        placeholder="Guarantor name detail"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Guarantor CNIC</label>
                      <input 
                        type="text" 
                        value={formGuarantorCnic}
                        onChange={(e) => setFormGuarantorCnic(e.target.value)}
                        className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium font-mono-fig"
                        placeholder="Guarantor CNIC"
                      />
                    </div>
                  </div>
                </div>

                {/* File Upload mechanics */}
                <div className="md:col-span-2 border-t border-[#2e2e33] pt-4">
                  <h4 className="text-xs font-bold text-[#c5a880] mb-3 uppercase tracking-wider">File & Asset Attachments</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Customer Photo</label>
                      {formPhoto ? (
                        <div className="relative group bg-[#161619] border border-[#af9268]/30 rounded-lg p-3 flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full overflow-hidden border border-[#af9268]/20 bg-[#111113] flex-shrink-0">
                            <img src={formPhoto} alt="Customer Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">Profile photo linked</p>
                            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mt-1">Ready</span>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <label className="p-1 px-2.5 bg-[#af9268]/10 hover:bg-[#af9268]/20 border border-[#af9268]/30 rounded text-[#c5a880] hover:text-white text-[10px] font-bold cursor-pointer transition uppercase tracking-wide">
                              Replace
                              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, false)} className="hidden" />
                            </label>
                            <button
                              type="button"
                              onClick={() => setFormPhoto('')}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded text-rose-455 text-rose-400 hover:text-rose-300 transition"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center border border-dashed border-[#2e2e33] hover:border-[#af9268]/50 bg-[#161619] hover:bg-[#1e1e22] py-4 px-3 rounded-lg cursor-pointer transition text-center group min-h-[84px]">
                          <div className="w-8 h-8 rounded-full bg-[#af9268]/10 flex items-center justify-center text-[#c5a880] mb-1.5 group-hover:scale-105 transition-transform duration-300">
                            <Upload size={14} />
                          </div>
                          <span className="text-xs font-bold text-slate-200">Upload Photo</span>
                          <span className="text-[9px] text-slate-500 mt-0.5">JPEG, PNG portrait image</span>
                          <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, false)} className="hidden" />
                        </label>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Securing Scans / Documents</label>
                      <div className="space-y-2">
                        <label className="flex flex-col items-center justify-center border border-dashed border-[#2e2e33] hover:border-[#af9268]/50 bg-[#161619] hover:bg-[#1e1e22] py-4 px-3 rounded-lg cursor-pointer transition text-center group min-h-[84px]">
                          <div className="w-8 h-8 rounded-full bg-[#af9268]/10 flex items-center justify-center text-[#c5a880] mb-1.5 group-hover:scale-105 transition-transform duration-300">
                            <Upload size={14} />
                          </div>
                          <span className="text-xs font-bold text-slate-200">Upload Document</span>
                          <span className="text-[9px] text-slate-500 mt-0.5">Agreement text/CNIC scan documents</span>
                          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, true)} className="hidden" />
                        </label>

                        {formDocs.length > 0 && (
                          <div className="space-y-1.5 mt-2 bg-[#161619]/40 border border-[#2e2e33]/80 rounded-lg p-2 max-h-[140px] overflow-y-auto">
                            <p className="text-[9px] font-extrabold text-[#c5a880] uppercase tracking-wider px-1">Attached Assets ({formDocs.length})</p>
                            <div className="grid grid-cols-1 gap-1">
                              {formDocs.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 bg-[#161619] border border-[#2e2e33]/60 rounded px-2 py-1 text-[10px] font-semibold text-slate-300">
                                  <a href={doc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 truncate text-slate-300 hover:text-white transition">
                                    <FileText size={12} className="text-[#c5a880] shrink-0" />
                                    <span className="truncate">Scan #{idx + 1}</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => setFormDocs(prev => prev.filter((_, i) => i !== idx))}
                                    className="p-1 hover:bg-rose-500/10 rounded text-slate-400 hover:text-rose-450 transition"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end items-center pt-4 border-t border-[#2e2e33] bg-[#161619] -mx-6 -mb-6 p-6 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="bg-transparent hover:bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-[#0c0c0e] hover:text-[#080808] px-6 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-widest transition-all duration-300 shadow-[0_4px_15px_rgba(165,134,90,0.25)] flex items-center gap-1.5"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-[#080808]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111113] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-[#2e2e33] font-sans">
            <div className="p-6 border-b border-[#2e2e33] flex items-center justify-between bg-[#161619]">
              <h3 className="font-bold text-xl text-white font-display tracking-tight">Edit Customer Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Biographical Details */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Customer Name *</label>
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Father's Name</label>
                  <input 
                    type="text" 
                    value={formFatherName}
                    onChange={(e) => setFormFatherName(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">CNIC Number *</label>
                  <input 
                    type="text" 
                    value={formCnic}
                    onChange={(e) => setFormCnic(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium font-mono-fig"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Mobile *</label>
                  <input 
                    type="text" 
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium font-mono-fig"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Alternate Contact</label>
                  <input 
                    type="text" 
                    value={formAlternatePhone}
                    onChange={(e) => setFormAlternatePhone(e.target.value)}
                    className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium font-mono-fig"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Address</label>
                  <textarea 
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium"
                  />
                </div>

                {/* Guarantor Details */}
                <div className="md:col-span-2 border-t border-slate-100 pt-3 mt-1">
                  <h4 className="text-xs font-bold text-indigo-600 mb-3 uppercase tracking-wider">Securing Guarantor Profile</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Guarantor Name</label>
                      <input 
                        type="text" 
                        value={formGuarantorName}
                        onChange={(e) => setFormGuarantorName(e.target.value)}
                        className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Guarantor CNIC</label>
                      <input 
                        type="text" 
                        value={formGuarantorCnic}
                        onChange={(e) => setFormGuarantorCnic(e.target.value)}
                        className="w-full bg-slate-50 text-xs border border-slate-100 rounded-lg p-2.5 font-medium font-mono-fig"
                      />
                    </div>
                  </div>
                </div>

                {/* Upload Section */}
                <div className="md:col-span-2 border-t border-[#2e2e33] pt-4">
                  <h4 className="text-xs font-bold text-[#c5a880] mb-3 uppercase tracking-wider">File & Asset Attachments</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Customer Photo</label>
                      {formPhoto ? (
                        <div className="relative group bg-[#161619] border border-[#af9268]/30 rounded-lg p-3 flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full overflow-hidden border border-[#af9268]/20 bg-[#111113] flex-shrink-0">
                            <img src={formPhoto} alt="Customer Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">Profile photo linked</p>
                            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mt-1">Ready</span>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <label className="p-1 px-2.5 bg-[#af9268]/10 hover:bg-[#af9268]/20 border border-[#af9268]/30 rounded text-[#c5a880] hover:text-white text-[10px] font-bold cursor-pointer transition uppercase tracking-wide">
                              Replace
                              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, false)} className="hidden" />
                            </label>
                            <button
                              type="button"
                              onClick={() => setFormPhoto('')}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded text-rose-400 hover:text-rose-300 transition"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center border border-dashed border-[#2e2e33] hover:border-[#af9268]/50 bg-[#161619] hover:bg-[#1e1e22] py-4 px-3 rounded-lg cursor-pointer transition text-center group min-h-[84px]">
                          <div className="w-8 h-8 rounded-full bg-[#af9268]/10 flex items-center justify-center text-[#c5a880] mb-1.5 group-hover:scale-105 transition-transform duration-300">
                            <Upload size={14} />
                          </div>
                          <span className="text-xs font-bold text-slate-200">Upload Photo</span>
                          <span className="text-[9px] text-slate-500 mt-0.5">JPEG, PNG portrait image</span>
                          <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, false)} className="hidden" />
                        </label>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Securing Scans / Documents</label>
                      <div className="space-y-2">
                        <label className="flex flex-col items-center justify-center border border-dashed border-[#2e2e33] hover:border-[#af9268]/50 bg-[#161619] hover:bg-[#1e1e22] py-4 px-3 rounded-lg cursor-pointer transition text-center group min-h-[84px]">
                          <div className="w-8 h-8 rounded-full bg-[#af9268]/10 flex items-center justify-center text-[#c5a880] mb-1.5 group-hover:scale-105 transition-transform duration-300">
                            <Upload size={14} />
                          </div>
                          <span className="text-xs font-bold text-slate-200">Upload Document</span>
                          <span className="text-[9px] text-slate-500 mt-0.5">Agreement text/CNIC scan documents</span>
                          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, true)} className="hidden" />
                        </label>

                        {formDocs.length > 0 && (
                          <div className="space-y-1.5 mt-2 bg-[#161619]/40 border border-[#2e2e33]/80 rounded-lg p-2 max-h-[140px] overflow-y-auto">
                            <p className="text-[9px] font-extrabold text-[#c5a880] uppercase tracking-wider px-1">Attached Assets ({formDocs.length})</p>
                            <div className="grid grid-cols-1 gap-1">
                              {formDocs.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 bg-[#161619] border border-[#2e2e33]/60 rounded px-2 py-1 text-[10px] font-semibold text-slate-300">
                                  <a href={doc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 truncate text-slate-300 hover:text-white transition">
                                    <FileText size={12} className="text-[#c5a880] shrink-0" />
                                    <span className="truncate">Scan #{idx + 1}</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => setFormDocs(prev => prev.filter((_, i) => i !== idx))}
                                    className="p-1 hover:bg-rose-500/10 rounded text-slate-400 hover:text-rose-450 transition"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end items-center pt-4 border-t border-[#2e2e33] bg-[#161619] -mx-6 -mb-6 p-6 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="bg-transparent hover:bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-[#0c0c0e] hover:text-[#080808] px-6 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-widest transition-all duration-300 shadow-[0_4px_15px_rgba(165,134,90,0.25)] flex items-center gap-1.5"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-[#080808]/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111113] rounded-xl max-w-md w-full shadow-[0_10px_40px_rgba(0,0,0,0.85)] border border-rose-500/20 font-sans overflow-hidden">
            <div className="p-5 border-b border-[#2e2e33] flex items-center gap-3 bg-rose-500/5">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertCircle size={18} />
              </div>
              <h3 className="font-bold text-base text-white tracking-tight leading-none">Confirm Permanent Deletion</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you absolutely sure you want to permanently delete the profile of <strong className="text-white">{customerToDelete.name}</strong>?
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed bg-[#161619] p-3 rounded-lg border border-[#2e2e33]">
                This action is irreversible and will permanently wipe their contact information, CNIC records, guarantors, upload scans, and biographical profiles from the dashboard register.
              </p>
            </div>
            <div className="p-4 bg-[#161619] border-t border-[#2e2e33] flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 border border-[#2e2e33] text-slate-300 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition duration-250 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-extrabold uppercase tracking-wide transition duration-250 shadow-[0_4px_15px_rgba(239,68,68,0.2)] cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
