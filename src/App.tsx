/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Users, 
  Car, 
  Calculator, 
  DollarSign, 
  FileText, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  Search, 
  Bell, 
  Clock, 
  Lock, 
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle,
  AlertCircle,
  Github,
  Link,
  ExternalLink,
  RefreshCw,
  GitBranch,
  Key,
  UserPlus,
  Settings,
  Sun,
  Moon,
  ArrowLeftRight,
  BookOpen,
  Users2,
  Mail
} from 'lucide-react';

import DashboardHome from './components/DashboardHome';
import CustomerManagement from './components/CustomerManagement';
import VehicleManagement from './components/VehicleManagement';
import InstallmentManagement from './components/InstallmentManagement';
import RecoveryOfficerPanel from './components/RecoveryOfficerPanel';
import ReportsPanel from './components/ReportsPanel';
import BackupLogsPanel from './components/BackupLogsPanel';
import PartnersPanel from './components/PartnersPanel';
import { motion, AnimatePresence } from 'motion/react';

import { User, Customer, Vehicle, InstallmentPlan, Payment, AuditLog } from './types';

async function safeFetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return fallback;
    }
    return await res.json() as T;
  } catch (e) {
    // Completely silent fallback during boot/reboot reloads
    return fallback;
  }
}

export default function App() {
  // Session authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('baheria_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('baheria_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('baheria_current_user');
    }
  }, [currentUser]);

  const [isLightTheme, setIsLightTheme] = useState<boolean>(() => {
    return localStorage.getItem('baheria_theme') === 'light';
  });

  useEffect(() => {
    if (isLightTheme) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('baheria_theme', isLightTheme ? 'light' : 'dark');
  }, [isLightTheme]);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // OTP login states
  const [requireOtpState, setRequireOtpState] = useState(false);
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [otpSentEmail, setOtpSentEmail] = useState('');
  const [quickSmtpOpen, setQuickSmtpOpen] = useState(false);
  const [quickSmtpUser, setQuickSmtpUser] = useState('');
  const [quickSmtpPass, setQuickSmtpPass] = useState('');
  const [isQuickSmtpSending, setIsQuickSmtpSending] = useState(false);
  const [quickSmtpSuccess, setQuickSmtpSuccess] = useState('');
  const [quickSmtpError, setQuickSmtpError] = useState('');

  // Password reset OTP states
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotOtp, setForgotOtp] = useState('');

  // Setup mechanism & Simulated SMTP States
  const [hasAdmin, setHasAdmin] = useState<boolean>(true);
  const [adminSetupName, setAdminSetupName] = useState('');
  const [adminSetupUsername, setAdminSetupUsername] = useState('');
  const [adminSetupPassword, setAdminSetupPassword] = useState('');
  const [adminSetupEmail, setAdminSetupEmail] = useState('umairullah410446@gmail.com');
  const [setupLoading, setSetupLoading] = useState(false);
  
  // Dynamic user lists for administrator workspace controls
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [verificationEmails, setVerificationEmails] = useState<any[]>([]);
  const [smtpOpen, setSmtpOpen] = useState(false);

  // Car slideshow state for login page
  const [activeCarSlide, setActiveCarSlide] = useState(0);
  const carSlides = [
    {
      url: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=82&w=1200",
      title: "Audi e-Tron GT",
      type: "Electric Super-Saloon",
      specs: "475 kW • 637 HP • 0-100 in 3.3s",
      tagline: "Uncompromising engineering meets next-gen electric luxury.",
      color: "from-blue-600/30 via-indigo-950/40 to-[#070b13]"
    },
    {
      url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=82&w=1200",
      title: "Porsche 911 Carrera",
      type: "Iconic Precision Sport",
      specs: "Twin-Turbo Box-6 • Active Aero",
      tagline: "A legendary silhouette, engineered for the purest driving soul.",
      color: "from-amber-600/30 via-stone-950/40 to-[#070b13]"
    },
    {
      url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=82&w=1200",
      title: "BMW M8 Competition",
      type: "High-Performance Luxury",
      specs: "4.4L TwinPower V8 • 625 HP",
      tagline: "Savage, unlimited power wrapped in state-of-the-art elegance.",
      color: "from-emerald-600/30 via-slate-900/40 to-[#070b13]"
    }
  ];

  // Auto-slide effect for car gallery
  useEffect(() => {
    if (!currentUser) {
      const interval = setInterval(() => {
        setActiveCarSlide((prev) => (prev + 1) % 3);
      }, 5500);
      return () => clearInterval(interval);
    }
  }, [currentUser]);
  
  // Forgot password flow
  const [forgotFlow, setForgotFlow] = useState(false);
  const [forgotUser, setForgotUser] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  // Self-registration flow
  const [registerFlow, setRegisterFlow] = useState(false);
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'Admin' | 'Salesman' | 'Recovery Officer'>('Admin');
  const [regEmail, setRegEmail] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Sidenav drawer state (responsive)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('home');

  // Real data state lists loaded dynamically from full-stack node server
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Notifications State Managers
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Selector Constants for Security & Role-Based Notifications
  const visibleNotifications = notifications.filter((n: any) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;
    if (currentUser.role === 'Salesman') return n.type === 'sale';
    if (currentUser.role === 'Recovery Officer') return n.type === 'recovery';
    return false;
  });
  const unreadCount = visibleNotifications.filter((n: any) => !n.isRead).length;

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      
      const sse = new EventSource('/api/notifications/stream');
      sse.onmessage = (event) => {
        try {
          const freshNotification = JSON.parse(event.data);
          setNotifications((prev) => {
            // Check for duplicates
            if (prev.some(n => n.id === freshNotification.id)) return prev;
            return [freshNotification, ...prev];
          });
        } catch (err) {
          console.error('SSE JSON error', err);
        }
      };

      return () => {
        sse.close();
      };
    }
  }, [currentUser]);

  // Search Suggestion System
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // UTC clock widget
  const [timeStr, setTimeStr] = useState('');

  // Financial metric calculations state
  const [summary, setSummary] = useState({
    totalVehiclesSold: 0,
    totalInstallmentCustomers: 0,
    totalCashCustomers: 0,
    totalPendingRecovery: 0,
    totalReceivedAmount: 0,
    monthlyCollection: 0,
    todayCollection: 0,
    overdueInstallments: 0,
    totalProfit: 0,
    availableVehicles: 0
  });

  // Fetch collections from server
  const fetchData = async () => {
    try {
      const q = currentUser ? `?userId=${currentUser.id}&role=${currentUser.role}` : '';
      const c = await safeFetchJson<Customer[]>(`/api/customers${q}`, []);
      const v = await safeFetchJson<Vehicle[]>(`/api/vehicles${q}`, []);
      const i = await safeFetchJson<InstallmentPlan[]>(`/api/installments${q}`, []);
      const p = await safeFetchJson<Payment[]>(`/api/payments${q}`, []);
      const l = await safeFetchJson<AuditLog[]>(`/api/logs${q}`, []);
      const m = await safeFetchJson<any>(`/api/financials/dashboard${q}`, null);

      setCustomers(c);
      setVehicles(v);
      setInstallments(i);
      setPayments(p);
      setAuditLogs(l);
      if (m && m.summary) {
        setSummary(m.summary);
      }
    } catch (e) {
      console.error('Failed fetching dealership database files', e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Handle Search Suggestions queries
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          setSearchResults(data);
          setShowSearchResults(true);
        } catch (e) {
          console.error(e);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // UTC Time Tick
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // API Call Handlers proxying back down to children
  const handleAddCustomer = async (cust: any) => {
    const resp = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cust, loggedUser: currentUser })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Customer creation error');
    }
    await fetchData();
  };

  const handleEditCustomer = async (id: string, cust: any) => {
    const resp = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cust, loggedUser: currentUser })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Failed editing customer profile');
    }
    await fetchData();
  };

  const handleDeleteCustomer = async (id: string) => {
    const resp = await fetch(`/api/customers/${id}?loggedUser=${encodeURIComponent(JSON.stringify(currentUser))}`, {
      method: 'DELETE'
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Failed deleting customer');
    }
    await fetchData();
  };

  const handleAddVehicle = async (veh: any) => {
    const resp = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...veh, loggedUser: currentUser })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Vehicle creation error');
    }
    await fetchData();
  };

  const handleEditVehicle = async (id: string, veh: any) => {
    const resp = await fetch(`/api/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...veh, loggedUser: currentUser })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Failed updating vehicle spec');
    }
    await fetchData();
  };

  const handleDeleteVehicle = async (id: string) => {
    const resp = await fetch(`/api/vehicles/${id}?loggedUser=${encodeURIComponent(JSON.stringify(currentUser))}`, {
      method: 'DELETE'
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Failed removing stock log');
    }
    await fetchData();
  };

  const handleAddInstallment = async (plan: any) => {
    const resp = await fetch('/api/installments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...plan, loggedUser: currentUser })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Plan book failed');
    }
    await fetchData();
  };

  const handleRecordPayment = async (pay: any) => {
    const resp = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pay, loggedUser: currentUser })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Billing error');
    }
    const val = await resp.json();
    await fetchData();
    return val;
  };

  // ==========================================
  // GITHUB OAUTH & public INTEGRATION FLOWS
  // ==========================================
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [githubUsernameInput, setGithubUsernameInput] = useState('');
  const [githubFetchLoading, setGithubFetchLoading] = useState(false);
  const [githubFetchError, setGithubFetchError] = useState('');

  // Listen for the postMessage indicating successful GitHub OAuth authentications
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Allow current preview origin and localhost
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.payload) {
        handleLinkGitHub(event.data.payload);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUser]);

  const handleLinkGitHub = async (profile: any) => {
    if (!currentUser) return;
    try {
      const resp = await fetch(`/api/users/${currentUser.id}/github`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ githubProfile: profile }),
      });
      if (resp.ok) {
        setCurrentUser({
          ...currentUser,
          githubProfile: profile
        });
        fetchData();
        setGithubModalOpen(false);
      }
    } catch (e) {
      console.error('Failed saving connected GitHub profile', e);
    }
  };

  const handleFetchPublicGitHub = async () => {
    if (!currentUser || !githubUsernameInput.trim()) {
      setGithubFetchError('Please enter a GitHub username.');
      return;
    }
    setGithubFetchLoading(true);
    setGithubFetchError('');
    try {
      const resp = await fetch(`/api/users/${currentUser.id}/github/fetch-public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: githubUsernameInput.trim() }),
      });
      const data = await resp.json();
      if (resp.ok && data.githubProfile) {
        setCurrentUser({
          ...currentUser,
          githubProfile: data.githubProfile
        });
        fetchData();
        setGithubModalOpen(false);
        setGithubUsernameInput('');
      } else {
        setGithubFetchError(data.error || 'User not found. Check spelled username.');
      }
    } catch (e: any) {
      setGithubFetchError('Integration Server is offline or blocked: ' + e.message);
    } finally {
      setGithubFetchLoading(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to disconnect your connected GitHub account?')) {
      return;
    }
    try {
      const resp = await fetch(`/api/users/${currentUser.id}/github/disconnect`, {
        method: 'POST'
      });
      if (resp.ok) {
        setCurrentUser({
          ...currentUser,
          githubProfile: null
        });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const triggerGitHubOAuth = async () => {
    try {
      const resp = await fetch('/api/auth/github/url');
      if (!resp.ok) {
        throw new Error('OAuth route unavailable');
      }
      const { url } = await resp.json();
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authWindow = window.open(
        url,
        'github_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
      );
      
      if (!authWindow) {
        alert('Popup blocked! Please allow popups for this site is required to authenticate with GitHub.');
      }
    } catch (err: any) {
      alert('Failed launching secure oauth connection: ' + err.message);
    }
  };

  const checkSetupStatus = async () => {
    const data = await safeFetchJson<{ hasAdmin: boolean }>('/api/auth/setup-status', { hasAdmin: true });
    setHasAdmin(data.hasAdmin);
  };

  const fetchSmtpEmails = async () => {
    const data = await safeFetchJson<{ emails: any[] }>('/api/admin/verification-emails', { emails: [] });
    setVerificationEmails(data.emails || []);
  };

  const fetchAdminData = async () => {
    const u = await safeFetchJson<{ users: any[] }>('/api/admin/users', { users: [] });
    const e = await safeFetchJson<{ emails: any[] }>('/api/admin/verification-emails', { emails: [] });
    setAllUsers(u.users || []);
    setVerificationEmails(e.emails || []);
  };

  useEffect(() => {
    if (!currentUser) {
      checkSetupStatus();
      fetchSmtpEmails();
      const interval = setInterval(() => {
        fetchSmtpEmails();
        checkSetupStatus();
      }, 4000);
      return () => clearInterval(interval);
    } else if (currentUser.role === 'Admin') {
      fetchAdminData();
      const interval = setInterval(fetchAdminData, 4000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!loginUsername || !loginPassword) {
      setAuthError('Please fill out both credentials.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requireOtp) {
          setRequireOtpState(true);
          setOtpSentEmail(data.email);
          setLoginOtpCode('');
          setSmtpOpen(true); // Open simulated SMTP reader so they can find the code on-screen!
          fetchSmtpEmails();
        } else if (data.user) {
          setCurrentUser(data.user);
          setActiveTab('home');
        }
      } else {
        setAuthError(data.message || data.error || 'Invalid credentials.');
      }
    } catch (err) {
      setAuthError('Server is currently offline. Reach administrator.');
    }
  };

  // Handle OTP verification submit
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!loginUsername || !loginOtpCode) {
      setAuthError('Verification OTP code is required.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, code: loginOtpCode })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setRequireOtpState(false);
        setCurrentUser(data.user);
        setActiveTab('home');
      } else {
        setAuthError(data.message || data.error || 'Invalid verification code.');
        if (data.error === 'verification_required') {
          // First time non-admin user
          setRequireOtpState(false);
          setSmtpOpen(true);
          fetchSmtpEmails();
        }
      }
    } catch (err) {
      setAuthError('Error calling OTP verification. Please retry.');
    }
  };

  // Handle Quick SMTP Setup & Direct Dispatch from login screen
  const handleQuickSmtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSmtpUser || !quickSmtpPass) {
      setQuickSmtpError('Your Gmail address and Google App Password are required.');
      return;
    }
    setIsQuickSmtpSending(true);
    setQuickSmtpSuccess('');
    setQuickSmtpError('');
    try {
      const response = await fetch('/api/auth/save-smtp-and-resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          smtpHost: 'smtp.gmail.com',
          smtpPort: '465',
          smtpUser: quickSmtpUser,
          smtpPass: quickSmtpPass,
          smtpSecure: true,
          senderEmail: quickSmtpUser
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save SMTP settings');
      }
      setQuickSmtpSuccess(data.message || 'SMTP configured! Verification code sent to actual inbox.');
      setOtpSentEmail(data.email || quickSmtpUser);
    } catch (err: any) {
      setQuickSmtpError(err.message || 'An error occurred during SMTP configuration setup.');
    } finally {
      setIsQuickSmtpSending(false);
    }
  };

  // Admin Setup Submit Handler
  const handleAdminSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!adminSetupName || !adminSetupUsername || !adminSetupPassword || !adminSetupEmail) {
      setAuthError('All initialization variables must be defined.');
      return;
    }
    setSetupLoading(true);
    try {
      const resp = await fetch('/api/auth/setup-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminSetupName,
          username: adminSetupUsername,
          password: adminSetupPassword,
          email: adminSetupEmail
        })
      });
      const data = await resp.json();
      if (resp.ok && data.user) {
        setCurrentUser(data.user);
        setHasAdmin(true);
        setActiveTab('home');
      } else {
        setAuthError(data.error || 'Failed to initialize administrative account.');
      }
    } catch (err: any) {
      setAuthError('Administrative Setup Link Error: ' + err.message);
    } finally {
      setSetupLoading(false);
    }
  };

  // Administrative Custom Account Handlers
  const handleCreateStaffUser = async (userObj: any) => {
    const resp = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userObj)
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Failed to register officer credentials');
    }
    await fetchAdminData();
  };

  const handleDeleteStaffUser = async (id: string) => {
    const resp = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE'
    });
    if (resp.ok) {
      await fetchAdminData();
    }
  };

  const handleResetStaffUserPin = async (id: string, newPin: string) => {
    const resp = await fetch(`/api/admin/users/${id}/reset-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPin })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Failed to reset officer PIN code');
    }
    await fetchAdminData();
    await fetchSmtpEmails();
  };

  const handleApproveStaffLogin = async (id: string) => {
    const resp = await fetch(`/api/admin/users/${id}/approve`, {
      method: 'POST'
    });
    if (resp.ok) {
      await fetchAdminData();
      await fetchSmtpEmails();
    }
  };

  const handleRejectStaffLogin = async (id: string) => {
    const resp = await fetch(`/api/admin/users/${id}/reject`, {
      method: 'POST'
    });
    if (resp.ok) {
      await fetchAdminData();
      await fetchSmtpEmails();
    }
  };

  // Request reset code (Step 1)
  const handleRequestResetOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setForgotMsg('');
    if (!forgotUser || !forgotEmail) {
      setForgotMsg('Username and registered email are required to request a security verification code.');
      return;
    }

    try {
      const res = await fetch('/api/auth/forgot-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUser, email: forgotEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotMsg('Code Sent! A 6-digit PIN reset verification code was sent to ' + forgotEmail + '. Check your inbox.');
        setForgotStep(2);
        setSmtpOpen(true); // Open simulated SMTP spooler!
        fetchSmtpEmails();
      } else {
        setForgotMsg(data.error || 'Identity checks failed. Verify inputs.');
      }
    } catch (err) {
      setForgotMsg('Failed to connect to credential reset request port.');
    }
  };

  // Forgot password handler
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg('');
    if (!forgotUser || !forgotNewPass || !forgotEmail || !forgotOtp) {
      setForgotMsg('Username, registered email, verification OTP code, and target new PIN are all required.');
      return;
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: forgotUser, 
          newPassword: forgotNewPass, 
          email: forgotEmail, 
          code: forgotOtp 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotMsg('Success! Your Admin access PIN has been reset. Redirecting back to showroom login...');
        setTimeout(() => {
          setForgotFlow(false);
          setForgotStep(1);
          setForgotMsg('');
          setForgotUser('');
          setForgotNewPass('');
          setForgotEmail('');
          setForgotOtp('');
        }, 3000);
      } else {
        setForgotMsg(data.error || 'Error resetting password.');
      }
    } catch (err) {
      setForgotMsg('Database reset API fail.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setRegSuccess('');
    if (!regName || !regUsername || !regPassword || !regRole) {
      setAuthError('All registration fields are required.');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          username: regUsername,
          password: regPassword,
          role: regRole,
          email: regEmail
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRegSuccess('Administrator account created successfully! Your new Admin seat is pending security clearance. Please have an existing Administrator approve this seat.');
        setRegName('');
        setRegUsername('');
        setRegPassword('');
        setRegEmail('');
        setTimeout(() => {
          setRegisterFlow(false);
          setRegSuccess('');
        }, 4000);
      } else {
        setAuthError(data.error || 'Failed to create account.');
      }
    } catch (err) {
      setAuthError('Registration API connection failed.');
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setSearchQuery('');
    setLoginUsername('');
    setLoginPassword('');
  };

  // Main UI routing control block
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <DashboardHome 
            summary={summary}
            recentPayments={payments}
            recentSales={installments}
            onNavigate={(tab) => setActiveTab(tab as any)}
            currentUser={currentUser}
            customers={customers}
          />
        );
      case 'customers':
        return (
          <CustomerManagement 
            customers={customers}
            installments={installments}
            payments={payments}
            onAddCustomer={handleAddCustomer}
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            currentUser={currentUser}
          />
        );
      case 'vehicles':
        return (
          <VehicleManagement 
            vehicles={vehicles}
            onAddVehicle={handleAddVehicle}
            onEditVehicle={handleEditVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            currentUser={currentUser}
          />
        );
      case 'installments':
        return (
          <InstallmentManagement 
            customers={customers}
            vehicles={vehicles}
            installments={installments}
            onAddInstallment={handleAddInstallment}
            currentUser={currentUser}
            allUsers={allUsers}
          />
        );
      case 'repayments':
        return (
          <RecoveryOfficerPanel 
            customers={customers}
            installments={installments}
            payments={payments}
            onRecordPayment={handleRecordPayment}
            currentUser={currentUser}
          />
        );
      case 'reports':
        return (
          <ReportsPanel 
            customers={customers}
            vehicles={vehicles}
            installments={installments}
            payments={payments}
            summary={summary}
          />
        );
      case 'security':
        return (
          <BackupLogsPanel 
            auditLogs={auditLogs}
            currentUser={currentUser}
            onRefreshLogs={fetchData}
            usersList={allUsers}
            onCreateUser={handleCreateStaffUser}
            onDeleteUser={handleDeleteStaffUser}
            onApproveLogin={handleApproveStaffLogin}
            onRejectLogin={handleRejectStaffLogin}
            onResetUserPin={handleResetStaffUserPin}
          />
        );
      case 'partners-profiles':
      case 'partners-transactions':
      case 'partners-ledger':
      case 'partners-reports':
        return (
          <PartnersPanel 
            currentUser={currentUser}
            activeSubTab={activeTab}
            setActiveSubTab={setActiveTab}
          />
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  // If no active session, render secure stylish login UI
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#070b13] flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-100 selection:bg-indigo-600 select-none">
        {/* Theme Toggle Button */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setIsLightTheme(!isLightTheme)}
            className="p-2.5 rounded-xl bg-[#0c101b]/60 border border-slate-800 text-[#c5a880] hover:text-white hover:border-[#c5a880] active:scale-95 transition cursor-pointer flex items-center gap-1.5 shadow-xl font-mono text-[10px] font-black uppercase tracking-wider bg-[#121214]"
            title={isLightTheme ? "Switch to Dark Theme" : "Switch to Light Theme"}
          >
            {isLightTheme ? <Moon size={13} className="text-[#c5a880]" /> : <Sun size={13} className="text-[#c5a880]" />}
            <span>{isLightTheme ? 'Dark Theme' : 'Light Theme'}</span>
          </button>
        </div>
        {/* Glow ambient design elements */}
        <div className="absolute top-[10%] left-[20%] w-[450px] h-[450px] bg-indigo-700/5 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[380px] h-[380px] bg-emerald-700/5 rounded-full blur-[110px] pointer-events-none"></div>

        {/* Brand Master Wrap layout */}
        <div className="w-full max-w-5xl bg-[#0c101b]/60 backdrop-blur-2xl rounded-3xl border border-slate-800/80 shadow-2xl relative z-10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[625px]">
          
          {/* LEFT COLUMN: DYNAMIC CAR VISUAL SHOWCASE (visible on lg screens and up) */}
          <div className="lg:col-span-7 hidden lg:block relative overflow-hidden bg-slate-950 border-r border-slate-850">
            {/* Upper Floating Badge */}
            <div className="absolute top-6 left-8 right-6 z-30 flex items-center justify-between pointer-events-none">
              <span className="bg-black/40 backdrop-blur-md text-[#c5a880] border border-[#c5a880]/30 text-[9px] font-mono font-black px-3.5 py-2 rounded-full tracking-wider uppercase flex items-center gap-1.5 shadow-lg">
                <Sparkles size={11} className="animate-spin text-[#c5a880]" />
                BAHERIA DELUXE PORTAL ACTIVE
              </span>
              <span className="bg-emerald-500/10 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-black px-3 py-1.5 rounded-full tracking-widest uppercase shadow-md">
                ● ONLINE
              </span>
            </div>

            {/* Carousel Cards with Fade Transition */}
            {carSlides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${activeCarSlide === index ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0 pointer-events-none'}`}
              >
                {/* Car Photo */}
                <img
                  src={slide.url}
                  alt={slide.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover select-none object-center brightness-[0.65] contrast-[1.05] transition-transform duration-[6000ms]"
                />
                
                {/* Elegant Black Gradient overlay to sink form & text */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070b13] via-transparent to-transparent opacity-95" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#070b13]/25 to-[#070b13]" />

                {/* Content Overlay */}
                <div className="absolute bottom-20 left-10 right-10 space-y-3">
                  <span className="text-[9px] font-black text-[#c5a880] uppercase tracking-widest font-mono bg-[#c5a880]/10 border border-[#c5a880]/30 px-3 py-1 rounded-full">
                    {slide.type}
                  </span>
                  <h2 className="text-3xl font-black text-white tracking-tight leading-none mt-2 drop-shadow-md">
                    {slide.title}
                  </h2>
                  <p className="text-xs text-slate-300 font-medium max-w-sm leading-relaxed">
                    {slide.tagline}
                  </p>
                  <div className="pt-2.5 flex items-center gap-2.5 text-[9px] font-mono text-slate-400 font-black uppercase tracking-wider">
                    <span className="text-[#c5a880]">TUNED:</span>
                    <span className="text-white bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800/80">
                      {slide.specs}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Bottom slideshow controls & micro indicator dots */}
            <div className="absolute bottom-6 left-10 right-10 z-30 flex items-center justify-between">
              <div className="flex gap-2.5">
                {carSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveCarSlide(idx)}
                    className={`h-2 rounded-full transition-all duration-300 pointer-events-auto cursor-pointer ${activeCarSlide === idx ? 'w-8 bg-[#c5a880]' : 'w-2.5 bg-white/20 hover:bg-white/40'}`}
                    aria-label={`Show slide ${idx + 1}`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono font-black text-[#c5a880]/80 tracking-widest uppercase">
                BAHERIA VIP SHOWCASE
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: ACCESS FORM WORKSTATION */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 lg:p-10 space-y-6 bg-slate-900/20">
            
            {/* Top Branding Section */}
            <div className="space-y-1.5 text-center lg:text-left">
              <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-indigo-100 to-[#c5a880]">
                BAHERIA MOTORS
              </h1>
              <p className="text-[10px] text-[#c5a880] font-black uppercase tracking-widest font-mono">
                Vehicle Installment Ledger System
              </p>
            </div>

            {/* MOBILE CAR HERO BANNER - Visible only on viewport lower than lg */}
            <div className="lg:hidden relative h-40 w-full rounded-2xl overflow-hidden border border-slate-800/80 my-1 bg-slate-950">
              <img 
                src={carSlides[activeCarSlide].url} 
                alt="Baheria Motors Showcase" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover brightness-[0.6] transition-opacity duration-500" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c101b] via-[#0c101b]/30 to-transparent" />
              
              {/* Slide controls for mobile screen */}
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                {carSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveCarSlide(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${activeCarSlide === idx ? 'w-5 bg-[#c5a880]' : 'w-1.5 bg-white/40'}`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Specs label for mobile portrait */}
              <div className="absolute bottom-3 left-4 space-y-0.5">
                <span className="text-[8px] font-extrabold text-[#c5a880] uppercase tracking-wider font-mono">
                  {carSlides[activeCarSlide].type}
                </span>
                <h3 className="text-xs font-black text-white leading-none">
                  {carSlides[activeCarSlide].title}
                </h3>
              </div>
            </div>

            {/* AUTH FORMS (Login / Reset flow / Admin Setup) */}
            <div className="flex-1 flex flex-col justify-center py-2 font-sans">
              {!hasAdmin ? (
                <form onSubmit={handleAdminSetupSubmit} className="space-y-4">
                  <h3 className="text-xs font-bold border-b border-slate-800 pb-2 flex items-center gap-1.5 text-[#c5a880] uppercase tracking-wider font-mono">
                    <Sparkles size={13} className="text-[#c5a880] animate-spin" />
                    Inaugural Master Admin Setup
                  </h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    No administrator seat is registered in the database ledger. Complete this sovereign handshake to initialize the system. Use these credentials to later manage salesman and recovery officer profiles.
                  </p>

                  {authError && (
                    <div id="auth-error-div" className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-300 font-semibold flex items-center gap-2">
                      <AlertCircle size={14} className="animate-bounce shrink-0" />
                      {authError}
                    </div>
                  )}

                  <div className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-[#c5a880]">
                    <label className="block">Admin Real Name</label>
                    <input 
                      type="text" 
                      value={adminSetupName}
                      onChange={(e) => setAdminSetupName(e.target.value)}
                      className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] text-xs font-semibold"
                      placeholder="e.g. Aman Baheria"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <label className="block">Login Username</label>
                      <input 
                        type="text" 
                        value={adminSetupUsername}
                        onChange={(e) => setAdminSetupUsername(e.target.value)}
                        className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] text-xs font-mono"
                        placeholder="e.g. admin"
                        required
                      />
                    </div>
                    <div className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <label className="block">Setup Pass PIN</label>
                      <input 
                        type="password" 
                        value={adminSetupPassword}
                        onChange={(e) => setAdminSetupPassword(e.target.value)}
                        className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] text-xs font-mono"
                        placeholder="e.g. 123"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <label className="block">Admin Clearance Email</label>
                    <input 
                      type="email" 
                      value={adminSetupEmail}
                      onChange={(e) => setAdminSetupEmail(e.target.value)}
                      className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] text-xs font-semibold"
                      placeholder="umairullah410446@gmail.com"
                      required
                    />
                    <span className="text-[8px] text-slate-500 font-semibold lowercase tracking-wide block leading-snug">
                      🔒 Critical: First-time Staff login security clearances are dispatched to this address for manual authorization.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={setupLoading}
                    className="w-full bg-[#c5a880] hover:bg-[#b0936b] text-slate-950 font-black text-xs py-3.5 rounded-xl transition shadow-lg tracking-wider uppercase font-mono cursor-pointer disabled:opacity-50"
                  >
                    {setupLoading ? 'Writing Ledger Handshake...' : 'Initialize Showroom Core'}
                  </button>
                </form>
              ) : registerFlow ? (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <h3 className="text-xs font-bold border-b border-[#2e2e33] pb-2 flex items-center justify-between text-[#c5a880] uppercase tracking-wider font-mono">
                    <span className="flex items-center gap-1.5">
                      <UserPlus size={13} className="text-[#c5a880]" />
                      Self-Registration Console
                    </span>
                    <button 
                      type="button" 
                      onClick={() => { setRegisterFlow(false); setAuthError(''); setRegSuccess(''); }} 
                      className="text-[9px] text-[#c5a880] hover:text-[#b0936b] transition font-bold uppercase"
                    >
                      Back to Login
                    </button>
                  </h3>

                  {authError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-[#fca5a5]">
                      {authError}
                    </div>
                  )}

                  {regSuccess && (
                     <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-300 font-semibold leading-relaxed">
                       {regSuccess}
                     </div>
                  )}

                  <div className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-[#c5a880]">
                    <label className="block">Full Officer Name</label>
                    <input 
                      type="text" 
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] text-xs shadow-inner"
                      placeholder="e.g. Shayan Ahmed"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <label className="block">Portal Username</label>
                    <input 
                      type="text" 
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] font-mono text-xs shadow-inner"
                      placeholder="e.g. shayan_ahmed"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-[#c5a880]">
                    <label className="block">Official Role Assignment</label>
                    <div className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-emerald-400 text-xs font-bold font-mono">
                      Showroom Administrator (Admin)
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <label className="block">Showroom Pass PIN Code</label>
                    <input 
                      type="password" 
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] font-mono text-xs shadow-inner"
                      placeholder="Enter Operator Access Code"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-[#c5a880]">
                    <label className="block">Email Address (For Secure OTP Verification)</label>
                    <input 
                      type="email" 
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] text-xs shadow-inner"
                      placeholder="e.g. shayan@gmail.com"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#c5a880] hover:bg-[#b0936b] text-slate-950 font-black text-xs py-3.5 rounded-xl transition shadow-lg tracking-wider uppercase font-mono cursor-pointer shadow-[#c5a880]/10"
                  >
                    Submit For Clearance
                  </button>
                </form>
              ) : !forgotFlow ? (
                requireOtpState ? (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold border-b border-slate-800 pb-2 flex items-center gap-1.5 text-[#c5a880] uppercase tracking-wider font-mono">
                      <Lock size={13} className="text-[#c5a880] animate-pulse" />
                      Two-Factor Security OTP
                    </h3>

                    <div className="bg-emerald-500/10 border border-emerald-500/15 p-3 rounded-xl text-[10px] text-emerald-300 tracking-wide leading-relaxed space-y-1">
                      <p className="font-extrabold uppercase text-[#c5a880]">📬 MOBILE & EMAIL OTP DISPATCHED:</p>
                      <p className="text-slate-300 capitalize normal-case font-semibold text-[9.5px]">
                        A secure 6-digit verification code has been successfully dispatched to your registered address: <strong>{otpSentEmail}</strong>. Please check your inbox or mobile notifications.
                      </p>
                    </div>

                    {/* SANDBOX EXPLANATION AND HELP BOX */}
                    <div className="bg-indigo-500/10 border border-indigo-500/15 p-3 rounded-xl text-[10px] text-indigo-300 tracking-wide leading-relaxed space-y-1.5 text-left">
                      <p className="font-extrabold uppercase text-[#c5a880] flex items-center gap-1 font-mono">
                        <span>💡 Verification Code nahi mila? / Code not received?</span>
                      </p>
                      <p className="text-slate-300 font-medium normal-case text-[9.5px]">
                        <strong>Real Outbound Gmail:</strong> Agar aapne Admin Settings me <strong>SMTP Credentials</strong> save nahi kiye hain, to real email dispatch bypass ho jata hai.
                      </p>
                      <p className="text-slate-300 font-medium normal-case text-[9.5px]">
                        👉 <strong>Instant Login (Sandbox):</strong> Abhi login karne ke liye niche right-side corner par <strong>"EXPAND SPOOLER ⚙️"</strong> button par click karein. Wahan apka <strong>6-Digit Code</strong> live show ho raha hai! Enter custom SMTP to receive real emails.
                      </p>
                    </div>

                    {/* ACCORDION: ATTACH SMTP CARRIER SENDING BOX */}
                    <div className="border border-indigo-500/20 rounded-xl overflow-hidden bg-indigo-500/5">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickSmtpOpen(!quickSmtpOpen);
                          if (!quickSmtpUser) setQuickSmtpUser(otpSentEmail || 'umairullah410446@gmail.com');
                        }}
                        className="w-full flex items-center justify-between p-3 text-left text-xs font-bold text-indigo-300 hover:bg-indigo-500/10 transition font-mono uppercase tracking-wider cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Mail size={13} className="text-[#c5a880] shrink-0" />
                          🚀 Route code to Real Email/Mobile
                        </span>
                        <span className="text-[#c5a880] text-[10px]">{quickSmtpOpen ? '▲ Close Setup' : '▼ Click to Connect'}</span>
                      </button>

                      {quickSmtpOpen && (
                        <form onSubmit={handleQuickSmtpSubmit} className="p-3 border-t border-indigo-500/10 space-y-3 bg-[#070c18] text-left">
                          <p className="text-[9.5px] leading-relaxed text-slate-400">
                            Enter your Gmail Address and App Password to route code directly to your device/inbox instead of simulation mode.
                          </p>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <label className="block text-[8.5px] uppercase tracking-widest font-bold text-[#c5a880] font-mono">My Gmail Address</label>
                              <input
                                type="email"
                                value={quickSmtpUser}
                                onChange={(e) => setQuickSmtpUser(e.target.value)}
                                className="w-full bg-[#03050a] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-indigo-400"
                                placeholder="your-email@gmail.com"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <label className="block text-[8.5px] uppercase tracking-widest font-bold text-[#c5a880] font-mono">Gmail App Password / Code</label>
                                <a 
                                  href="https://myaccount.google.com/apppasswords" 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[8px] text-indigo-400 hover:underline font-bold"
                                >
                                  Get App Password ↗
                                </a>
                              </div>
                              <input
                                type="password"
                                value={quickSmtpPass}
                                onChange={(e) => setQuickSmtpPass(e.target.value)}
                                className="w-full bg-[#03050a] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-indigo-400 font-mono"
                                placeholder="16-character google app code"
                                required
                              />
                            </div>

                            {quickSmtpError && (
                              <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg text-[9px] text-rose-300 font-semibold font-mono leading-relaxed">
                                ⚠️ {quickSmtpError}
                              </div>
                            )}

                            {quickSmtpSuccess && (
                              <div className="bg-emerald-500/10 border border-emerald-500/15 p-2 rounded-lg text-[9px] text-emerald-300 font-semibold font-mono leading-relaxed">
                                🎉 {quickSmtpSuccess}
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={isQuickSmtpSending}
                              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] py-2.5 rounded-lg uppercase tracking-wider font-mono transition shadow disabled:opacity-50 cursor-pointer"
                            >
                              {isQuickSmtpSending ? 'Configuring Outbound Post...' : 'Save Specs & Send Real Code'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                      {authError && (
                        <div id="auth-error-div" className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-300 font-semibold flex items-center gap-2">
                          <AlertCircle size={14} className="animate-bounce shrink-0" />
                          <div>{authError}</div>
                        </div>
                      )}

                      <div className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-[#c5a880]">
                        <label className="block">Enter 6-Digit Code</label>
                        <input 
                          type="text" 
                          maxLength={6}
                          value={loginOtpCode}
                          onChange={(e) => setLoginOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-center text-slate-100 outline-none focus:border-[#c5a880] font-mono tracking-[0.5em] text-lg font-black transition shadow-inner"
                          placeholder="000000"
                          required
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setRequireOtpState(false); setAuthError(''); }}
                          className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 rounded-xl transition cursor-pointer font-semibold uppercase tracking-wider text-center"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="w-1/2 bg-[#c5a880] hover:bg-[#b0936b] text-slate-950 font-black text-xs py-3 rounded-xl transition shadow font-mono cursor-pointer uppercase tracking-wider"
                        >
                          Verify & Login
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {authError && (
                      <div id="auth-error-div" className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-300 font-semibold flex items-center gap-2">
                        <AlertCircle size={14} className="animate-bounce shrink-0 text-rose-400" />
                        <div className="whitespace-pre-line text-left leading-relaxed text-[11px]">{authError}</div>
                      </div>
                    )}

                    <div className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-[#c5a880]">
                      <label className="block">Authorized Username</label>
                      <input 
                        type="text" 
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] font-mono transition text-xs shadow-inner"
                        placeholder="Enter Operator Username"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <div className="flex justify-between items-center">
                        <label className="block">Showroom Pass PIN</label>
                        <button 
                          type="button" 
                          onClick={() => { setForgotFlow(true); setForgotStep(1); setForgotMsg(''); }} 
                          className="text-[9px] text-[#c5a880] hover:text-[#b0936b] transition font-bold tracking-normal uppercase"
                        >
                          Reset PIN?
                        </button>
                      </div>
                      <input 
                        type="password" 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] font-mono transition text-xs shadow-inner"
                        placeholder="Enter Operator Access Code"
                        required
                      />
                    </div>

                    <button
                      id="btn-auth-submit"
                      type="submit"
                      className="w-full bg-[#c5a880] hover:bg-[#b0936b] text-slate-950 font-black text-xs py-3.5 rounded-xl transition shadow-lg tracking-wider uppercase font-mono cursor-pointer shadow-[#c5a880]/10"
                    >
                      Access Showroom Portal
                    </button>

                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-4 text-[10px] font-semibold text-slate-400">
                      <span>New showroom officer?</span>
                      <button
                        type="button"
                        onClick={() => { setRegisterFlow(true); setAuthError(''); setRegSuccess(''); }}
                        className="text-[#c5a880] hover:text-[#b0936b] transition font-bold uppercase tracking-wide flex items-center gap-1"
                      >
                        <UserPlus size={12} />
                        Create Account
                      </button>
                    </div>
                  </form>
                )
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <h3 className="text-xs font-bold border-b border-slate-800 pb-2 flex items-center gap-1.5 text-[#c5a880] uppercase tracking-wider font-mono">
                    <Lock size={13} className="text-[#c5a880]" />
                    Admin Reset PIN Desk
                  </h3>

                  {forgotMsg && (
                    <div id="forgot-auth-msg" className="bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-xl text-xs text-indigo-200 font-semibold leading-relaxed">
                      {forgotMsg}
                    </div>
                  )}

                  <div className="bg-amber-500/10 border border-amber-500/15 p-3 rounded-xl text-[10px] text-amber-200 uppercase tracking-wide leading-relaxed space-y-1">
                    <p className="font-extrabold text-[#c5a880]">ℹ️ SECURITY NOTE:</p>
                    <p className="text-slate-300 capitalize normal-case font-semibold text-[9.5px]">
                      Only Showroom Administrators can self-reset their access credentials. A secure 6-digit confirmation PIN will be sent to the registered email address.
                    </p>
                  </div>

                  {forgotStep === 1 ? (
                    <>
                      <div className="space-y-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <label className="block">Admin Username</label>
                        <input 
                          type="text" 
                          value={forgotUser}
                          onChange={(e) => setForgotUser(e.target.value)}
                          className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] text-xs font-mono"
                          placeholder="e.g. admin"
                          required
                        />
                      </div>

                      <div className="space-y-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <label className="block">Registered Admin Email</label>
                        <input 
                          type="email" 
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] text-xs font-mono"
                          placeholder="e.g. admin@baheriamotors.com"
                          required
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setForgotFlow(false); setForgotMsg(''); }}
                          className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 rounded-xl transition cursor-pointer font-semibold uppercase tracking-wider text-center"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleRequestResetOtp}
                          className="w-1/2 bg-[#c5a880] hover:bg-[#b0936b] text-slate-950 font-black text-xs py-3 rounded-xl transition shadow font-mono cursor-pointer uppercase tracking-wider text-center"
                        >
                          Send Code
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-[#0b0f19] border border-slate-800/65 rounded-xl p-3 text-xs space-y-1 text-slate-400">
                        <div><strong className="text-slate-300">Admin Username:</strong> {forgotUser}</div>
                        <div><strong className="text-slate-300">Registered Email:</strong> {forgotEmail}</div>
                      </div>

                      <div className="space-y-1.5 text-[10px] font-bold text-[#c5a880] uppercase tracking-wider">
                        <label className="block">Enter 6-Digit Code</label>
                        <input 
                          type="text" 
                          maxLength={6}
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-center text-slate-100 outline-none focus:border-[#c5a880] font-mono tracking-widest text-sm font-bold"
                          placeholder="000000"
                          required
                        />
                      </div>

                      <div className="space-y-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <label className="block">Target New PIN Code</label>
                        <input 
                          type="password" 
                          value={forgotNewPass}
                          onChange={(e) => setForgotNewPass(e.target.value)}
                          className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-slate-200 outline-none focus:border-[#c5a880] text-xs font-mono"
                          placeholder="New access PIN code"
                          required
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setForgotStep(1); setForgotMsg(''); }}
                          className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 rounded-xl transition cursor-pointer font-semibold uppercase tracking-wider text-center"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="w-1/2 bg-[#c5a880] hover:bg-[#b0936b] text-slate-950 font-black text-xs py-3 rounded-xl transition shadow font-mono cursor-pointer uppercase tracking-wider"
                        >
                          Confirm Reset
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}
            </div>

            {/* Dynamic credentials design placeholder */}
            <div className="bg-[#070a13] border border-slate-800/80 p-4 rounded-2xl space-y-2 text-[10px] text-slate-400 font-semibold shadow-inner leading-relaxed font-sans">
              <span className="font-bold text-[#c5a880] uppercase block tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-[#c5a880]" />
                Identity Clearance Station:
              </span>
              <p className="text-[9px] font-semibold leading-relaxed">
                {hasAdmin ? (
                  "All staff operator accounts (Sales Specialist, Recovery Officer) must be generated by the Admin inside the Security Dashboard. Share generated passwords directly; credentials are lock-secured on birth."
                ) : (
                  "You are running the initial terminal initialization handshake. Please configure your master administrative credentials to provision staff logbooks."
                )}
              </p>
            </div>

          </div>
        </div>


      </div>
    );
  }

  // Active Authenticated View
  return (
    <div className="min-h-screen flex bg-gray-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white relative">
      
      {/* Sidebar navigation */}
      <aside className={`fixed top-0 bottom-0 left-0 bg-slate-900 text-slate-200 w-64 z-40 transform transition-transform duration-300 border-r border-slate-800 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static flex flex-col justify-between shadow-xl`}>
        
        {/* Dealership header title info */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-white font-display">BAHERIA MOTORS</h2>
              <span className="text-[10px] text-slate-400 font-semibold tracking-widest block uppercase">Showroom Panel</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden p-1 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation menus lists */}
          <nav className="space-y-1.5 pt-4">
            {[
              { id: 'home', label: 'Summary Desktop', icon: Home, roles: ['Admin', 'Salesman', 'Recovery Officer'] },
              { id: 'customers', label: 'Installment Customer Profile', icon: Users, roles: ['Admin', 'Salesman', 'Recovery Officer'] },
              { id: 'vehicles', label: 'Car Showcase', icon: Car, roles: ['Admin', 'Salesman', 'Recovery Officer'] },
              { id: 'installments', label: 'Agreements Ledger', icon: Calculator, roles: ['Admin', 'Salesman'] },
              { id: 'repayments', label: 'Counter Collections', icon: DollarSign, roles: ['Admin', 'Recovery Officer'] },
              { id: 'reports', label: 'Recovery Dashboard', icon: FileText, roles: ['Admin', 'Recovery Officer'] },
              { id: 'partners-profiles', label: 'Partners Directory', icon: Users2, roles: ['Admin'] },
              { id: 'partners-transactions', label: 'Partner Transactions', icon: ArrowLeftRight, roles: ['Admin'] },
              { id: 'partners-ledger', label: 'Partner Ledger', icon: BookOpen, roles: ['Admin'] },
              { id: 'partners-reports', label: 'Investment Reports', icon: FileText, roles: ['Admin'] },
              { id: 'security', label: 'Manage Staff & Logs', icon: ShieldCheck, roles: ['Admin'] }
            ].filter((menu) => menu.roles.includes(currentUser.role)).map((menu) => {
              const Icon = menu.icon;
              const isActive = activeTab === menu.id;
              return (
                <button
                  id={`btn-menu-tab-${menu.id}`}
                  key={menu.id}
                  onClick={() => setActiveTab(menu.id as any)}
                  className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-3 relative overflow-hidden select-none cursor-pointer ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-indicator"
                      className="absolute inset-0 bg-indigo-600 rounded-xl -z-10 shadow-lg shadow-indigo-600/20"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <Icon size={16} className={`relative z-10 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  <span className="relative z-10">{menu.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile brief with GitHub integration & logout button */}
        <div className="p-6 border-t border-slate-800 space-y-4 bg-slate-950/25">
          {currentUser.githubProfile ? (
            <div className="bg-[#1e293b]/60 border border-slate-800/80 rounded-2xl p-3 space-y-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={currentUser.githubProfile.avatar_url} 
                    className="w-10 h-10 rounded-full border-2 border-[#c5a880]/80 object-cover bg-slate-800 shrink-0" 
                    alt="GitHub Avatar" 
                  />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[8px] text-white">✓</span>
                </div>
                <div className="truncate flex-1">
                  <span className="font-extrabold text-xs block text-slate-100 truncate leading-snug">{currentUser.name}</span>
                  <a 
                    href={currentUser.githubProfile.html_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-[#c5a880] font-mono font-bold hover:underline flex items-center gap-1 mt-0.5"
                  >
                    @{currentUser.githubProfile.login}
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-800/50 pt-2 shrink-0">
                <span>Repos: <strong>{currentUser.githubProfile.public_repos}</strong></span>
                <button 
                  onClick={handleDisconnectGitHub}
                  className="text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider text-[8px] hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  Unsync
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700 font-bold text-sm shrink-0 uppercase">
                {currentUser.name.charAt(0)}
              </div>
              <div className="truncate flex-1">
                <span className="font-extrabold text-xs block text-slate-100">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 font-semibold tracking-wider block uppercase">{currentUser.role}</span>
              </div>
            </div>
          )}

          {!currentUser.githubProfile && (
            <button
              onClick={() => {
                setGithubFetchError('');
                setGithubModalOpen(true);
              }}
              className="w-full bg-[#111115] hover:bg-[#1a1a24] text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-800 hover:border-[#c5a880]/40 flex items-center justify-center gap-2 text-slate-300 shadow-sm transition hover:shadow-md cursor-pointer group"
            >
              <Github size={13} className="text-[#c5a880] group-hover:scale-110 transition" />
              <span>Pull GitHub Profile</span>
            </button>
          )}

          <button 
            id="btn-logout"
            onClick={handleLogout}
            className="w-full bg-[#1e1e24] hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 font-bold text-xs py-2 px-4 rounded-xl border border-slate-800/80 hover:border-rose-950/30 flex items-center justify-center gap-2 transition"
          >
            <LogOut size={13} />
            Exit Session
          </button>
        </div>
      </aside>

      {/* Main Container Right Side */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        {/* Top Navbar Header */}
        <header className="bg-white border-b border-slate-100 h-16 flex items-center justify-between px-6 shrink-0 relative z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <Menu size={20} />
            </button>

            {/* Global Global Instant search suggestion query bar */}
            <div className="relative flex items-center gap-3 bg-[#121214] border border-[#2e2e33] hover:border-[#af9268]/45 focus-within:border-[#af9268] focus-within:ring-2 focus-within:ring-[#af9268]/10 px-4 py-2 rounded-lg text-xs w-64 sm:w-96 transition-all duration-300 shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.6)]">
              <Search size={15} className="text-[#af9268] shrink-0" />
              <input 
                type="text" 
                placeholder="Search installment customers or showroom vehicles..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowSearchResults(true); }}
                className="bg-transparent outline-none text-white placeholder-slate-500 w-full font-medium"
              />

              {/* Suggestions panels overlay */}
              {showSearchResults && searchQuery.trim().length > 1 && (
                <div className="absolute top-11 left-0 right-0 bg-[#121214] border border-[#2e2e33] rounded-xl shadow-2xl overflow-hidden max-h-[380px] overflow-y-auto text-xs z-50">
                  <div className="p-3 bg-[#161619] border-b border-[#2e2e33] flex justify-between items-center">
                    <span className="font-bold text-slate-400">Instant Search Suggestion ({searchResults.length})</span>
                    <button onClick={() => setShowSearchResults(false)} className="text-slate-500 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-[#1e1e21]">
                    {searchResults.map((res, i) => (
                      <div 
                        key={i} 
                        className="p-3 hover:bg-[#1a1a1d] cursor-pointer transition flex items-center justify-between"
                        onClick={() => {
                          if (res.type === 'customer') {
                            setActiveTab('customers');
                          } else {
                            setActiveTab('vehicles');
                          }
                          setShowSearchResults(false);
                        }}
                      >
                        <div>
                          <span className="font-bold text-white block">{res.title}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">{res.subTitle}</span>
                        </div>
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${res.type === 'customer' ? 'bg-[#af9268]/15 text-[#c5a880]' : 'bg-emerald-500/10 text-emerald-400'}`}>{res.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* High-end Chronograph-styled Clock & Date dashboard widget */}
            <div className="hidden md:flex items-center gap-3 bg-[#121214] px-4 py-1.5 rounded-lg border border-[#2e2e33] text-xs shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#af9268]/10 border border-[#af9268]/20 animate-pulse">
                <Clock size={12} className="text-[#c5a880] animate-[spin_20s_linear_infinite]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[8px] text-slate-500 uppercase tracking-widest font-extrabold">Chronograph</span>
                <span className="text-white font-mono font-bold tracking-tight text-[11px]">{timeStr} <span className="text-[#af9268] text-[9px] font-bold tracking-normal ml-0.5">UTC</span></span>
              </div>
            </div>

            <div className="w-[1.5px] h-6 bg-[#2e2e33] hidden md:block"></div>

            {/* High-end Theme Toggle */}
            <button 
              onClick={() => setIsLightTheme(!isLightTheme)}
              className="p-2.5 bg-[#121214] hover:bg-[#1a1a1d] rounded-lg border border-[#2e2e33] text-slate-400 hover:text-white transition cursor-pointer relative flex items-center justify-center animate-fade-in"
              title={isLightTheme ? "Switch to Dark Theme" : "Switch to Light Theme"}
            >
              {isLightTheme ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {/* User notification badge */}
            <div className="relative">
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2.5 bg-[#121214] hover:bg-[#1a1a1d] rounded-lg border border-[#2e2e33] text-slate-400 hover:text-white block transition cursor-pointer relative"
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border border-[#121214] animate-ping"></span>
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border border-[#121214]"></span>
                  </>
                )}
              </button>

              {/* Real-Time Dropdown Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2.5 w-92 bg-[#111113] border border-[#2e2e33] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in text-left">
                  {/* Popover Header */}
                  <div className="p-4 border-b border-[#2e2e33] bg-[#161619] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell size={14} className="text-[#c5a880]" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-100">Live Showroom Alerts</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          try {
                            await fetch('/api/notifications/mark-all-read', { method: 'POST' });
                            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="text-[10px] text-[#c5a880] hover:underline font-extrabold uppercase font-mono cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Popover List */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-[#2e2e33]/50">
                    {visibleNotifications.length === 0 ? (
                      <div className="py-12 px-4 text-center text-slate-500 text-xs font-semibold">
                        No active notifications in this feed.
                      </div>
                    ) : (
                      visibleNotifications.map((n) => {
                        const isSale = n.type === 'sale';
                        const isRecovery = n.type === 'recovery';
                        return (
                          <div 
                            key={n.id} 
                            onClick={async () => {
                              if (!n.isRead) {
                                try {
                                  await fetch(`/api/notifications/${n.id}/read`, { method: 'POST' });
                                  setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            className={`p-4 transition hover:bg-[#161619]/60 cursor-pointer text-left relative ${!n.isRead ? 'bg-[#af9268]/5 border-l-2 border-[#af9268]' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`p-1.5 rounded-lg flex items-center justify-center border font-mono shrink-0 mt-0.5 ${isSale ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400' : isRecovery ? 'bg-indigo-500/10 border-indigo-500/15 text-indigo-400' : 'bg-[#2e333e]/50 text-slate-400'}`}>
                                {isSale ? '🚗' : isRecovery ? '💰' : '🔔'}
                              </span>
                              <div className="space-y-1 pr-4">
                                <span className={`text-xs block leading-tight font-black ${!n.isRead ? 'text-white' : 'text-slate-300'}`}>
                                  {n.title}
                                </span>
                                <div className="text-[10px] text-slate-400 font-semibold leading-relaxed font-sans whitespace-pre-wrap line-clamp-4 bg-slate-950/20 p-2 border border-[#2e2e33]/30 rounded">
                                  {n.message}
                                </div>
                                <span className="text-[9px] text-slate-500 block font-mono">
                                  {new Date(n.timestamp).toLocaleTimeString()} • {new Date(n.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            
                            {!n.isRead && (
                              <span className="absolute top-4 right-4 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Popover Footer */}
                  {currentUser?.role === 'Admin' && (
                    <div className="p-3 border-t border-[#2e2e33] bg-[#161619] text-center">
                      <button
                        onClick={() => {
                          setNotificationsOpen(false);
                          setActiveTab('security');
                        }}
                        className="w-full bg-[#111113] hover:bg-slate-905 border border-[#2e2e33] py-2 rounded-xl text-[10px] text-[#c5a880] font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Settings size={12} className="shrink-0" /> Alert configurations & logs
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Multi-view tab router scrollable wrapper canvas */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ========================================== */}
      {/* GITHUB PROFILE SYNC MANAGER MODAL         */}
      {/* ========================================== */}
      {githubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-[#af9268]/10 text-[#c5a880] rounded-xl border border-[#c5a880]/20">
                  <Github size={20} className="animate-pulse" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">GitHub Profile Sync Linker</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Verify credentials or search and pull GitHub profiles to counter operator</p>
                </div>
              </div>
              <button 
                onClick={() => setGithubModalOpen(false)}
                className="p-1 px-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Scrollable area */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {githubFetchError && (
                <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-3 rounded-xl text-[11px] font-bold flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 animate-bounce" />
                  <span>{githubFetchError}</span>
                </div>
              )}

              {/* Option 1: Direct Username Pull */}
              <div className="space-y-3 bg-[#1e293b]/40 border border-slate-800/80 p-5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-[#c5a880]/15 text-[#c5a880] px-2 py-0.5 rounded-md font-mono font-bold">MODE 01</span>
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide">Direct Username Pull (No setup required!)</h4>
                </div>
                <p className="text-[10px] text-slate-405 leading-relaxed text-slate-400">
                  Simply key in your GitHub username to download your public profile metadata, including real avatar, repository checklist counts, and profile hyperlink directly from GitHub's live server.
                </p>
                
                <div className="flex gap-2.5 pt-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px] font-bold">@</span>
                    <input 
                      type="text"
                      value={githubUsernameInput}
                      onChange={(e) => setGithubUsernameInput(e.target.value)}
                      placeholder="e.g. 'umairullah'"
                      className="w-full bg-[#0f172a] hover:bg-[#0f172a]/80 border border-slate-800 hover:border-[#c5a880]/50 pl-7 pr-3 py-2.5 rounded-xl text-xs font-bold text-white outline-none focus:border-[#c5a880] transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFetchPublicGitHub();
                      }}
                    />
                  </div>
                  <button
                    onClick={handleFetchPublicGitHub}
                    disabled={githubFetchLoading}
                    className="bg-[#c5a880] hover:bg-[#b0936b] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition font-mono tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-[#c5a880]/10"
                  >
                    {githubFetchLoading ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <span>Sync</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Option 2: Secure OAuth Login */}
              <div className="space-y-3.5 bg-[#1e293b]/40 border border-slate-800/80 p-5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-[#c5a880]/15 text-[#c5a880] px-2 py-0.5 rounded-md font-mono font-bold">MODE 02</span>
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide">Secure OAuth Connection (Full Handshake)</h4>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Log in securely using GitHub's authorization console to confirm you own the account. This verifies your cryptographic access token with our general ledger system.
                </p>

                <button
                  onClick={triggerGitHubOAuth}
                  className="w-full bg-[#1e293b]/80 hover:bg-[#c5a880] hover:text-[#0f172a] text-xs font-extrabold py-3 px-4 rounded-xl border border-slate-700 hover:border-transparent flex items-center justify-center gap-2.5 text-white shadow-sm transition duration-300 cursor-pointer group"
                >
                  <Github size={15} className="group-hover:scale-110 transition shrink-0" />
                  <span>Connect with Secure GitHub OAuth</span>
                </button>

                {/* Developer Instructions in collapsible block */}
                <div className="border border-slate-800/60 rounded-xl p-3 bg-slate-950/30 text-[9px] font-mono leading-relaxed space-y-2 text-slate-400">
                  <div className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch size={10} className="text-[#c5a880]" />
                    OAuth Callback Credentials Setup
                  </div>
                  <p>To configure GitHub sign-in, add these values in your GitHub developer settings:</p>
                  <div className="bg-[#0f172a] p-2 rounded border border-slate-800/80 space-y-1 overflow-x-auto text-[8px] select-all">
                    <div>Homepage URL: <span className="text-[#c5a880] font-bold">{window.location.origin}</span></div>
                    <div>Authorization Callback URL: <span className="text-[#c5a880] font-bold">{window.location.origin}/api/auth/github/callback</span></div>
                  </div>
                  <p className="text-[8px] text-slate-500">Provide <code className="text-[#c5a880]">GITHUB_CLIENT_ID</code> and <code className="text-[#c5a880]">GITHUB_CLIENT_SECRET</code> in your project settings variables to unlock secure Mode 2.</p>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/40 text-right">
              <button 
                onClick={() => setGithubModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs py-2 px-5 rounded-xl border border-slate-705 transition cursor-pointer"
              >
                Close Manager
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
