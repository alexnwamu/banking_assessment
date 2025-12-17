export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";

export interface Transaction {
  id: number;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  to_account_id?: string;
  created_at: string;
}

export interface CreateTransactionDto {
  type: TransactionType;
  amount: number;
  description: string;
  toAccountId?: string;
}

export interface TransactionResponse {
  id: number;
  accountId: string;
  type: TransactionType;
  amount: number;
  description: string;
  toAccountId?: string;
  createdAt: string;
  balance: number;
}

export interface TransactionsListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
