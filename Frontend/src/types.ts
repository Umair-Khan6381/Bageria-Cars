/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Admin' | 'Salesman' | 'Recovery Officer';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  githubProfile?: {
    login: string;
    name: string;
    avatar_url: string;
    public_repos: number;
    html_url: string;
    bio?: string;
  } | null;
}

export interface Customer {
  id: string;
  name: string;
  fatherName: string;
  cnic: string;
  phone: string;
  alternatePhone: string;
  address: string;
  guarantorName: string;
  guarantorCnic: string;
  photoUrl?: string;
  documents?: string[]; // stored as filenames or data URIs
  createdAt: string;
  salesmanId?: string;
  salesmanName?: string;
}

export type VehicleStatus = 'Available' | 'Sold on Cash' | 'Sold on Installment' | 'Reserved';

export interface Vehicle {
  id: string;
  company: string;
  model: string;
  variant: string;
  modelYear: string;
  registrationNumber: string;
  engineNumber: string;
  chassisNumber: string;
  color: string;
  fuelType: string; // Petrol, Diesel, Hybrid, Electric
  transmission: string; // Automatic, Manual
  purchasePrice: number;
  salePrice: number;
  photoUrl?: string; // base64 or static url
  documents?: string[];
  status: VehicleStatus;
  createdAt: string;
}

export type InstallmentStatus = 'Active' | 'Overdue' | 'Defaulter' | 'Completed';

export interface InstallmentPlan {
  id: string;
  customerId: string;
  vehicleId: string;
  customerName: string; // Denormalized for quick list retrieval
  vehicleName: string;   // Denormalized e.g. "Toyota Corolla Altis"
  vehicleNumber: string; // Denormalized e.g. "XYZ-123"
  vehiclePrice: number;
  downPayment: number;
  remainingAmount: number;
  monthlyInstallment: number;
  durationMonths: number;
  startDate: string;
  dueDay: number; // Day of month when payment is due (e.g. 5 means 5th of each month)
  totalPaid: number;
  balance: number;
  status: InstallmentStatus;
  lastPaymentDate?: string;
  nextDueDate?: string;
  createdAt: string;
  salesmanId?: string;
  salesmanName?: string;
  commission?: number;
  saleType?: 'Installment' | 'Cash';
  saleDate?: string;
}

export interface Payment {
  id: string;
  customerId: string;
  installmentId: string;
  customerName: string;
  vehicleName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque' | 'EasyPaisa/JazzCash';
  receiptNumber: string;
  notes?: string;
  recordedBy: string; // user's name/role
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
}

export interface AuditLog {
  id: string;
  username: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface BackupInfo {
  id: string;
  filename: string;
  size: string;
  createdAt: string;
  status: string;
}

export type PartnerStatus = 'Active' | 'Inactive';

export interface Partner {
  id: string;
  name: string;
  phone: string;
  cnic: string;
  ownershipPercentage: number;
  initialInvestment?: number;
  joiningDate: string;
  status: PartnerStatus;
  notes?: string;
  createdAt: string;
}

export type PartnerTransactionType = 'Investment' | 'Withdrawal' | 'Profit Distribution' | 'Expense Adjustment';

export interface PartnerTransaction {
  id: string;
  partnerId: string;
  partnerName: string;
  type: PartnerTransactionType;
  amount: number;
  date: string;
  notes?: string;
  addedBy: string;
  createdAt: string;
}

