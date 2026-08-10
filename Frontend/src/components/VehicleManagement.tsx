/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Car, 
  Edit2, 
  Trash2, 
  X, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Hash,
  Shield,
  Gauge,
  Database,
  Upload
} from 'lucide-react';
import { Vehicle, User } from '../types';

interface VehicleManagementProps {
  vehicles: Vehicle[];
  onAddVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'status'>) => Promise<any>;
  onEditVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<any>;
  onDeleteVehicle: (id: string) => Promise<any>;
  currentUser: User | null;
}

export default function VehicleManagement({ 
  vehicles, 
  onAddVehicle, 
  onEditVehicle, 
  onDeleteVehicle,
  currentUser 
}: VehicleManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [vehicleToDelete, setVehicleToDelete] = useState<any>(null);

  // Form states
  const [formCompany, setFormCompany] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formVariant, setFormVariant] = useState('');
  const [formModelYear, setFormModelYear] = useState('');
  const [formRegNumber, setFormRegNumber] = useState('');
  const [formEngineNumber, setFormEngineNumber] = useState('');
  const [formChassisNumber, setFormChassisNumber] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formFuelType, setFormFuelType] = useState('Petrol');
  const [formTransmission, setFormTransmission] = useState('Automatic');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formSalePrice, setFormSalePrice] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formStatus, setFormStatus] = useState<'Available' | 'Sold on Cash' | 'Sold on Installment' | 'Reserved'>('Available');

  // Filtering Logic
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      v.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.engineNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setFormPhotoUrl(data.url);
        }
      } catch (err) {
        console.error('File load failed ', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const openAddModal = () => {
    setErrorMsg('');
    setFormCompany('');
    setFormModel('');
    setFormVariant('');
    setFormModelYear('');
    setFormRegNumber('');
    setFormEngineNumber('');
    setFormChassisNumber('');
    setFormColor('');
    setFormFuelType('Petrol');
    setFormTransmission('Automatic');
    setFormPurchasePrice('');
    setFormSalePrice('');
    setFormPhotoUrl('');
    setShowAddModal(true);
  };

  const openEditModal = (veh: Vehicle) => {
    setErrorMsg('');
    setSelectedVehicle(veh);
    setFormCompany(veh.company);
    setFormModel(veh.model);
    setFormVariant(veh.variant);
    setFormModelYear(veh.modelYear);
    setFormRegNumber(veh.registrationNumber);
    setFormEngineNumber(veh.engineNumber);
    setFormChassisNumber(veh.chassisNumber);
    setFormColor(veh.color);
    setFormFuelType(veh.fuelType);
    setFormTransmission(veh.transmission);
    setFormPurchasePrice(veh.purchasePrice.toString());
    setFormSalePrice(veh.salePrice.toString());
    setFormPhotoUrl(veh.photoUrl || '');
    setFormStatus(veh.status);
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formCompany || !formModel || !formEngineNumber || !formChassisNumber || !formPurchasePrice || !formSalePrice) {
      setErrorMsg('Required values missing: Company, Model, Engine/Chassis code, and Purchase/Sale price.');
      return;
    }

    try {
      await onAddVehicle({
        company: formCompany,
        model: formModel,
        variant: formVariant,
        modelYear: formModelYear,
        registrationNumber: formRegNumber,
        engineNumber: formEngineNumber,
        chassisNumber: formChassisNumber,
        color: formColor,
        fuelType: formFuelType,
        transmission: formTransmission,
        purchasePrice: Number(formPurchasePrice),
        salePrice: Number(formSalePrice),
        photoUrl: formPhotoUrl
      });
      setSuccessMsg('Vehicle inventory created successfully!');
      setShowAddModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating vehicle, check unique chassis/engine details.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await onEditVehicle(selectedVehicle.id, {
        company: formCompany,
        model: formModel,
        variant: formVariant,
        modelYear: formModelYear,
        registrationNumber: formRegNumber,
        engineNumber: formEngineNumber,
        chassisNumber: formChassisNumber,
        color: formColor,
        fuelType: formFuelType,
        transmission: formTransmission,
        purchasePrice: Number(formPurchasePrice),
        salePrice: Number(formSalePrice),
        photoUrl: formPhotoUrl,
        status: formStatus
      });
      setSuccessMsg('Vehicle records updated.');
      setShowEditModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed updating vehicle details.');
    }
  };

  const confirmDelete = (veh: any) => {
    setVehicleToDelete(veh);
  };

  const handleExecuteDelete = async () => {
    if (!vehicleToDelete) return;
    const id = vehicleToDelete.id;
    setVehicleToDelete(null);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await onDeleteVehicle(id);
      setSuccessMsg('Vehicle removed successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Cannot delete sold stock log.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display">Showroom Inventory</h2>
          <p className="text-xs text-slate-400 font-medium">Secured database recording vehicle acquisitions, sales pricing, engine specs, and deal allocation indicators</p>
        </div>
        {currentUser?.role === 'Admin' && (
          <button
            id="btn-add-vehicle-trigger"
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs text-white px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(79,70,229,0.3)] cursor-pointer"
          >
            <Plus size={15} />
            Register Vehicle Stock
          </button>
        )}
      </div>

      {successMsg && (
        <div id="msg-veh-success" className="bg-emerald-500/10 text-emerald-400 p-4 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-500/25">
          <CheckCircle size={14} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div id="msg-veh-error" className="bg-rose-500/10 text-rose-400 p-4 rounded-lg text-xs font-semibold flex items-center gap-2 border border-rose-500/25">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}

      {/* Filter and search utilities rail */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-[#111113] p-4 rounded-xl border border-[#2e2e33] shadow-lg">
        <div className="flex items-center gap-2.5 bg-[#161619] border border-[#2e2e33] px-3.5 py-2.5 rounded-lg text-xs w-full md:w-80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
          <Search size={14} className="text-[#af9268] shrink-0" />
          <input 
            type="text" 
            placeholder="Search Company, Model, Reg, Eng/Chassis No..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none w-full text-white placeholder-slate-500 font-medium font-sans"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto py-1">
          {['All', 'Available', 'Reserved', 'Sold on Installment', 'Sold on Cash'].map((status) => (
            <button
              id={`btn-filter-status-${status}`}
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-[10px] px-3.5 py-2 rounded-lg font-bold shrink-0 transition-all uppercase tracking-wider ${
                statusFilter === status 
                  ? 'bg-indigo-600 text-white shadow-[0_2px_12px_rgba(79,70,229,0.3)]' 
                  : 'bg-[#161619] text-slate-300 border border-[#2e2e33] hover:bg-[#1e1e22] hover:text-white hover:border-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bento-grid of Vehicles */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-[#111113] p-12 text-center rounded-xl border border-[#2e2e33] text-slate-400 text-sm space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-[#af9268]/10 border border-[#af9268]/20 flex items-center justify-center text-[#c5a880] mx-auto shadow-inner">
            <Car size={20} />
          </div>
          <h4 className="font-bold font-display text-white">No Vehicles Loaded</h4>
          <p className="max-w-xs mx-auto text-xs text-slate-400">There are no vehicle register logs matching current filter parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((veh) => (
            <div key={veh.id} className="bg-[#111113] border border-[#2e2e33] rounded-xl shadow-2xl overflow-hidden flex flex-col justify-between group hover:border-[#af9268]/50 transition-all duration-300">
              <div>
                {/* Photo Container */}
                <div className="h-44 bg-[#161619] border-b border-[#2e2e33] relative overflow-hidden flex items-center justify-center text-slate-500">
                  {veh.photoUrl ? (
                    <img src={veh.photoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  ) : (
                    <Car size={36} className="text-slate-600 stroke-[1.5]" />
                  )}
                  {/* Status Badge */}
                  <span className={`absolute top-3 right-3 text-[9px] font-bold px-2.5 py-1 rounded shadow-md border uppercase tracking-wider text-white ${
                    veh.status === 'Available' ? 'bg-emerald-600/90 border-emerald-500/20 text-emerald-100' :
                    veh.status === 'Reserved' ? 'bg-amber-600/90 border-amber-500/20 text-amber-100' : 'bg-[#161619]/95 border-[#2e2e33] text-slate-300 font-mono-fig'
                  }`}>
                    {veh.status}
                  </span>
                </div>

                {/* Info block */}
                <div className="p-5 space-y-4 bg-[#111113]">
                  <div>
                    <h3 className="font-bold text-lg text-white tracking-tight leading-snug group-hover:text-[#c5a880] transition-colors">{veh.company} {veh.model}</h3>
                    <span className="text-xs text-slate-400 font-medium">{veh.variant || 'Standard'} | Year: {veh.modelYear || 'N/A'}</span>
                  </div>

                  {/* Mechanical Identifiers grid */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#161619] p-3 rounded-lg border border-[#2e2e33] font-semibold text-slate-400 shadow-[inset_0_1px_2.5px_rgba(0,0,0,0.4)]">
                    <span className="truncate block flex items-center gap-1.5">
                      <Hash size={11} className="text-[#c5a880]" />
                      Reg: <span className="text-white font-mono">{veh.registrationNumber || 'N/A'}</span>
                    </span>
                    <span className="truncate block flex items-center gap-1.5">
                      <Shield size={11} className="text-[#c5a880]" />
                      Color: <span className="text-white">{veh.color || 'Standard'}</span>
                    </span>
                    <span className="truncate block col-span-2 flex items-center gap-1.5 pt-1 border-t border-[#2e2e33]/30">
                      <Gauge size={11} className="text-[#c5a880]" />
                      Chassis: <span className="text-white font-mono">{veh.chassisNumber}</span>
                    </span>
                    <span className="truncate block col-span-2 flex items-center gap-1.5 pt-1 border-t border-[#2e2e33]/30">
                      <Database size={11} className="text-[#c5a880]" />
                      Engine: <span className="text-white font-mono">{veh.engineNumber}</span>
                    </span>
                  </div>

                  {/* Financial margins bar */}
                  <div className="flex justify-between items-center text-xs border-t border-[#2e2e33] pt-3">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-semibold">Acquisition Price</span>
                      <span className="font-mono font-bold text-slate-350">Rs. {veh.purchasePrice.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-semibold">Retail Listing</span>
                      <span className="font-mono font-extrabold text-[#c5a880] block text-sm">Rs. {veh.salePrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action feet */}
              <div className="px-5 py-3 border-t border-[#2e2e33] flex justify-between items-center bg-[#161619]">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold font-mono uppercase tracking-wider">
                  {veh.transmission} | {veh.fuelType}
                </span>

                <div className="flex gap-2">
                  {currentUser?.role === 'Admin' && (
                    <button
                      id={`btn-edit-veh-${veh.id}`}
                      onClick={() => openEditModal(veh)}
                      className="p-1.5 bg-[#121214] border border-[#2e2e33] hover:border-[#af9268]/50 rounded-lg text-[#c5a880] hover:text-white transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] cursor-pointer"
                      title="Edit vehicle registry"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                  {currentUser?.role === 'Admin' && veh.status !== 'Sold on Installment' && veh.status !== 'Sold on Cash' && (
                    <button
                       id={`btn-delete-veh-${veh.id}`}
                       onClick={() => confirmDelete(veh)}
                       className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/50 rounded-lg text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                       title="Delete log"
                     >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#080808]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111113] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-[#2e2e33] font-sans">
            <div className="p-6 border-b border-[#2e2e33] flex items-center justify-between bg-[#161619]">
              <h3 className="font-bold text-xl text-white font-display tracking-tight">Register Showroom Stock</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 mb-1 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Acquisition Photo</label>
                  <div className="border border-slate-100 rounded-lg p-5 flex items-center justify-center hover:border-indigo-200 transition bg-slate-50">
                    <label className="flex flex-col items-center gap-1 cursor-pointer font-medium text-slate-600 py-2">
                      <Upload size={22} className="text-slate-400" />
                      <span>Upload Vehicle image file</span>
                      <span className="text-[10px] text-slate-400 font-normal">Formats accepted: JPEG/PNG</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                  {formPhotoUrl && <span className="text-emerald-600 font-semibold block text-center text-[10px]">Photo linked successfully!</span>}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Manufacturer / Company *</label>
                  <input 
                    type="text" 
                    value={formCompany} 
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none"
                    placeholder="e.g. Toyota"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Model Group Name *</label>
                  <input 
                    type="text" 
                    value={formModel} 
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none"
                    placeholder="e.g. Corolla Altis"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Variant Spec</label>
                  <input 
                    type="text" 
                    value={formVariant} 
                    onChange={(e) => setFormVariant(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none"
                    placeholder="e.g. 1.6 Grande"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Model Year</label>
                  <input 
                    type="number" 
                    value={formModelYear} 
                    onChange={(e) => setFormModelYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none"
                    placeholder="e.g. 2024"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Registration Number</label>
                  <input 
                    type="text" 
                    value={formRegNumber} 
                    onChange={(e) => setFormRegNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none font-mono"
                    placeholder="e.g. MN-123"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Color Specification</label>
                  <input 
                    type="text" 
                    value={formColor} 
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none"
                    placeholder="e.g. Super White"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Engine Code *</label>
                  <input 
                    type="text" 
                    value={formEngineNumber} 
                    onChange={(e) => setFormEngineNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none font-mono"
                    placeholder="Unique engine block number"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Chassis Block Code *</label>
                  <input 
                    type="text" 
                    value={formChassisNumber} 
                    onChange={(e) => setFormChassisNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none font-mono"
                    placeholder="Unique vehicle safety chassis block"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Fuel Category</label>
                  <select 
                    value={formFuelType} 
                    onChange={(e) => setFormFuelType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Transmission Block</label>
                  <select 
                    value={formTransmission} 
                    onChange={(e) => setFormTransmission(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg"
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">Purchase Booking Price (Rs) *</label>
                  <input 
                    type="number" 
                    value={formPurchasePrice} 
                    onChange={(e) => setFormPurchasePrice(e.target.value)}
                    className="w-full bg-slate-50 border border-indigo-100 p-2.5 rounded-lg"
                    placeholder="Showroom cost"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">Retail Price list (Rs) *</label>
                  <input 
                    type="number" 
                    value={formSalePrice} 
                    onChange={(e) => setFormSalePrice(e.target.value)}
                    className="w-full bg-slate-50 border border-indigo-100 p-2.5 rounded-lg"
                    placeholder="Default listing price"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-3 pt-4 border-t border-[#2e2e33] bg-[#161619] -mx-6 -mb-6 p-6 mt-4">
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
                  Record Acquisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-[#080808]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111113] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-[#2e2e33] font-sans">
            <div className="p-6 border-b border-[#2e2e33] flex items-center justify-between bg-[#161619]">
              <h3 className="font-bold text-xl text-white font-display tracking-tight">Edit Vehicle details</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Vehicle Photo</label>
                  <div className="border border-slate-100 rounded-lg p-3 flex items-center gap-3 bg-slate-50">
                    <label className="bg-white border border-slate-200 hover:border-indigo-500 px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold text-slate-700 transition">
                      Replace Photo
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {formPhotoUrl && <span className="text-[10px] text-emerald-600 font-semibold truncate block max-w-80">Photo block linked!</span>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-semibold">Company *</label>
                  <input 
                    type="text" 
                    value={formCompany} 
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-semibold">Model Name *</label>
                  <input 
                    type="text" 
                    value={formModel} 
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-semibold">Variant Spec</label>
                  <input 
                    type="text" 
                    value={formVariant} 
                    onChange={(e) => setFormVariant(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-semibold">Model Year</label>
                  <input 
                    type="number" 
                    value={formModelYear} 
                    onChange={(e) => setFormModelYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-semibold">Registration Number</label>
                  <input 
                    type="text" 
                    value={formRegNumber} 
                    onChange={(e) => setFormRegNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-semibold">Color Specification</label>
                  <input 
                    type="text" 
                    value={formColor} 
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-semibold">Engine Block Code *</label>
                  <input 
                    type="text" 
                    value={formEngineNumber} 
                    onChange={(e) => setFormEngineNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-semibold">Chassis Block Code *</label>
                  <input 
                    type="text" 
                    value={formChassisNumber} 
                    onChange={(e) => setFormChassisNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg outline-none font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Acquisition Cost (Rs) *</label>
                  <input 
                    type="number" 
                    value={formPurchasePrice} 
                    onChange={(e) => setFormPurchasePrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg font-mono-fig"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Retail Value (Rs) *</label>
                  <input 
                    type="number" 
                    value={formSalePrice} 
                    onChange={(e) => setFormSalePrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-lg font-mono-fig"
                    required
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">Vehicle Status Badge</label>
                  <select 
                    value={formStatus} 
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-indigo-100 p-2.5 rounded-lg"
                  >
                    <option value="Available">Available</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Sold on Installment">Sold on Installment</option>
                    <option value="Sold on Cash">Sold on Cash</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end items-center gap-3 pt-4 border-t border-[#2e2e33] bg-[#161619] -mx-6 -mb-6 p-6 mt-4">
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
      {/* Delete Vehicle Confirmation Modal */}
      {vehicleToDelete && (
        <div className="fixed inset-0 bg-[#080808]/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111113] rounded-xl max-w-md w-full shadow-[0_10px_40px_rgba(0,0,0,0.85)] border border-rose-500/20 font-sans overflow-hidden">
            <div className="p-5 border-b border-[#2e2e33] flex items-center gap-3 bg-rose-500/5">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertCircle size={18} />
              </div>
              <h3 className="font-bold text-base text-white tracking-tight leading-none">Confirm Vehicle Removal</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you absolutely sure you want to delete this vehicle: <strong className="text-white">{vehicleToDelete.company} {vehicleToDelete.model} ({vehicleToDelete.registrationNumber || 'No reg'})</strong>?
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed bg-[#161619] p-3 rounded-lg border border-[#2e2e33]">
                This action is irreversible and will permanently delete the vehicle registry specification, color specs, chassis numbers, purchase costs, and associated gallery images.
              </p>
            </div>
            <div className="p-4 bg-[#161619] border-t border-[#2e2e33] flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setVehicleToDelete(null)}
                className="px-4 py-2 border border-[#2e2e33] text-slate-300 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition duration-250 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-extrabold uppercase tracking-wide transition duration-250 shadow-[0_4px_15px_rgba(239,68,68,0.2)] cursor-pointer"
              >
                Delete Stock record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
