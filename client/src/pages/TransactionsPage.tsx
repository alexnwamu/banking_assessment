import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://localhost:3001/api";

interface Transaction {
  id: number;
  account_id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  amount: number;
  description: string;
  to_account_id?: string;
  created_at: string;
  accountHolder?: string;
  accountNumber?: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function TransactionsPage() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const { data, isLoading, error } = useQuery<TransactionsResponse>({
    queryKey: ["all-transactions", page],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/transactions?page=${page}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!token,
  });

  const filteredTransactions =
    data?.transactions.filter((t) =>
      typeFilter === "ALL" ? true : t.type === typeFilter
    ) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number, type: string) => {
    const formatted = `$${Math.abs(amount).toFixed(2)}`;
    if (type === "DEPOSIT") {
      return (
        <span className="text-emerald-600 dark:text-emerald-400">
          +{formatted}
        </span>
      );
    }
    return <span className="text-red-600 dark:text-red-400">-{formatted}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50 p-4">
        <p className="text-sm text-red-600 dark:text-red-400">
          Error loading transactions: {(error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-foreground">All Transactions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View transaction history across all accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="type-filter"
            className="text-xs text-muted-foreground"
          >
            Filter:
          </label>
          <Select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-32 h-8 text-xs"
          >
            <option value="ALL">All Types</option>
            <option value="DEPOSIT">Deposits</option>
            <option value="WITHDRAWAL">Withdrawals</option>
            <option value="TRANSFER">Transfers</option>
          </Select>
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1">
                  Date
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Account
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1 justify-end">
                  Amount
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No transactions found
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-foreground">
                    {formatDate(transaction.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {transaction.accountHolder || "Unknown"}
                    {transaction.accountNumber &&
                      ` (••••${transaction.accountNumber.slice(-4)})`}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${
                        transaction.type === "DEPOSIT"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : transaction.type === "WITHDRAWAL"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {transaction.type.charAt(0) +
                        transaction.type.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {transaction.description}
                    {transaction.to_account_id && (
                      <span className="text-muted-foreground text-xs block">
                        To: Account {transaction.to_account_id}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right">
                    {formatAmount(transaction.amount, transaction.type)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {data.totalPages} ({data.total} total)
          </p>
          <div className="flex gap-1">
            <Button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              size="sm"
              variant="outline"
              className="h-8 px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              onClick={() => setPage(page + 1)}
              disabled={page >= data.totalPages}
              size="sm"
              variant="outline"
              className="h-8 px-3"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
