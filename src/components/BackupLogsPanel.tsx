/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  ShieldCheck, 
  RefreshCw, 
  History, 
  AlertCircle, 
  CheckCircle,
  Lock,
  UserPlus,
  UserCheck,
  Trash2,
  Users,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Bell,
  Mail,
  Smartphone,
  Send,
  Settings,
  AlertTriangle,
  FileText,
  Check,
  X
} from 'lucide-react';
import { AuditLog, BackupInfo, User } from '../types';

interface BackupLogsPanelProps {
  auditLogs: AuditLog[];
  currentUser: User | null;
  onRefreshLogs: () => void;
  usersList: any[];
  onCreateUser: (u: any) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onApproveLogin: (id: string) => Promise<void>;
  onRejectLogin: (id: string) => Promise<void>;
  onResetUserPin: (id: string, newPin: string) => Promise<void>;
}

export default function BackupLogsPanel({ 
  auditLogs, 
  currentUser,
  onRefreshLogs,
  usersList,
  onCreateUser,
  onDeleteUser,
  onApproveLogin,
  onRejectLogin,
  onResetUserPin
}: BackupLogsPanelProps) {
  // Tabs: 'staff' for Operator Credentials Desk, 'system' for Audits & Backups, 'notifications' for Alert profiles
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'system' | 'notifications'>('staff');
  const [backupsList, setBackupsList] = useState<BackupInfo[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Notifications custom state managers
  const [notificationSettings, setNotificationSettings] = useState<any>({
    adminWhatsApp: '03522221234',
    adminEmail: 'umairullah410446@gmail.com',
    enableWhatsApp: false,
    enableEmail: false,
    enableInApp: true,
    twilioSid: '',
    twilioToken: '',
    twilioFrom: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    smtpSecure: 'true',
    senderEmail: '',
    gmailUseOauth: false,
    gmailOauthSender: ''
  });

  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [testLaunchesLoading, setTestLaunchesLoading] = useState(false);
  const [summaryLaunchesLoading, setSummaryLaunchesLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // New Operator Form States
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Salesman' | 'Recovery Officer'>('Salesman');
  const [newStaffStatus, setNewStaffStatus] = useState<'active' | 'pending_first_login'>('active');
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(null);

  // Reset PIN Form States
  const [resetPinUserId, setResetPinUserId] = useState<string | null>(null);
  const [newPinValue, setNewPinValue] = useState('');
  const [resettingLoading, setResettingLoading] = useState(false);

  const fetchBackups = async () => {
    try {
      const resp = await fetch('/api/backups');
      const data = await resp.json();
      setBackupsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotificationSettingsAndLogs = async () => {
    try {
      const respSettings = await fetch('/api/notifications/settings');
      const dataSettings = await respSettings.json();
      setNotificationSettings(dataSettings);

      const respLogs = await fetch('/api/notifications/logs');
      const dataLogs = await respLogs.json();
      setNotificationLogs(dataLogs);
    } catch (e) {
      console.error(e);
    }
  };

  const saveNotificationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const resp = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...notificationSettings, loggedUser: currentUser?.username })
      });
      const data = await resp.json();
      if (resp.ok) {
        setSuccessMsg('Administrative notification settings updated successfully!');
        fetchNotificationSettingsAndLogs();
      } else {
        setErrorMsg('Failed to update settings profile.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to gateway server settings route.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const triggerTestNotification = async () => {
    setTestLaunchesLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const resp = await fetch('/api/notifications/test-channels', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok) {
        setSuccessMsg('Test notification handshake dispatched across channels successfully!');
        fetchNotificationSettingsAndLogs();
      } else {
        setErrorMsg('Failed to route test handshake alert.');
      }
    } catch (e) {
      setErrorMsg('Failed to connect with live server test alert dispatcher.');
    } finally {
      setTestLaunchesLoading(false);
    }
  };

  const compileDailySummary = async () => {
    setSummaryLaunchesLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const resp = await fetch('/api/notifications/daily-summary', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok) {
        setSuccessMsg('Daily Performance Summary compiled and dispatched successfully!');
        fetchNotificationSettingsAndLogs();
      } else {
        setErrorMsg('Failed to compile performance metrics report.');
      }
    } catch (e) {
      setErrorMsg('Server database connection failed during metric calculations.');
    } finally {
      setSummaryLaunchesLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchNotificationSettingsAndLogs();
  }, []);

  const triggerManualBackup = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const resp = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loggedUser: currentUser })
      });
      const data = await resp.json();
      if (data.success) {
        setSuccessMsg(`Secure snapshot of database successfully written as ${data.filename}`);
        fetchBackups();
        onRefreshLogs();
      } else {
        setErrorMsg(data.error || 'Failed backup write.');
      }
    } catch (err: any) {
      setErrorMsg('Backup write request failed. Check server connectivity.');
    } finally {
      setLoading(false);
    }
  };

  // Create Staff User Form Submit Handler
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    if (!newStaffName || !newStaffUsername || !newStaffPassword) {
      setFormError('All parameters are required to generate credentials.');
      return;
    }

    setActionLoading(true);
    try {
      await onCreateUser({
        name: newStaffName,
        username: newStaffUsername,
        password: newStaffPassword,
        role: newStaffRole,
        status: newStaffStatus,
        email: newStaffEmail || `${newStaffUsername.toLowerCase()}@showroom.com`
      });
      setSuccessMsg(`Account for "${newStaffName}" with immediate type "${newStaffStatus === 'active' ? 'Active & Direct Access' : 'Awaiting Approval'}" successfully registered.`);
      setNewStaffName('');
      setNewStaffUsername('');
      setNewStaffPassword('');
      setNewStaffEmail('');
    } catch (err: any) {
      setFormError(err.message || 'Error occurred during staff registration.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white font-display">Manage Staff (Salesman & Recovery Officers)</h2>
        <p className="text-xs text-slate-400 font-medium">Create active login profiles for your Salesman or Recovery Officer, verify login handshakes, and manage workstation security pins.</p>
      </div>

      {/* Sub-Tab Headers */}
      <div className="flex border-b border-[#2e2e33] overflow-x-auto scrollbar-none shrink-0">
        <button
          onClick={() => setActiveSubTab('staff')}
          className={`py-3 px-6 text-xs font-bold transition flex items-center gap-2 border-b-2 uppercase tracking-wider whitespace-nowrap ${
            activeSubTab === 'staff' 
              ? 'border-[#c5a880] text-[#c5a880] bg-[#af9268]/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/10'
          }`}
        >
          <Users size={14} />
          Staff Operations Registry ({usersList.length})
        </button>
        <button
          onClick={() => {
            setActiveSubTab('system');
            fetchBackups();
          }}
          className={`py-3 px-6 text-xs font-bold transition flex items-center gap-2 border-b-2 uppercase tracking-wider whitespace-nowrap ${
            activeSubTab === 'system' 
              ? 'border-[#c5a880] text-[#c5a880] bg-[#af9268]/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/10'
          }`}
        >
          <Database size={14} />
          System Audits & Backups
        </button>
        <button
          onClick={() => {
            setActiveSubTab('notifications');
            fetchNotificationSettingsAndLogs();
          }}
          className={`py-3 px-6 text-xs font-bold transition flex items-center gap-2 border-b-2 uppercase tracking-wider whitespace-nowrap ${
            activeSubTab === 'notifications' 
              ? 'border-[#c5a880] text-[#c5a880] bg-[#af9268]/5' 
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/10'
          }`}
        >
          <Bell size={14} />
          Notifications & Real-Time Alerts
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
          <CheckCircle size={14} className="shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-500/10 text-rose-400 border border-rose-500/25 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          {errorMsg}
        </div>
      )}

      {activeSubTab === 'staff' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: ADD NEW STAFF OPERATOR credentials */}
          <div className="lg:col-span-5 bg-[#111113] border border-[#2e2e33] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 font-mono text-xs uppercase tracking-wider border-b border-[#1e1e21] pb-3">
              <UserPlus className="text-[#c5a880]" size={15} />
              Register New Dealership Operator
            </h3>

            {formError && (
              <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                <AlertCircle size={12} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wide">Operator Real Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Mohammad Ali, Usman Khan"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full bg-[#161619] border border-[#2e2e33] rounded-lg px-3 py-2.5 text-white placeholder-slate-600 outline-none hover:border-[#af9268]/30 focus:border-[#af9268] transition"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wide">Operator Email Address (For Secure Verification OTPs)</label>
                <input 
                  type="email"
                  placeholder="e.g. staff_name@gmail.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full bg-[#161619] border border-[#2e2e33] rounded-lg px-3 py-2.5 text-white placeholder-slate-600 outline-none hover:border-[#af9268]/30 focus:border-[#af9268] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wide">Username</label>
                  <input 
                    type="text"
                    placeholder="e.g. sales_khan"
                    value={newStaffUsername}
                    onChange={(e) => setNewStaffUsername(e.target.value)}
                    className="w-full bg-[#161619] border border-[#2e2e33] rounded-lg px-3 py-2.5 text-white placeholder-slate-600 outline-none hover:border-[#af9268]/30 focus:border-[#af9268] transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wide">Workstation Role</label>
                  <select
                    value={newStaffRole}
                    onChange={(e: any) => setNewStaffRole(e.target.value)}
                    className="w-full bg-[#161619] border border-[#2e2e33] rounded-lg px-3 py-2.5 text-white outline-none hover:border-[#af9268]/30 focus:border-[#af9268] transition"
                  >
                    <option value="Salesman">Salesman (Sales Specialist)</option>
                    <option value="Recovery Officer">Recovery Officer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wide">Secure Password / PIN Code</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter login passphrase/PIN"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    className="w-full bg-[#161619] border border-[#2e2e33] rounded-lg pl-3 pr-10 py-2.5 text-white placeholder-slate-600 outline-none hover:border-[#af9268]/30 focus:border-[#af9268] transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wide">Initial Access Clearance</label>
                <select
                  value={newStaffStatus}
                  onChange={(e: any) => setNewStaffStatus(e.target.value)}
                  className="w-full bg-[#161619] border border-[#2e2e33] rounded-lg px-3 py-2.5 text-white outline-none hover:border-[#af9268]/30 focus:border-[#af9268] transition"
                >
                  <option value="active">🟢 Active (Immediate Login Access)</option>
                  <option value="pending_first_login">🔒 Security Check (Admin Approve Required)</option>
                </select>
                <span className="text-[9px] text-[#af9268] font-bold text-left block leading-relaxed mt-1">
                  💡 {newStaffStatus === 'active' 
                    ? 'Immediate Access: This operator can log in immediately from the showcase workspace without requiring extra security checks!' 
                    : 'Double Lock Access: This operator requires your email sandbox handshake on their first login before they can enter.'}
                </span>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-[#af9268] hover:bg-[#967d56] text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition focus:ring-2 focus:ring-[#af9268]/50 outline-none cursor-pointer"
              >
                <UserPlus size={14} />
                Generate Secure Clearance PIN
              </button>
            </form>
          </div>

          {/* RIGHT: REGISTERED STAFF OPERATORS AND clearance controller */}
          <div className="lg:col-span-7 bg-[#111113] border border-[#2e2e33] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#1e1e21] pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                <ShieldCheck className="text-[#c5a880]" size={15} />
                Active Operators & Clearance Handshakes
              </h3>
              <span className="text-[10px] font-mono text-[#c5a880] bg-[#c5a880]/10 px-2.5 py-0.5 rounded-md font-bold uppercase">SECURED BY LOCK</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              The following accounts are currently active in the database. Sales Specialist and Recovery Officer roles must satisfy double cryptographic handshakes (approved by the administrator's email) to unlock system dashboards.
            </p>

            <div className="overflow-x-auto border border-[#1e1e21] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#161619] border-b border-[#1e1e21] text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    <th className="p-4">Staff Member & Alias</th>
                    <th className="p-4">Assigned Role</th>
                    <th className="p-4">Clearance Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e21] font-semibold text-slate-300">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500 italic">No operators registered. Add the inaugural operators!</td>
                    </tr>
                  ) : (
                    usersList.map((st) => {
                      const isAdmin = st.role === 'Admin';
                      return (
                        <tr key={st.id} className="hover:bg-[#161619]/30 transition group">
                          <td className="p-4">
                            <div>
                              <span className="font-bold text-slate-100 block">{st.name}</span>
                              <div className="flex flex-col gap-0.5 mt-0.5 text-[10px] font-mono">
                                <span className="text-[#c5a880]">@{st.username}</span>
                                {st.email && <span className="text-slate-400 font-bold select-all">{st.email}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] font-extrabold uppercase tracking-wide block ${isAdmin ? 'text-indigo-400' : 'text-slate-400'}`}>
                              {st.role === 'Salesman' ? 'Sales Specialist' : st.role}
                            </span>
                          </td>
                          <td className="p-4">
                            {isAdmin ? (
                              <span className="inline-flex items-center gap-1.5 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-1 uppercase font-bold tracking-wider">
                                <CheckCircle size={10} /> Authorized (Global)
                              </span>
                            ) : st.status === 'pending_first_login' ? (
                              <span className="inline-flex items-center gap-1.5 text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/15 rounded-full px-2.5 py-1 uppercase font-bold tracking-wider">
                                <ShieldAlert size={10} /> Pending Login
                              </span>
                            ) : st.status === 'awaiting_approval' ? (
                              <span className="inline-flex items-center gap-1.5 text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/25 rounded-full px-2.5 py-1 uppercase font-bold tracking-wider animate-pulse">
                                <KeyRound size={10} /> Verification Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-1 uppercase font-bold tracking-wider">
                                <CheckCircle size={10} /> Active Clearance
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              {/* Handshake actions */}
                              {(st.status === 'awaiting_approval' || st.status === 'pending_first_login') && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => onApproveLogin(st.id)}
                                    title={st.status === 'pending_first_login' ? "Activate & Approve Directly" : "Verify & Unlock Account"}
                                    className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[9px] uppercase tracking-wide transition cursor-pointer"
                                  >
                                    {st.status === 'pending_first_login' ? 'Activate' : 'Approve'}
                                  </button>
                                  {st.status === 'awaiting_approval' && (
                                    <button
                                      onClick={() => onRejectLogin(st.id)}
                                      title="Reject & Lockdown"
                                      className="p-1 px-2 text-rose-600 hover:bg-rose-950/20 hover:text-rose-400 rounded font-bold text-[9px] uppercase tracking-wide transition border border-rose-950/30 cursor-pointer"
                                    >
                                      Deny
                                    </button>
                                  )}
                                </div>
                              )}
                                                       {/* Reset PIN Mechanism */}
                              <div className="flex items-center gap-1">
                                {resetPinUserId === st.id ? (
                                  <form 
                                    onSubmit={async (e) => {
                                      e.preventDefault();
                                      if (!newPinValue.trim()) return;
                                      setResettingLoading(true);
                                      try {
                                        await onResetUserPin(st.id, newPinValue);
                                        setResetPinUserId(null);
                                        setNewPinValue('');
                                        setSuccessMsg(`Access PIN code reset successfully for operator "${st.name}". Verification email dispatched to their registered address.`);
                                        setErrorMsg('');
                                      } catch (err: any) {
                                        setErrorMsg(err.message || 'Failed to reset PIN.');
                                      } finally {
                                        setResettingLoading(false);
                                      }
                                    }}
                                    className="flex items-center gap-1 bg-[#1a1a1d] border border-[#af9268]/30 rounded-xl px-2 py-1 animate-fade-in relative z-20"
                                  >
                                    <input 
                                      type="password"
                                      placeholder="New PIN"
                                      value={newPinValue}
                                      onChange={(e) => setNewPinValue(e.target.value)}
                                      disabled={resettingLoading}
                                      className="bg-[#0c0c0e] border border-slate-855 rounded px-2 py-0.5 text-xs text-white outline-none w-20 font-mono"
                                      required
                                    />
                                    <button
                                      type="submit"
                                      disabled={resettingLoading}
                                      className="p-1 bg-[#af9268] hover:bg-[#967d56] text-white rounded font-bold text-[9px] uppercase tracking-wide transition cursor-pointer"
                                      title="Confirm Reset"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setResetPinUserId(null); setNewPinValue(''); }}
                                      disabled={resettingLoading}
                                      className="p-1 px-1.5 bg-slate-850 hover:bg-slate-700 text-slate-300 rounded font-bold text-[9px] uppercase tracking-wide transition cursor-pointer"
                                      title="Cancel"
                                    >
                                      X
                                    </button>
                                  </form>
                                ) : (
                                  <button
                                    onClick={() => { setResetPinUserId(st.id); setNewPinValue(''); setDeleteConfirmUserId(null); }}
                                    className="p-1 px-2.5 bg-[#af9268]/10 hover:bg-[#af9268] hover:text-[#0c101b] text-[#af9268] border border-[#af9268]/20 rounded-lg text-[9px] uppercase font-bold tracking-wide transition cursor-pointer flex items-center gap-1"
                                    title="Reset operator password PIN"
                                  >
                                    <KeyRound size={11} />
                                    <span>Reset PIN</span>
                                  </button>
                                )}
                              </div>

                              {/* Delete mechanism */}
                              {!isAdmin && (
                                <div className="flex items-center gap-1.5">
                                  {deleteConfirmUserId === st.id ? (
                                    <div className="flex items-center bg-rose-950/40 border border-rose-900/55 rounded-lg px-2 py-1 gap-2 animate-fade-in">
                                      <span className="text-[10px] text-rose-300 font-extrabold uppercase font-mono tracking-wider">Confirm Delete?</span>
                                      <button
                                        onClick={async () => {
                                          await onDeleteUser(st.id);
                                          setDeleteConfirmUserId(null);
                                        }}
                                        className="px-2 py-1 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold text-[9px] rounded uppercase tracking-wide transition cursor-pointer"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setDeleteConfirmUserId(null)}
                                        className="px-2 py-1 bg-[#2e2e33]/70 hover:bg-[#2e2e33] text-slate-300 font-extrabold text-[9px] rounded uppercase tracking-wide transition cursor-pointer"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => { setDeleteConfirmUserId(st.id); setResetPinUserId(null); }}
                                      className="p-1.5 text-slate-500 hover:text-rose-400 border border-transparent hover:border-rose-950/20 hover:bg-rose-950/10 rounded-lg transition opacity-60 hover:opacity-100 cursor-pointer"
                                      title="Delete Account"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Email verification reminder footer */}
            <div className="bg-[#161619] border border-[#2e2e33] rounded-xl p-4 flex gap-3.5 mt-2">
              <ShieldAlert className="text-amber-500 shrink-0" size={18} />
              <div className="text-xs font-semibold leading-relaxed">
                <span className="text-slate-200 block font-bold mb-0.5">Dual-Ledger Handshake Rules</span>
                <span className="text-slate-400 block text-[11px]">
                  When staff members access credentials for the first time, a secure clearance link is emailed to <strong>umairullah410446@gmail.com</strong>. The operator cannot write or compile showroom profiles until the link is verified/approved by you.
                </span>
              </div>
            </div>
          </div>

        </div>
      ) : activeSubTab === 'system' ? (
        /* Original system audits and backups tab design */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Left column: Security status */}
          <div className="space-y-6">
            {/* Security status block */}
            <div className="bg-[#111113] border border-[#2e2e33] rounded-xl p-5 shadow-2xl space-y-4">
              <h3 className="font-bold text-white flex items-center gap-2 font-display text-sm border-b border-[#2e2e33] pb-2.5">
                <ShieldCheck className="text-[#af9268]" size={16} />
                Dealership Security Center
              </h3>

              <div className="space-y-3.5 text-xs font-semibold">
                <div className="flex justify-between items-center bg-[#161619] p-3 rounded-lg border border-[#2e2e33]">
                  <span className="text-slate-400">Local DB Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle size={12} /> Encrypted Active
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#161619] p-3 rounded-lg border border-[#2e2e33]">
                  <span className="text-slate-400">API Gateway:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck size={12} /> Auth Active
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#161619] p-3 rounded-lg border border-[#2e2e33]">
                  <span className="text-slate-400">Credential Control:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Lock size={12} /> RBAC Switched On
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Audit Logs lists stream */}
          <div className="bg-[#111113] border border-[#2e2e33] rounded-xl p-5 shadow-2xl lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2e2e33] pb-2.5">
              <h3 className="font-bold text-white flex items-center gap-2 font-display text-sm">
                <History className="text-[#c5a880]" size={16} />
                Dealership Event Audit Trail
              </h3>
              <span className="text-[9px] font-extrabold bg-[#161619] border border-[#2e2e33] text-[#c5a880] px-2.5 py-0.5 rounded uppercase tracking-wider">Realtime Monitor</span>
            </div>

            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Bi-directional ledger stream auditing critical user events across Baheria Motors showroom databases. All changes to credit balances, profile registers, deletions, login sessions, and database backups are permanent.
            </p>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 animate-fade-in">
              {auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm bg-[#111113]">No audited records logged in ledger.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="border-l-2 border-[#af9268] bg-[#161619]/45 p-4 rounded-r-lg border border-[#2e2e33]/50 hover:bg-[#161619] transition-all">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-white uppercase tracking-tight block">{log.action}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-semibold mt-1">{log.details}</p>
                    <div className="flex items-center gap-2 text-[9px] text-slate-500 font-semibold uppercase tracking-wider mt-2 pt-1 border-t border-[#2e2e33]">
                      <span>Actor: <span className="text-[#c5a880]">{log.username}</span></span>
                      <span>•</span>
                      <span>Role: <span className="text-slate-400">{log.role}</span></span>
                      <span>•</span>
                      <span className="font-mono">Log: {log.id}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      ) : (
        /* Notifications Tab Content */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* L: Settings configure form */}
          <div className="lg:col-span-5 bg-[#111113] border border-[#2e2e33] rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#2e2e33] pb-3.5">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                <Settings className="text-[#c5a880]" size={15} />
                Alert Channel Configuration
              </h3>
              <button
                type="button"
                onClick={fetchNotificationSettingsAndLogs}
                className="text-[10px] text-[#c5a880] hover:underline font-mono uppercase font-extrabold cursor-pointer"
              >
                Sync Specs
              </button>
            </div>

            <form onSubmit={saveNotificationSettings} className="space-y-5">
              
              {/* WhatsApp Alert Channels */}
              <div className="border border-[#2e2e33] bg-[#1a1a1c]/20 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                    <Smartphone size={13} className="text-emerald-400" /> WhatsApp alert deck
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.enableWhatsApp}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, enableWhatsApp: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-[13px] after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                <div className="space-y-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">
                  <label className="block">Admin Mobile WhatsApp Number</label>
                  <input 
                    type="text"
                    value={notificationSettings.adminWhatsApp || ''}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, adminWhatsApp: e.target.value })}
                    placeholder="e.g. 03001234567 or +923001234567"
                    disabled={!notificationSettings.enableWhatsApp}
                    className="w-full bg-[#070a13] border border-slate-800 rounded-lg p-2.5 text-slate-200 outline-none text-xs disabled:opacity-40"
                  />
                </div>

                <div className="pt-2 border-t border-[#2e2e33]/50 text-left">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase mb-2">Twilio Real-Time Handshake API (Optional)</span>
                  <div className="space-y-2">
                    <div className="space-y-1 text-[9px] uppercase font-bold text-slate-500">
                      <span>Twilio Account SID</span>
                      <input 
                        type="text"
                        value={notificationSettings.twilioSid || ''}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, twilioSid: e.target.value })}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        disabled={!notificationSettings.enableWhatsApp}
                        className="w-full bg-[#070a13] border border-slate-800 rounded p-2 text-slate-300 outline-none font-mono text-[10px] disabled:opacity-40"
                      />
                    </div>
                    <div className="space-y-1 text-[9px] uppercase font-bold text-slate-500">
                      <span>Twilio Auth Token</span>
                      <input 
                        type="password"
                        value={notificationSettings.twilioToken || ''}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, twilioToken: e.target.value })}
                        placeholder="••••••••••••••••••••••••••••••••"
                        disabled={!notificationSettings.enableWhatsApp}
                        className="w-full bg-[#070a13] border border-slate-800 rounded p-2 text-slate-300 outline-none font-mono text-[10px] disabled:opacity-40"
                      />
                    </div>
                    <div className="space-y-1 text-[9px] uppercase font-bold text-slate-500">
                      <span>Twilio Sender Number (WhatsApp)</span>
                      <input 
                        type="text"
                        value={notificationSettings.twilioFrom || ''}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, twilioFrom: e.target.value })}
                        placeholder="+14155238886"
                        disabled={!notificationSettings.enableWhatsApp}
                        className="w-full bg-[#070a13] border border-slate-800 rounded p-2 text-slate-300 outline-none font-mono text-[10px] disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Alert Channels */}
              <div className="border border-[#2e2e33] bg-[#1a1a1c]/20 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                    <Mail size={13} className="text-indigo-400" /> Gmail API & SMTP alert deck
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.enableEmail}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, enableEmail: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-[13px] after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                <div className="space-y-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">
                  <label className="block">Admin Reporting Alert Dispatch Target</label>
                  <input 
                    type="email"
                    value={notificationSettings.adminEmail || ''}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, adminEmail: e.target.value })}
                    placeholder="umairullah410446@gmail.com"
                    disabled={!notificationSettings.enableEmail}
                    className="w-full bg-[#070a13] border border-slate-800 rounded-lg p-2.5 text-slate-200 outline-none text-xs disabled:opacity-40"
                  />
                </div>

                {/* SMTP Setup instruction card */}
                <div className="bg-[#c5a880]/10 border border-[#c5a880]/20 p-3.5 rounded-xl space-y-1.5 text-left">
                  <span className="text-[10px] font-extrabold uppercase text-[#c5a880] tracking-wider block font-mono">
                    💡 PERSISTENT GMAIL/SMTP SETUP GUIDE (Urdu & English)
                  </span>
                  <div className="text-[9.5px] leading-relaxed text-slate-300 space-y-1.5 font-semibold">
                    <p className="border-b border-slate-800 pb-1 text-slate-400 font-mono text-[9px]">
                      Google OAuth access tokens expire after 1 hour. Set up persistent Gmail SMTP below to ensure security codes arrive in actual Gmail inbox of salesmen and admin 100% of the time, permanently!
                    </p>
                    <p>
                      <strong>Step 1:</strong> Apne Google Account me <strong>"2-Step Verification"</strong> ko on/enable karein.
                    </p>
                    <p>
                      <strong>Step 2:</strong> Google account settings me <strong>"App Passwords"</strong> search karke select karein aur ek naya app name (e.g., <em>"Baheria Motors"</em>) enter karke <strong>Create</strong> karein.
                    </p>
                    <p>
                      <strong>Step 3:</strong> Screen par generated <strong>16-digit password / App PIN</strong> ko copy karein.
                    </p>
                    <p>
                      <strong>Step 4:</strong> Niche ye details enter dalkar click <strong>"Save Live Integration Specs"</strong>:
                    </p>
                    <ul className="list-disc pl-4 text-slate-400 space-y-0.5">
                      <li><strong>SMTP Host:</strong> smtp.gmail.com</li>
                      <li><strong>SMTP Port:</strong> 465 (SSL/TLS) or 587 (STARTTLS)</li>
                      <li><strong>SMTP Account User:</strong> Apka real Gmail address</li>
                      <li><strong>SMTP pass / App PIN:</strong> Paste the 16-character code (bina space ke)</li>
                      <li><strong>From Address (Sender):</strong> Same real Gmail address</li>
                    </ul>
                    <p className="text-[#c5a880] font-mono text-[9px] pt-1">
                      🔔 Save or Enable email toggle to route passcode & approvals directly to real Gmail inbox!
                    </p>
                  </div>
                </div>



                {/* MANUAL RE-ROUTE / SMTP FIELDS */}
                <div className="bg-[#0b0c10] p-3 rounded-lg border border-slate-800/80 space-y-3">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Dynamic SMTP Server Credentials</span>
                  
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">SMTP Host</label>
                      <input 
                        type="text" 
                        value={notificationSettings.smtpHost || ''} 
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, smtpHost: e.target.value })} 
                        placeholder="smtp.gmail.com"
                        disabled={!notificationSettings.enableEmail}
                        className="w-full bg-[#070a13] border border-slate-800 rounded p-1.5 text-[10px] text-slate-300 font-mono outline-none disabled:opacity-40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">SMTP Port</label>
                      <input 
                        type="text" 
                        value={notificationSettings.smtpPort || ''} 
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, smtpPort: e.target.value })} 
                        placeholder="465 or 587"
                        disabled={!notificationSettings.enableEmail}
                        className="w-full bg-[#070a13] border border-slate-800 rounded p-1.5 text-[10px] text-slate-300 font-mono outline-none disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">SMTP Account User</label>
                      <input 
                        type="email" 
                        value={notificationSettings.smtpUser || ''} 
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, smtpUser: e.target.value })} 
                        placeholder="yourname@gmail.com"
                        disabled={!notificationSettings.enableEmail}
                        className="w-full bg-[#070a13] border border-slate-800 rounded p-1.5 text-[10px] text-slate-200 outline-none font-mono disabled:opacity-40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">SMTP pass / App PIN</label>
                      <input 
                        type="password" 
                        value={notificationSettings.smtpPass || ''} 
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, smtpPass: e.target.value })} 
                        placeholder="16-character code"
                        disabled={!notificationSettings.enableEmail}
                        className="w-full bg-[#070a13] border border-slate-800 rounded p-1.5 text-[10px] text-slate-200 outline-none font-mono disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">From (Sender Address)</label>
                      <input 
                        type="email" 
                        value={notificationSettings.senderEmail || ''} 
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, senderEmail: e.target.value })} 
                        placeholder="yourname@gmail.com"
                        disabled={!notificationSettings.enableEmail}
                        className="w-full bg-[#070a13] border border-slate-800 rounded p-1.5 text-[10px] text-slate-200 outline-none font-mono disabled:opacity-40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">Relay Security Option</label>
                      <select 
                        value={notificationSettings.smtpSecure || 'true'} 
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, smtpSecure: e.target.value })} 
                        disabled={!notificationSettings.enableEmail}
                        className="w-full bg-[#070a13] border border-slate-800 rounded p-1.5 text-[10px] text-slate-300 outline-none font-mono disabled:opacity-40"
                      >
                        <option value="true">SSL / TLS Protocol (Port 465)</option>
                        <option value="false">STARTTLS Protocol (Port 587)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={settingsSaving}
                className="w-full bg-[#c5a880] hover:bg-[#b0936b] text-slate-950 font-black text-xs py-3 rounded-xl transition shadow-lg shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {settingsSaving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Enrolling Specifications...
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    Commit Security Spec Update
                  </>
                )}
              </button>
            </form>

            {/* Test alert operations deck */}
            <div className="border-t border-[#2e2e33] pt-5 space-y-3 shrink-0 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 font-mono">Operations Diagnostics</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={triggerTestNotification}
                  disabled={testLaunchesLoading}
                  className="bg-[#121214] hover:bg-slate-905 border border-slate-850 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-200 transition flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send size={15} className={`${testLaunchesLoading ? 'animate-[bounce_1s_infinite]' : 'text-[#c5a880]'}`} />
                  {testLaunchesLoading ? 'Sending...' : 'Test Handshake'}
                </button>

                <button
                  type="button"
                  onClick={compileDailySummary}
                  disabled={summaryLaunchesLoading}
                  className="bg-[#121214] hover:bg-slate-905 border border-slate-850 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-200 transition flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText size={15} className={`${summaryLaunchesLoading ? 'animate-pulse text-indigo-400' : 'text-indigo-400'}`} />
                  {summaryLaunchesLoading ? 'Compiling...' : 'Send Daily Report'}
                </button>
              </div>
            </div>
          </div>

          {/* R: Channel logs transactions trail */}
          <div className="lg:col-span-7 bg-[#111113] border border-[#2e2e33] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2e2e33] pb-3.5">
              <div className="flex items-center gap-2">
                <History className="text-[#c5a880]" size={15} />
                <h3 className="font-bold text-white font-display text-sm">Channels Transmission Ledger</h3>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#c5a880] font-black animate-pulse">Trace Log</span>
            </div>

            <p className="text-xs text-slate-400 font-semibold leading-relaxed text-left">
              Diagnostic log tracking real-time notifications routed across Twilio WhatsApp and SMTP email servers. Secure record hashes track failed/successful dispatches and errors.
            </p>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {notificationLogs.length === 0 ? (
                <div className="py-20 text-center text-slate-500 border border-dashed border-[#2e2e33] rounded-xl text-xs font-semibold">
                  No transmissions records tracked in ledger yet. Generate some activity or fire a diagnostics test alert.
                </div>
              ) : (
                notificationLogs.map((log) => {
                  const isSuccess = log.status === 'success';
                  const isWhatsApp = log.type === 'whatsapp';
                  return (
                    <div 
                      key={log.id} 
                      className={`border border-[#2e2e33]/60 bg-[#161619]/30 rounded-xl p-4 transition hover:bg-[#161619] relative text-left`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg flex items-center justify-center border ${isWhatsApp ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/15 text-indigo-400'}`}>
                            {isWhatsApp ? <Smartphone size={12} /> : <Mail size={12} />}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-white block uppercase">{isWhatsApp ? 'WhatsApp Broadcast' : 'SMTP Email Gateway'}</span>
                            <span className="text-[9px] text-slate-500 block font-normal font-mono">{log.recipient}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${isSuccess ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400' : 'bg-rose-500/10 border-rose-500/15 text-rose-400'}`}>
                            {isSuccess ? 'TRANSMITTED' : 'FAILED'}
                          </span>
                          <span className="text-[9px] text-[#86868d] font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 bg-[#070a13] border border-[#1d1d20] p-3 rounded-lg font-mono leading-relaxed whitespace-pre-wrap mt-2 overflow-x-auto text-left">
                        {log.message}
                      </div>

                      {log.error && (
                        <div className="text-[10px] text-rose-400 font-bold bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-lg mt-2 font-mono flex items-start gap-1.5">
                          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                          <span>Error details: {log.error}</span>
                        </div>
                      )}
                      {log.notes && (
                        <div className="text-[10px] text-amber-500 font-bold bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg mt-2 font-mono">
                          Note: {log.notes}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono mt-3 border-t border-[#2e2e33]/50 pt-2 shrink-0">
                        <span>Trace Hash: {log.id}</span>
                        <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
