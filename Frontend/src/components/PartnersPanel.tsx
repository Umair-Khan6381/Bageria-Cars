/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Edit, 
  Filter, 
  Download, 
  Printer, 
  BookOpen, 
  ArrowDownRight, 
  ArrowUpRight, 
  Activity, 
  Calendar, 
  Percent, 
  Info,
  ChevronDown,
  ShieldAlert,
  Save,
  X,
  FileText,
  Search,
  CheckCircle2
} from 'lucide-react';
import { User, Partner, PartnerTransaction, PartnerTransactionType, PartnerStatus } from '../types';

interface PartnersPanelProps {
  currentUser: User | null;
  activeSubTab: string; // 'partners-profiles' | 'partners-transactions' | 'partners-ledger' | 'partners-reports'
  setActiveSubTab: (tab: any) => void;
}

export default function PartnersPanel({ 
  currentUser, 
  activeSubTab, 
  setActiveSubTab
}: PartnersPanelProps) {
  // Shared state
  const [partners, setPartners] = useState<Partner[]>([]);
  const [transactions, setTransactions] = useState<PartnerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals / Form States
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerFormOpen, setPartnerFormOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    phone: '',
    cnic: '',
    ownershipPercentage: 0,
    initialInvestment: 0,
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'Active' as PartnerStatus,
    notes: ''
  });

  const [editingTransaction, setEditingTransaction] = useState<PartnerTransaction | null>(null);
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    partnerId: '',
    type: 'Investment' as PartnerTransactionType,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Filtering states
  // Profiles Tab
  const [profileSearch, setProfileSearch] = useState('');
  const [profileStatusFilter, setProfileStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Transactions Tab
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('All');
  const [txPartnerFilter, setTxPartnerFilter] = useState<string>('All');
  const [txMonthFilter, setTxMonthFilter] = useState<string>('All');
  const [txYearFilter, setTxYearFilter] = useState<string>('All');

  // Ledger Tab
  const [ledgerPartnerId, setLedgerPartnerId] = useState<string>('');
  const [ledgerYear, setLedgerYear] = useState<string>('All');
  const [ledgerMonth, setLedgerMonth] = useState<string>('All');

  // Reports Tab
  const [reportType, setReportType] = useState<'ledger' | 'yearly' | 'investments' | 'withdrawals'>('ledger');
  const [reportPartnerId, setReportPartnerId] = useState<string>('');
  const [reportYearFilter, setReportYearFilter] = useState<string>('All');

  // Fetch all initial data
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [partnersResp, txResp] = await Promise.all([
        fetch('/api/partners').then(res => res.ok ? res.json() : []),
        fetch('/api/partner-transactions').then(res => res.ok ? res.json() : [])
      ]);
      setPartners(partnersResp);
      setTransactions(txResp);

      // Default ledger and report selections
      if (partnersResp.length > 0) {
        if (!ledgerPartnerId) setLedgerPartnerId(partnersResp[0].id);
        if (!reportPartnerId) setReportPartnerId(partnersResp[0].id);
      }
    } catch (e: any) {
      setError('Failed to synchronize partners financial database. Offline records: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Handle partner save
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!partnerForm.name || !partnerForm.cnic || !partnerForm.phone) {
      setError('Please provide partner name, identification CNIC, and primary phone number.');
      return;
    }

    // Validation for ownership percentage
    const currentTotalPercent = partners
      .filter(p => !editingPartner || p.id !== editingPartner.id)
      .reduce((sum, p) => sum + (Number(p.ownershipPercentage) || 0), 0);

    const targetPercent = Number(partnerForm.ownershipPercentage) || 0;
    if (currentTotalPercent + targetPercent > 100) {
      setError(`Cumulative physical ownership exceeds 100%. Total already distributed: ${currentTotalPercent}%. Unassigned maximum: ${(100 - currentTotalPercent)}%`);
      return;
    }

    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...partnerForm,
          id: editingPartner?.id,
          loggedUser: currentUser
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Partner save failed.');
      }

      setSuccessMsg(editingPartner ? 'Partner profile modernized successfully!' : 'Asset shareholder profile registered successfully!');
      setPartnerFormOpen(false);
      setEditingPartner(null);
      
      // Reset Form
      setPartnerForm({
        name: '',
        phone: '',
        cnic: '',
        ownershipPercentage: 0,
        initialInvestment: 0,
        joiningDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        notes: ''
      });

      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Open Partner edit form
  const handleEditPartnerBtn = (partner: Partner) => {
    setEditingPartner(partner);
    setPartnerForm({
      name: partner.name,
      phone: partner.phone,
      cnic: partner.cnic,
      ownershipPercentage: partner.ownershipPercentage,
      initialInvestment: partner.initialInvestment || 0,
      joiningDate: partner.joiningDate,
      status: partner.status,
      notes: partner.notes || ''
    });
    setPartnerFormOpen(true);
  };

  // Delete Partner
  const handleDeletePartner = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently revoke shareholder profile "${name}"? This removes all matching audit trails and ledger statements!`)) {
      return;
    }
    setError('');
    try {
      const response = await fetch(`/api/partners/${id}?loggedUser=${encodeURIComponent(JSON.stringify(currentUser))}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Deletion failed.');
      }
      setSuccessMsg('Partner profile successfully expunged.');
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Handle transaction save
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!txForm.partnerId || !txForm.type || Number(txForm.amount) <= 0) {
      setError('Please select a partner, select transaction category, and enter non-zero transaction value.');
      return;
    }

    try {
      const response = await fetch('/api/partner-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...txForm,
          id: editingTransaction?.id,
          loggedUser: currentUser
        })
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Failed recording transaction.');
      }

      setSuccessMsg(editingTransaction ? 'Transaction customized successfully.' : 'Capital ledger transaction logged and verified!');
      setTxFormOpen(false);
      setEditingTransaction(null);
      setTxForm({
        partnerId: partners[0]?.id || '',
        type: 'Investment',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });

      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Open transaction edit
  const handleEditTransactionBtn = (tx: PartnerTransaction) => {
    setEditingTransaction(tx);
    setTxForm({
      partnerId: tx.partnerId,
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      notes: tx.notes || ''
    });
    setTxFormOpen(true);
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to remove this ledger entry? Running financial balances will adjust accordingly.')) {
      return;
    }
    setError('');
    try {
      const response = await fetch(`/api/partner-transactions/${id}?loggedUser=${encodeURIComponent(JSON.stringify(currentUser))}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Deletion failed');
      }
      setSuccessMsg('Ledger line entry reverted successfully.');
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // AUTO CALCULATIONS
  // Calculate stats for all active partners
  const getOverviewCalculations = () => {
    let totalInvested = 0;
    let totalWithdrawn = 0;
    let profitDistributed = 0;
    let expenseAdjustment = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'Investment') totalInvested += amt;
      else if (t.type === 'Withdrawal') totalWithdrawn += amt;
      else if (t.type === 'Profit Distribution') profitDistributed += amt;
      else if (t.type === 'Expense Adjustment') expenseAdjustment += amt;
    });

    const netActiveEquity = totalInvested - totalWithdrawn;
    return {
      totalInvested,
      totalWithdrawn,
      netActiveEquity,
      profitDistributed,
      expenseAdjustment,
      activePartnersCount: partners.filter(p => p.status === 'Active').length
    };
  };

  const overview = getOverviewCalculations();

  // Individual Partner Balance calculations
  const getPartnerBalancesMap = () => {
    const balances: Record<string, { invested: number; withdrawn: number; profitPaid: number; expenseDeductions: number; balance: number }> = {};
    
    // Initialize
    partners.forEach(p => {
      balances[p.id] = { invested: 0, withdrawn: 0, profitPaid: 0, expenseDeductions: 0, balance: 0 };
    });

    transactions.forEach(t => {
      if (!balances[t.partnerId]) {
        balances[t.partnerId] = { invested: 0, withdrawn: 0, profitPaid: 0, expenseDeductions: 0, balance: 0 };
      }
      const amt = Number(t.amount) || 0;
      if (t.type === 'Investment') balances[t.partnerId].invested += amt;
      else if (t.type === 'Withdrawal') balances[t.partnerId].withdrawn += amt;
      else if (t.type === 'Profit Distribution') balances[t.partnerId].profitPaid += amt;
      else if (t.type === 'Expense Adjustment') balances[t.partnerId].expenseDeductions += amt;
    });

    partners.forEach(p => {
      const b = balances[p.id];
      if (b) {
        b.balance = b.invested - b.withdrawn;
      }
    });

    return balances;
  };

  const partnerBalances = getPartnerBalancesMap();

  // Filter lists
  const filteredPartnersList = partners.filter(p => {
    const term = profileSearch.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(term) || 
                        p.cnic.includes(term) || 
                        p.phone.includes(term);
    const matchStatus = profileStatusFilter === 'All' || p.status === profileStatusFilter;
    return matchSearch && matchStatus;
  });

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      const term = txSearch.toLowerCase();
      const matchSearch = t.partnerName.toLowerCase().includes(term) || 
                          (t.notes && t.notes.toLowerCase().includes(term)) ||
                          t.addedBy.toLowerCase().includes(term);
      const matchType = txTypeFilter === 'All' || t.type === txTypeFilter;
      const matchPartner = txPartnerFilter === 'All' || t.partnerId === txPartnerFilter;
      
      const txDate = new Date(t.date);
      const txYr = txDate.getFullYear().toString();
      const txMth = (txDate.getMonth() + 1).toString(); // "1" to "12"

      const matchYear = txYearFilter === 'All' || txYr === txYearFilter;
      const matchMonth = txMonthFilter === 'All' || txMth === txMonthFilter;

      return matchSearch && matchType && matchPartner && matchYear && matchMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredTransactionsList = getFilteredTransactions();

  // Create Ledger Array with Running Balance
  const getLedgerStatement = () => {
    if (!ledgerPartnerId) return { partner: null as Partner | null, lines: [] as any[], finalRunningBalance: 0 };

    const partner = partners.find(p => p.id === ledgerPartnerId);
    if (!partner) return { partner: null as Partner | null, lines: [] as any[], finalRunningBalance: 0 };

    // Filter transactions for this partner, sorted chronologically
    const partnerTxs = transactions
      .filter(t => t.partnerId === ledgerPartnerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.createdAt.localeCompare(b.createdAt));

    // Secondary filters: Year / Month
    let filteredTxs = partnerTxs;
    if (ledgerYear !== 'All') {
      filteredTxs = filteredTxs.filter(t => new Date(t.date).getFullYear().toString() === ledgerYear);
    }
    if (ledgerMonth !== 'All') {
      filteredTxs = filteredTxs.filter(t => (new Date(t.date).getMonth() + 1).toString() === ledgerMonth);
    }

    let runningBalance = 0;
    const ledgerLines = filteredTxs.map(t => {
      const amt = Number(t.amount) || 0;
      let debit = 0;   // Inflows (Investments, etc.)
      let credit = 0;  // Outflows (Withdrawals, etc.)

      if (t.type === 'Investment') {
        debit = amt;
        runningBalance += amt;
      } else if (t.type === 'Withdrawal') {
        credit = amt;
        runningBalance -= amt;
      } else if (t.type === 'Profit Distribution') {
        // Shown as secondary equity flow
        credit = amt;
      } else if (t.type === 'Expense Adjustment') {
        credit = amt;
        runningBalance -= amt;
      }

      return {
        ...t,
        debit,
        credit,
        runningBalance
      };
    });

    return {
      partner,
      lines: ledgerLines,
      finalRunningBalance: runningBalance
    };
  };

  const ledgerData = getLedgerStatement();

  // Months labels list helper
  const monthsList = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const getMonthName = (mCode: string) => {
    return monthsList.find(m => m.value === mCode)?.label || 'Month';
  };

  // Extract unique years from transactions for filters
  const getUniqueYears = () => {
    const yrs = new Set<string>();
    transactions.forEach(t => {
      try {
        const y = new Date(t.date).getFullYear().toString();
        yrs.add(y);
      } catch (e) {}
    });
    return Array.from(yrs).sort();
  };
  const uniqueYearsList = getUniqueYears();

  // EXPORT UTILITIES TO EXCEL (CSV Format)
  const handleExportCSV = (typeOfData: string) => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (typeOfData === 'profiles') {
      headers = ['Partner Name', 'Phone Number', 'CNIC', 'Ownership %', 'Joining Date', 'Status', 'Notes', 'Total Invested', 'Total Withdrawn', 'Active Balance'];
      rows = partners.map(p => {
        const bal = partnerBalances[p.id] || { invested: 0, withdrawn: 0, balance: 0 };
        return [
          p.name,
          p.phone,
          p.cnic,
          `${p.ownershipPercentage}%`,
          p.joiningDate,
          p.status,
          p.notes || '',
          bal.invested.toString(),
          bal.withdrawn.toString(),
          bal.balance.toString()
        ];
      });
      filename = 'Shareholders_List.csv';
    } 
    else if (typeOfData === 'transactions') {
      headers = ['Date', 'Partner Name', 'Transaction Type', 'Amount (Rs)', 'Notes', 'Added By'];
      rows = filteredTransactionsList.map(t => [
        t.date,
        t.partnerName,
        t.type,
        t.amount.toString(),
        t.notes || '',
        t.addedBy
      ]);
      filename = 'Ledger_Transactions.csv';
    } 
    else if (typeOfData === 'ledger') {
      if (!ledgerData || !ledgerData.partner) return;
      headers = ['Date', 'Transaction Type', 'Debit (Investment Inflow)', 'Credit (Withdrawals/Charge)', 'Notes', 'Running Balance'];
      rows = (ledgerData.lines || []).map(l => [
        l.date,
        l.type,
        l.debit ? l.debit.toString() : '0',
        l.credit ? l.credit.toString() : '0',
        l.notes || '',
        l.runningBalance.toString()
      ]);
      filename = `${ledgerData.partner.name.replace(/\s+/g, '_')}_Account_Statement.csv`;
    }

    if (rows.length === 0) {
      setError('No database records matched your active filter. Output cancelled. (کوئی ریکارڈ منتخب فلٹرز سے مطابقت نہیں رکھتا۔)');
      return;
    }

    // Convert to CSV string, handling quotes / commas
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodedUri);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  // PRINT TRIGGER (renders clean, printer-friendly page context overlay, then prints)
  const handlePrint = (section: string) => {
    if (!ledgerData || !ledgerData.partner) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Partner Ledger Statement - ${ledgerData.partner.name}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Montserrat', sans-serif;
              color: #1a150e;
              background-color: #ffffff;
              padding: 40px;
              margin: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 24px;
              margin-bottom: 30px;
            }
            .header-info h1 {
              font-size: 24px;
              margin: 0 0 4px 0;
              font-weight: 800;
              letter-spacing: -0.5px;
            }
            .header-info p {
              font-size: 11px;
              color: #475569;
              margin: 0 0 2px 0;
            }
            .balance-box {
              background-color: #1a150e;
              color: #ffffff;
              padding: 16px 24px;
              border-radius: 12px;
              text-align: right;
              min-width: 220px;
            }
            .balance-title {
              font-size: 9px;
              color: #f1cb95;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .balance-val {
              font-size: 20px;
              font-weight: 900;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #f8fafc;
              border-bottom: 2px solid #e2e8f0;
              color: #475569;
              font-size: 10px;
              text-transform: uppercase;
              font-weight: 800;
              padding: 12px 16px;
              letter-spacing: 0.5px;
            }
            td {
              padding: 14px 16px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 11px;
            }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .badge {
              display: inline-block;
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 2px 8px;
              border-radius: 4px;
              margin-right: 8px;
            }
            .badge-investment { background-color: #eff6ff; color: #1d4ed8; }
            .badge-dividend { background-color: #f0fdf4; color: #15803d; }
            .badge-withdrawing { background-color: #fff1f2; color: #b91c1c; }
            .badge-expense { background-color: #faf5ff; color: #6b21a8; }
            
            .text-emerald { color: #059669; font-weight: 700; }
            .text-rose { color: #dc2626; font-weight: 700; }
            .text-bold { font-weight: 700; }
            .muted { color: #94a3b8; }
            .footer-note {
              margin-top: 50px;
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
              border-top: 1px dashed #e2e8f0;
              padding-top: 20px;
            }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-info">
              <p style="color: #6b21a8; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">BAHERIA MOTORS SHOWROOM — GENERAL LEDGER</p>
              <h1>${ledgerData.partner.name}</h1>
              <p>CNIC No: ${ledgerData.partner.cnic} &nbsp;|&nbsp; Mobile: ${ledgerData.partner.phone}</p>
              <p>Capital Ownership Ratio: ${ledgerData.partner.ownershipPercentage}% &nbsp;|&nbsp; Partnership Joined: ${ledgerData.partner.joiningDate}</p>
            </div>
            <div class="balance-box">
              <div class="balance-title">Net Ledger Balance Asset</div>
              <div class="balance-val">Rs. ${ledgerData.finalRunningBalance.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-left" style="width: 12%;">Date</th>
                <th class="text-left" style="width: 48%;">Ledger Reference Item / Notes</th>
                <th class="text-right" style="width: 13%;">Debit (Inflow)</th>
                <th class="text-right" style="width: 13%;">Credit (Payout)</th>
                <th class="text-right" style="width: 14%;">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              <!-- Pre opening -->
              <tr style="background-color: #fafafa;">
                <td class="text-left muted" style="font-family: monospace;">${ledgerData.partner.joiningDate}</td>
                <td class="text-left style="font-weight: 800; letter-spacing: 0.5px; font-size: 9px; color: #64748b;">PRE-OPENING STATEMENT OF ACCOUNT</td>
                <td class="text-right muted">Rs. 0</td>
                <td class="text-right muted">Rs. 0</td>
                <td class="text-right text-bold" style="color: #475569;">Rs. 0</td>
              </tr>
              ${ledgerData.lines.map(ln => {
                const badgeClass = ln.type === 'Investment' ? 'badge-investment' :
                                   ln.type === 'Dividend' ? 'badge-dividend' :
                                   ln.type === 'Withdrawing' ? 'badge-withdrawing' : 'badge-expense';
                return `
                  <tr>
                    <td class="text-left" style="font-family: monospace;">${ln.date}</td>
                    <td class="text-left">
                      <span class="badge ${badgeClass}">${ln.type}</span>
                      <span style="font-weight: 500;">${ln.notes || 'Automated capital sync record'}</span>
                    </td>
                    <td class="text-right ${ln.debit > 0 ? 'text-emerald' : 'muted'}">
                      ${ln.debit > 0 ? `+ Rs. ${ln.debit.toLocaleString()}` : '-'}
                    </td>
                    <td class="text-right ${ln.credit > 0 ? 'text-rose' : 'muted'}">
                      ${ln.credit > 0 ? `- Rs. ${ln.credit.toLocaleString()}` : '-'}
                    </td>
                    <td class="text-right text-bold">
                      Rs. ${ln.runningBalance.toLocaleString()}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer-note">
            This certifies a real-time ledger extraction from the <strong>Baheria Motors VIP Portal</strong>.<br/>
            Exported by ${currentUser?.name || 'Administrator'} on ${new Date().toLocaleString()}<br/>
            All data ledger entries are cryptographically synced and subject to system log auditing.
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 border border-slate-100 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#af9268]/10 text-[#7c5825] rounded-xl border border-[#cbd5e1]">
              <Users size={20} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">Partners Investment & Capital Workspace</h2>
              <p className="text-xs text-slate-500">Master panel for tracking capitalizations, dividend outputs, distributions, and ledger journals.</p>
            </div>
          </div>
        </div>

        {/* Action button toggling */}
        <div className="flex items-center gap-2">
          {activeSubTab === 'partners-profiles' && (
            <button
              onClick={() => {
                setEditingPartner(null);
                setPartnerForm({
                  name: '',
                  phone: '',
                  cnic: '',
                  ownershipPercentage: 0,
                  initialInvestment: 0,
                  joiningDate: new Date().toISOString().split('T')[0],
                  status: 'Active',
                  notes: ''
                });
                setPartnerFormOpen(true);
              }}
              className="px-4 py-2.5 bg-[#af9268] hover:bg-[#967d56] text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} className="stroke-[2.5]" />
              Add Partner Profile (نیا پارٹنر شامل کریں)
            </button>
          )}

          {activeSubTab === 'partners-transactions' && (
            <button
              onClick={() => {
                if (partners.length === 0) {
                  setError('Please list at least one active partner profile before creating transactions. (براہ کرم لین دین شروع کرنے سے پہلے کم از کم ایک فعال پارٹنر شامل کریں)');
                  return;
                }
                setEditingTransaction(null);
                setTxForm({
                  partnerId: partners[0].id,
                  type: 'Investment',
                  amount: 0,
                  date: new Date().toISOString().split('T')[0],
                  notes: ''
                });
                setTxFormOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} className="stroke-[2.5]" />
              New Transaction Entry (نیا لین دین)
            </button>
          )}
        </div>
      </div>

      {/* Global Alerts block */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm animate-fade-in relative">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="absolute right-3.5 text-emerald-450 hover:text-emerald-700 text-sm font-bold">×</button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm animate-fade-in relative">
          <ShieldAlert size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="absolute right-3.5 text-rose-450 hover:text-rose-700 text-sm font-bold">×</button>
        </div>
      )}

      {/* Segment Selector tabs inside Admin Partners panel */}
      <div className="border-b border-slate-200 bg-white px-5 rounded-t-2xl shadow-sm">
        <div className="flex flex-wrap -mb-px text-xs font-bold text-center gap-4">
          <button
            onClick={() => setActiveSubTab('partners-profiles')}
            className={`inline-flex items-center gap-2.5 p-4 border-b-2 rounded-t-lg group cursor-pointer ${
              activeSubTab === 'partners-profiles'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Users size={14} />
            <div className="text-left">
              <span className="block">Partners Profiles & Info</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-normal block">شریک داروں کی معلومات</span>
            </div>
          </button>
          <button
            onClick={() => setActiveSubTab('partners-transactions')}
            className={`inline-flex items-center gap-2.5 p-4 border-b-2 rounded-t-lg group cursor-pointer ${
              activeSubTab === 'partners-transactions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Activity size={14} />
            <div className="text-left">
              <span className="block">Money Transactions Log</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-normal block">پیسوں کا لین دین</span>
            </div>
          </button>
          <button
            onClick={() => setActiveSubTab('partners-ledger')}
            className={`inline-flex items-center gap-2.5 p-4 border-b-2 rounded-t-lg group cursor-pointer ${
              activeSubTab === 'partners-ledger'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <BookOpen size={14} />
            <div className="text-left">
              <span className="block">Partner Ledger Account</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-normal block">کھاتہ اکاؤنٹ (لیجر)</span>
            </div>
          </button>
          <button
            onClick={() => setActiveSubTab('partners-reports')}
            className={`inline-flex items-center gap-2.5 p-4 border-b-2 rounded-t-lg group cursor-pointer ${
              activeSubTab === 'partners-reports'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileText size={14} />
            <div className="text-left">
              <span className="block">Print & Export Reports</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-normal block">رپورٹ اور پرنٹ کا دفتر</span>
            </div>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500 font-mono text-xs">
          <Activity size={24} className="animate-spin text-slate-400 mx-auto mb-3" />
          Synchronizing partners equity balances...
        </div>
      ) : (
        <>
          {/* SEC 1: PARTNERS PROFILES DIRECTORY */}
          {activeSubTab === 'partners-profiles' && (
            <div className="space-y-6">
              {/* Profile statistics cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-indigo-100 transition duration-300">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block font-sans">Active Partners (کل شراکت دار)</span>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-lg font-black text-slate-900">{overview.activePartnersCount} Shareholder(s)</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full">محفوظ ہے</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-indigo-100 transition duration-300">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block font-sans">Total Investment (کل سرمایہ کاری آئی)</span>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-lg font-black text-slate-900 font-mono">Rs. {overview.totalInvested.toLocaleString()}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">کل سرمایہ کاری</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-indigo-100 transition duration-300">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block font-sans">Total Outflow (پیسے واپس لیے)</span>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-lg font-black text-slate-900 font-mono">Rs. {overview.totalWithdrawn.toLocaleString()}</span>
                    <span className="text-[10px] text-rose-500 font-bold">نکالی رقم</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-indigo-100 transition duration-300">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block font-sans">Remaining Capital (باقی کل رقم)</span>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-lg font-black text-emerald-600 font-mono">Rs. {overview.netActiveEquity.toLocaleString()}</span>
                    <span className="text-[10px] text-indigo-500 font-bold font-mono">{(partners.reduce((sum, p) => sum + (Number(p.ownershipPercentage) || 0), 0))}% Share Allocated</span>
                  </div>
                </div>
              </div>

              {/* Profiles Table */}
              <div className="bg-white border border-slate-110 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
                    <input
                      type="text"
                      value={profileSearch}
                      onChange={(e) => setProfileSearch(e.target.value)}
                      placeholder="Search by name, CNIC or phone..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                    <select
                      value={profileStatusFilter}
                      onChange={(e) => setProfileStatusFilter(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="All">All Share status</option>
                      <option value="Active">Active Partners Only</option>
                      <option value="Inactive">Inactive Partners Only</option>
                    </select>

                    <button
                      onClick={() => handleExportCSV('profiles')}
                      className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition shadow-sm cursor-pointer"
                      title="Download Excel CSV Sheet"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>

                {filteredPartnersList.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs italic">
                    No partner records found matching your query.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-3.5 px-5">Partner</th>
                          <th className="py-3.5 px-4">Contact & CNIC</th>
                          <th className="py-3.5 px-4 text-center">Share %</th>
                          <th className="py-3.5 px-4 text-center">Date Joined</th>
                          <th className="py-3.5 px-4 text-center">Status</th>
                          <th className="py-3.5 px-4 text-right">Invested Capital</th>
                          <th className="py-3.5 px-4 text-right">Withdrawn Capital</th>
                          <th className="py-3.5 px-4 text-right">Remaining Balance</th>
                          <th className="py-3.5 px-5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredPartnersList.map((partner) => {
                          const bs = partnerBalances[partner.id] || { invested: 0, withdrawn: 0, balance: 0 };
                          return (
                            <tr key={partner.id} className="hover:bg-slate-50/40 transition">
                              <td className="py-4 px-5">
                                <span className="font-extrabold text-slate-900 block">{partner.name}</span>
                                {partner.notes && (
                                  <span className="text-[10px] text-slate-500 italic block mt-0.5 max-w-xs truncate">{partner.notes}</span>
                                )}
                              </td>
                              <td className="py-4 px-4 font-mono-fig leading-normal">
                                <span className="block font-bold text-slate-700">{partner.phone}</span>
                                <span className="block text-[10px] text-slate-400">{partner.cnic}</span>
                              </td>
                              <td className="py-4 px-4 text-center font-bold font-mono">
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[11px] border border-blue-100 font-sans font-bold">
                                  {partner.ownershipPercentage}%
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center text-slate-600 font-mono-fig">
                                {partner.joiningDate}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={`inline-block font-mono font-bold text-[9px] uppercase px-2.5 py-1 rounded-full ${
                                  partner.status === 'Active' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-slate-50 text-slate-500 border border-slate-200'
                                }`}>
                                  {partner.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                                Rs. {bs.invested.toLocaleString()}
                              </td>
                              <td className="py-4 px-4 text-right font-mono font-bold text-rose-600">
                                Rs. {bs.withdrawn.toLocaleString()}
                              </td>
                              <td className="py-4 px-4 text-right font-mono font-black text-emerald-600">
                                Rs. {bs.balance.toLocaleString()}
                              </td>
                              <td className="py-4 px-5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleEditPartnerBtn(partner)}
                                    className="p-1 px-2.5 bg-slate-50 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 text-[10px] rounded font-bold uppercase transition cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeletePartner(partner.id, partner.name)}
                                    className="p-1 px-2.5 bg-[#af9268]/10 hover:bg-[#af9268]/20 text-[#7c5825] border border-slate-200 text-[10px] rounded font-bold uppercase transition cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEC 2: TRANSACTIONS JOURNAL LIST */}
          {activeSubTab === 'partners-transactions' && (
            <div className="space-y-6">
              {/* Transactions grid filters */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <Filter size={14} className="text-slate-450" />
                  <span className="text-[10px] font-black uppercase text-slate-550 tracking-wider">Dynamic Ledger Filtering Query</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-450 block uppercase mb-1">Partner</label>
                    <select
                      value={txPartnerFilter}
                      onChange={(e) => setTxPartnerFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500"
                    >
                      <option value="All">All Partners listing</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-450 block uppercase mb-1">Tx Type</label>
                    <select
                      value={txTypeFilter}
                      onChange={(e) => setTxTypeFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500"
                    >
                      <option value="All">All Categories</option>
                      <option value="Investment">Investment Entry</option>
                      <option value="Withdrawal">Withdrawal Entry</option>
                      <option value="Profit Distribution">Profit Distribution</option>
                      <option value="Expense Adjustment">Expense Adjustment</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-450 block uppercase mb-1">Fiscal Year</label>
                    <select
                      value={txYearFilter}
                      onChange={(e) => setTxYearFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500"
                    >
                      <option value="All">All Years</option>
                      {uniqueYearsList.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-450 block uppercase mb-1">Fiscal Month</label>
                    <select
                      value={txMonthFilter}
                      onChange={(e) => setTxMonthFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500"
                    >
                      <option value="All">All Months</option>
                      {monthsList.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      onClick={() => handleExportCSV('transactions')}
                      style={{ backgroundColor: '#f1cb95', color: '#1a150e', borderColor: '#e8b674' }}
                      className="w-full py-2 hover:bg-[#e8bd82] hover:text-black border text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition duration-150"
                    >
                      <Download size={13} style={{ color: '#1a150e', stroke: '#1a150e' }} />
                      <span style={{ color: '#1a150e' }}>Export Journal</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction list table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
                    <input
                      type="text"
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      placeholder="Search notes, creators, partners..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:bg-white text-slate-800"
                    />
                  </div>
                </div>

                {filteredTransactionsList.length === 0 ? (
                  <div className="py-16 px-4 text-center">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-indigo-100">
                      <Plus size={18} />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No transactions found</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
                      No financial transactions list matched your active filters or none are recorded yet. Start logging partner investments & withdrawals.
                    </p>
                    <button
                      onClick={() => {
                        if (partners.length === 0) {
                          setError('Please list at least one active partner profile before creating transactions. (براہ کرم لین دین شروع کرنے سے پہلے کم از کم ایک فعال پارٹنر شامل کریں)');
                          return;
                        }
                        setEditingTransaction(null);
                        setTxForm({
                          partnerId: partners[0].id,
                          type: 'Investment',
                          amount: 0,
                          date: new Date().toISOString().split('T')[0],
                          notes: ''
                        });
                        setTxFormOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer select-none"
                    >
                      <Plus size={13} className="stroke-[2.5]" />
                      Add First Transaction (نیا لین دین درج کریں)
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-3 px-5">Date</th>
                          <th className="py-3 px-4">Partner</th>
                          <th className="py-3 px-4 text-center">Category</th>
                          <th className="py-3 px-4 text-right">Amount</th>
                          <th className="py-3 px-4">Notes / Audit Memo</th>
                          <th className="py-3 px-4 text-center">Added By</th>
                          <th className="py-3 px-5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredTransactionsList.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/40 transition">
                            <td className="py-3.5 px-5 font-mono text-slate-600">
                              {tx.date}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {tx.partnerName}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block font-bold text-[9px] uppercase px-2 py-0.5 rounded-full ${
                                tx.type === 'Investment' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                  : tx.type === 'Withdrawal'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : tx.type === 'Profit Distribution'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className={`py-3.5 px-4 text-right font-mono font-extrabold ${
                              tx.type === 'Investment' ? 'text-emerald-600' : 'text-slate-800'
                            }`}>
                              Rs. {Number(tx.amount).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-slate-650 max-w-xs truncate" title={tx.notes}>
                              {tx.notes || <span className="text-slate-300 italic">No comments</span>}
                            </td>
                            <td className="py-3.5 px-4 text-center text-[10px] text-slate-450 font-mono-fig">
                              {tx.addedBy}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleEditTransactionBtn(tx)}
                                  className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded font-semibold text-[10px] border border-slate-200 cursor-pointer"
                                >
                                  Modify
                                </button>
                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1 px-2 text-rose-50 hover:bg-rose-100 text-rose-600 rounded font-semibold text-[10px] border border-rose-200 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEC 3: PARTNER LEDGER ACCOUNT */}
          {activeSubTab === 'partners-ledger' && (
            <div className="space-y-6">
              {/* Ledger Query Selector */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="min-w-[200px]">
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Target Account Profile</label>
                      <select
                        value={ledgerPartnerId}
                        onChange={(e) => setLedgerPartnerId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="">Choose partner...</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.ownershipPercentage}%)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Year</label>
                      <select
                        value={ledgerYear}
                        onChange={(e) => setLedgerYear(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="All">All statements</option>
                        {uniqueYearsList.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Month</label>
                      <select
                        value={ledgerMonth}
                        onChange={(e) => setLedgerMonth(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="All">All Months</option>
                        {monthsList.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 sm:mt-0 shrink-0 self-end">
                    <button
                      onClick={() => handleExportCSV('ledger')}
                      disabled={!ledgerPartnerId || partners.length === 0}
                      style={{ backgroundColor: '#f1cb95', color: '#1a150e', borderColor: '#e8b674' }}
                      className="px-4 py-2 hover:bg-[#e8bd82] hover:text-black disabled:opacity-40 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 cursor-pointer shadow-sm transition duration-150"
                    >
                      <Download size={13} style={{ color: '#1a150e', stroke: '#1a150e' }} />
                      <span style={{ color: '#1a150e' }}>Excel Sheets</span>
                    </button>
                    <button
                      onClick={() => handlePrint('ledger')}
                      disabled={!ledgerPartnerId || partners.length === 0}
                      style={{ backgroundColor: '#f1cb95', color: '#1a150e', borderColor: '#e8b674' }}
                      className="px-4 py-2 hover:bg-[#e8bd82] hover:text-black disabled:opacity-40 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 cursor-pointer shadow-sm transition duration-150"
                    >
                      <Printer size={13} style={{ color: '#1a150e', stroke: '#1a150e' }} />
                      <span style={{ color: '#1a150e' }}>Print Statement</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Account statement view */}
              {!ledgerPartnerId ? (
                <div className="py-20 text-center bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 text-xs italic">
                  Select a partner account profiles above to project interactive journal ledgers.
                </div>
              ) : !ledgerData || !ledgerData.partner ? (
                <div className="py-20 text-center bg-white border border-slate-150 rounded-2xl shadow-sm text-rose-500 font-mono text-xs">
                  Critical loading error: Target partner account does not reside on disk.
                </div>
              ) : (
                <div id="print-area-ledger-statement" className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                  {/* Ledger report header summary */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div className="space-y-1">
                      <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block font-mono">Baheria Showroom - Ledger Statement</span>
                      <h3 className="text-xl font-bold font-display text-slate-900">{ledgerData.partner.name}</h3>
                      <div className="text-[10px] text-slate-500 font-mono-fig leading-relaxed">
                        <span className="font-semibold block">CNIC File: {ledgerData.partner.cnic} | Phone: {ledgerData.partner.phone}</span>
                        <span className="block mt-0.5">Assigned Capital Ownership: <strong>{ledgerData.partner.ownershipPercentage}%</strong> | Joined: {ledgerData.partner.joiningDate}</span>
                      </div>
                    </div>

                    <div className="bg-[#121214] border border-[#2e2e33] p-4 rounded-xl text-right font-mono-fig text-white shadow-md">
                      <span className="text-[9px] text-[#af9268] font-bold uppercase tracking-wider block">Net Ledger Balance Asset</span>
                      <span className="text-lg font-black block tracking-tight text-white">Rs. {ledgerData.finalRunningBalance.toLocaleString()}</span>
                      <span className="text-[8px] text-slate-550 italic mt-0.5 block">Sum balance of all recorded capital events</span>
                    </div>
                  </div>

                  {/* Lines list */}
                  {ledgerData.lines.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-xs italic">
                      No financial transactions matching filters recorded for {ledgerData.partner.name} this period.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                              <th className="py-3 px-4 text-left">Date</th>
                              <th className="py-3 px-4 text-left">Ledger Reference Item</th>
                              <th className="py-3 px-4 text-right">Debit (Capital Inflow)</th>
                              <th className="py-3 px-4 text-right">Credit (Payout/Charge)</th>
                              <th className="py-3 px-4 text-right">Amortized Running Balance</th>
                              <th className="py-3 px-4 text-right">Operator Verification</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-mono-fig">
                            {/* Opening row */}
                            <tr className="bg-slate-50/40 text-slate-500">
                              <td className="py-3 px-4 text-left font-mono font-semibold text-slate-500">
                                {ledgerData.partner.joiningDate}
                              </td>
                              <td className="py-3 px-4 text-left font-bold text-[10px] uppercase tracking-wider text-slate-400">
                                PRE-OPENING STATEMENT OF ACCOUNT
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-400">
                                Rs. 0
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-400">
                                Rs. 0
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-500">
                                Rs. 0
                              </td>
                              <td className="py-3 px-4 text-right font-sans text-[10px] text-slate-350">
                                System Init
                              </td>
                            </tr>

                            {/* Dynamic transaction statement lines */}
                            {ledgerData.lines.map((ln, idx) => (
                              <tr key={ln.id} className="hover:bg-slate-50/50 transition">
                                <td className="py-3.5 px-4 text-left font-mono text-slate-600 text-xs">
                                  {ln.date}
                                </td>
                                <td className="py-3.5 px-4 text-left">
                                  <span className={`inline-block font-bold text-[9px] uppercase px-2 py-0.5 rounded mr-2 ${
                                    ln.type === 'Investment' 
                                      ? 'bg-blue-50 text-blue-700' 
                                      : ln.type === 'Withdrawal'
                                      ? 'bg-rose-50 text-rose-700'
                                      : ln.type === 'Profit Distribution'
                                      ? 'bg-amber-50 text-amber-500'
                                      : 'bg-purple-50 text-purple-700'
                                  }`}>
                                    {ln.type}
                                  </span>
                                  <span className="text-slate-700 font-sans font-medium">{ln.notes || 'Automated capital sync record'}</span>
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-bold">
                                  {ln.debit > 0 ? `+ Rs. ${ln.debit.toLocaleString()}` : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-rose-600 font-bold">
                                  {ln.credit > 0 ? `- Rs. ${ln.credit.toLocaleString()}` : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-black text-slate-950">
                                  Rs. {ln.runningBalance.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right font-sans text-[10px] text-slate-450">
                                  {ln.addedBy}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary footer lines */}
                      <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between text-xs text-slate-500 font-bold font-mono-fig pt-4 mt-2">
                        <span>Total Records Processed: {ledgerData.lines.length} Capital events</span>
                        <div className="space-x-4">
                          <span>Total Capital Injections: <strong className="text-emerald-700">Rs. {ledgerData.lines.reduce((sum, l) => sum + l.debit, 0).toLocaleString()}</strong></span>
                          <span>Total Payouts: <strong className="text-rose-700">Rs. {ledgerData.lines.reduce((sum, l) => sum + l.credit, 0).toLocaleString()}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SEC 4: REPORTS SHEET VIEW */}
          {activeSubTab === 'partners-reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual choice cards */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Reports Generator Engine</h3>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => setReportType('ledger')}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs font-bold transition flex items-center gap-3 ${
                        reportType === 'ledger' 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-650'
                      }`}
                    >
                      <BookOpen size={15} />
                      <div>
                        <span>Partner General Ledger Sheet</span>
                        <span className="text-[10px] text-slate-450 block font-normal">Extract all capital debit / credit and active balance sheet</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setReportType('yearly')}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs font-bold transition flex items-center gap-3 ${
                        reportType === 'yearly' 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-650'
                      }`}
                    >
                      <Calendar size={15} />
                      <div>
                        <span>Yearly Statements Summary</span>
                        <span className="text-[10px] text-slate-450 block font-normal">View chronological capitalizations of the business per partner</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setReportType('investments')}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs font-bold transition flex items-center gap-3 ${
                        reportType === 'investments' 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-650'
                      }`}
                    >
                      <TrendingUp size={15} />
                      <div>
                        <span>Investment Inflow Directory</span>
                        <span className="text-[10px] text-slate-450 block font-normal">Filters capital deposits to trace showroom assets</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setReportType('withdrawals')}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs font-bold transition flex items-center gap-3 ${
                        reportType === 'withdrawals' 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-650'
                      }`}
                    >
                      <Activity size={15} />
                      <div>
                        <span>Withdrawal Outflow Directory</span>
                        <span className="text-[10px] text-slate-450 block font-normal">Audit total partner payouts and asset deductions</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Report filter parameters configurations */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-6">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Filter Sheets & Export Data</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {reportType === 'ledger' && (
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-450 block mb-1">Target Account</label>
                        <select
                          value={reportPartnerId}
                          onChange={(e) => setReportPartnerId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700"
                        >
                          {partners.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(reportType === 'yearly' || reportType === 'investments' || reportType === 'withdrawals') && (
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-450 block mb-1">Year Scope</label>
                        <select
                          value={reportYearFilter}
                          onChange={(e) => setReportYearFilter(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700"
                        >
                          <option value="All">All Years</option>
                          {uniqueYearsList.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-5 space-y-3.5">
                    <h4 className="text-[11px] font-extrabold text-slate-600 block">Available Formats</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          if (reportType === 'ledger') {
                            setLedgerPartnerId(reportPartnerId);
                            setActiveSubTab('partners-ledger');
                            setTimeout(() => {
                              handleExportCSV('ledger');
                            }, 100);
                          } else {
                            // general CSV
                            handleExportCSV('transactions');
                          }
                        }}
                        className="py-2.5 px-4 bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
                      >
                        <Download size={14} />
                        Download CSV Sheet (Excel)
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="py-2.5 px-4 bg-indigo-600 text-white font-bold hover:bg-indigo-700 text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
                      >
                        <Printer size={14} />
                        Print Document (PDF / AirPrint)
                      </button>
                    </div>

                    <div className="bg-[#121214] border border-[#2e2e33] p-4 rounded-xl flex items-start gap-3 mt-4 text-slate-300">
                      <Info className="text-[#c5a880] shrink-0 mt-0.5" size={14} />
                      <div className="text-[10px] font-medium leading-relaxed font-sans">
                        <span className="font-extrabold text-[#c5a880] uppercase tracking-wider block mb-1">Accounting Protocol Reminder</span>
                        The output includes absolute audit markers denoting added dates, user IDs, chronological transaction references, and running balances. In accordance with dealership guidelines, keep these records private and safe.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* FORM MODAL 1: ADD / EDIT PARTNER */}
      {partnerFormOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-150 animate-zoom-in">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">
                  {editingPartner ? 'Update Shareholder profile' : 'Add Partner Profile'}
                </h3>
                <p className="text-[10px] text-slate-500">Provide legal credentials of showroom investment shareholder</p>
              </div>
              <button onClick={() => setPartnerFormOpen(false)} className="text-slate-450 hover:text-slate-800 text-base font-bold">×</button>
            </div>

            <form onSubmit={handleSavePartner} className="p-5 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Partner Name *</label>
                <input
                  type="text"
                  required
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  placeholder="e.g. Haji Bashir Ahmad"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                    placeholder="e.g. 0300-1234567"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">CNIC Number *</label>
                  <input
                    type="text"
                    required
                    value={partnerForm.cnic}
                    onChange={(e) => setPartnerForm({ ...partnerForm, cnic: e.target.value })}
                    placeholder="e.g. 35201-1234567-1"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Ownership Share (%) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0.01"
                      max="100"
                      step="0.01"
                      value={partnerForm.ownershipPercentage || ''}
                      onChange={(e) => setPartnerForm({ ...partnerForm, ownershipPercentage: Number(e.target.value) })}
                      placeholder="e.g. 15.5"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                    <Percent className="absolute right-3.5 top-3 text-slate-400" size={13} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={partnerForm.joiningDate}
                    onChange={(e) => setPartnerForm({ ...partnerForm, joiningDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Active Status</label>
                  <select
                    value={partnerForm.status}
                    onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value as PartnerStatus })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 block focus:outline-none focus:bg-white"
                  >
                    <option value="Active">Active Shareholder</option>
                    <option value="Inactive">Inactive / Suspended</option>
                  </select>
                </div>

                {!editingPartner && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Total Investment (Rs.) / سرمایہ کاری رقم</label>
                    <input
                      type="number"
                      min="0"
                      value={partnerForm.initialInvestment || ''}
                      onChange={(e) => setPartnerForm({ ...partnerForm, initialInvestment: Number(e.target.value) })}
                      placeholder="e.g. 5000000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                )}
              </div>

              {/* Profit Calculation Easy Guide Widget */}
              <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl text-[11px] text-indigo-950 font-medium space-y-1">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Profit & Share Explanation (منافع کا حساب کتاب)</span>
                </div>
                <p className="leading-relaxed text-slate-700">
                  Partner ki <span className="font-bold text-indigo-700">Total Investment ({partnerForm.initialInvestment ? `Rs. ${partnerForm.initialInvestment.toLocaleString()}` : 'Rs. 0'})</span> aur <span className="font-bold text-indigo-700">Ownership Share ({partnerForm.ownershipPercentage || 0}%)</span> ke hisab se profit automatically calculate hoga. 
                </p>
                <div className="text-[10px] text-slate-500 italic bg-white/60 p-1.5 rounded border border-indigo-50 mt-1">
                  Misaal ke tour par: Showroom ke kul munafa (Profit) me se is partner ko un ke <strong>{partnerForm.ownershipPercentage || 0}% share</strong> ke mutabiq profit milega.
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Additional Notes</label>
                <textarea
                  value={partnerForm.notes}
                  onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })}
                  placeholder="Memo tags, physical assets brought, banking coordinates..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder-slate-400"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPartnerFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#af9268] hover:bg-[#967d56] text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} />
                  {editingPartner ? 'Update Profile' : 'Publish Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL 2: ADD / EDIT TRANSACTION */}
      {txFormOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-150 animate-zoom-in">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">
                  {editingTransaction ? 'Modify capital transaction' : 'Log Capital Transaction'}
                </h3>
                <p className="text-[10px] text-slate-500">Record a debit or credit capital flow in the ledger</p>
              </div>
              <button onClick={() => setTxFormOpen(false)} className="text-slate-450 hover:text-slate-800 text-base font-bold">×</button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-5 space-y-4 text-xs font-semibold animate-fade-in">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Target Partner Account *</label>
                <select
                  required
                  value={txForm.partnerId}
                  onChange={(e) => setTxForm({ ...txForm, partnerId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 block focus:outline-none focus:bg-white"
                >
                  <option value="">Select target partner...</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.ownershipPercentage}%)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Transaction Category *</label>
                  <select
                    required
                    value={txForm.type}
                    onChange={(e) => setTxForm({ ...txForm, type: e.target.value as PartnerTransactionType })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 block focus:outline-none focus:bg-white"
                  >
                    <option value="Investment">Investment (Inflow Capital)</option>
                    <option value="Withdrawal">Withdrawal (Capital Outflow/Payout)</option>
                    <option value="Profit Distribution">Profit Distribution (Dividends Paid)</option>
                    <option value="Expense Adjustment">Expense Adjustment (Shareholder Charge)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Transaction Date *</label>
                  <input
                    type="date"
                    required
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Transaction Amount (Rs.) *</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={txForm.amount || ''}
                    onChange={(e) => setTxForm({ ...txForm, amount: Number(e.target.value) })}
                    placeholder="e.g. 500000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                  <span className="absolute right-3.5 top-3 text-[10px] text-slate-400 font-mono font-bold">PKR</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Audit Trail Notes *</label>
                <textarea
                  required
                  value={txForm.notes}
                  onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                  placeholder="Clear description of the event. Bank transfer IDs, Cheque references, Cash slip receipts..."
                  rows={4}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder-slate-400"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTxFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} />
                  {editingTransaction ? 'Update Entry' : 'Verify & Log Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
