export type OperationType = 'deposit' | 'withdraw';

export interface CashflowOperation {
  id: string;
  type: OperationType;
  amount: number;
  employeeName: string;
  reason: string;
  date: string; // ISO string
  attachmentUrl?: string;
  createdBy: string; // User ID
  source?: 'manual' | 'cashier' | 'debt_payment';
  metadata?: any; // For storing sale details or other extra info
}

export interface CashflowStats {
  totalIn: number;
  totalOut: number;
  balance: number;
}

export type DebtStatus = 'unpaid' | 'partial' | 'paid';

export interface Debt {
  id: string;
  supplierName: string;
  amount: number; // Total debt amount
  remainingAmount: number; // Amount left to pay
  dueDate: string; // ISO date
  notes: string;
  status: DebtStatus;
  createdAt: string;
}
