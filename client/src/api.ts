import { Account } from "./types";
import {
  CreateTransactionDto,
  TransactionResponse,
  TransactionsListResponse,
} from "./types/transaction.types";

const API_URL = "http://localhost:3001/api";

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const getAccounts = async (): Promise<Account[]> => {
  const response = await fetch(`${API_URL}/accounts`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Please log in to continue");
    throw new Error("Failed to fetch accounts");
  }
  return response.json();
};

export const getAccount = async (id: string): Promise<Account> => {
  const response = await fetch(`${API_URL}/accounts/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Please log in to continue");
    throw new Error("Failed to fetch account");
  }
  return response.json();
};

export const getTransactions = async (
  accountId: string,
  page: number = 1,
  limit: number = 10
): Promise<TransactionsListResponse> => {
  const response = await fetch(
    `${API_URL}/accounts/${accountId}/transactions?page=${page}&limit=${limit}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) {
    if (response.status === 401) throw new Error("Please log in to continue");
    throw new Error("Failed to fetch transactions");
  }
  return response.json();
};

export const createTransaction = async (
  accountId: string,
  transaction: CreateTransactionDto
): Promise<TransactionResponse> => {
  const response = await fetch(
    `${API_URL}/accounts/${accountId}/transactions`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(transaction),
    }
  );

  if (!response.ok) {
    if (response.status === 401) throw new Error("Please log in to continue");
    const error = await response.json();
    throw new Error(error.error || "Failed to create transaction");
  }
  return response.json();
};
