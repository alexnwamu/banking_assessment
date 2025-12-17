import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "../api";
import { TransactionType } from "../types/transaction.types";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { ChevronLeft, ChevronRight, ArrowUpDown, Loader2 } from "lucide-react";

interface TransactionTableProps {
  accountId: string;
}

type SortField = "created_at" | "amount";
type SortOrder = "asc" | "desc";

const TransactionTable = ({ accountId }: TransactionTableProps) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data, isLoading, error } = useQuery({
    queryKey: ["transactions", accountId, page, limit],
    queryFn: () => getTransactions(accountId, page, limit),
    enabled: !!accountId,
  });

  const filteredAndSortedTransactions = useMemo(() => {
    if (!data?.transactions) return [];

    let filtered = data.transactions;

    // Apply type filter
    if (typeFilter !== "ALL") {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any, bValue: any;

      if (sortField === "amount") {
        aValue = a.amount;
        bValue = b.amount;
      } else {
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [data, typeFilter, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number, type: TransactionType) => {
    const formatted = `$${Math.abs(amount).toFixed(2)}`;
    if (type === "DEPOSIT") {
      return (
        <span className="text-emerald-600 dark:text-emerald-400">
          +{formatted}
        </span>
      );
    } else if (type === "WITHDRAWAL" || type === "TRANSFER") {
      return (
        <span className="text-red-600 dark:text-red-400">-{formatted}</span>
      );
    }
    return formatted;
  };

  const getTypeLabel = (type: TransactionType) => {
    const labels = {
      DEPOSIT: "Deposit",
      WITHDRAWAL: "Withdrawal",
      TRANSFER: "Transfer",
    };
    return labels[type];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2
          className="h-5 w-5 animate-spin text-muted-foreground"
          aria-label="Loading transactions"
          role="status"
        />
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-foreground">
          Transaction History
        </h3>
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
            onChange={(e) =>
              setTypeFilter(e.target.value as TransactionType | "ALL")
            }
            className="w-28 h-8 text-xs"
          >
            <option value="ALL">All</option>
            <option value="DEPOSIT">Deposits</option>
            <option value="WITHDRAWAL">Withdrawals</option>
            <option value="TRANSFER">Transfers</option>
          </Select>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                <button
                  onClick={() => toggleSort("created_at")}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Date
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Type
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Description
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                <button
                  onClick={() => toggleSort("amount")}
                  className="flex items-center gap-1 hover:text-foreground ml-auto transition-colors"
                >
                  Amount
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredAndSortedTransactions.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  No transactions found
                </td>
              </tr>
            ) : (
              filteredAndSortedTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-3 py-2.5 text-xs text-foreground">
                    {formatDate(transaction.created_at)}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${
                        transaction.type === "DEPOSIT"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : transaction.type === "WITHDRAWAL"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {getTypeLabel(transaction.type)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-foreground">
                    {transaction.description}
                    {transaction.to_account_id && (
                      <span className="text-muted-foreground text-xs block">
                        To: {transaction.to_account_id}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right font-medium">
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
            Page {page} of {data.totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              aria-label="Previous page"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              size="sm"
              variant="outline"
              className="h-7 px-2"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              aria-label="Next page"
              onClick={() => setPage(page + 1)}
              disabled={page >= data.totalPages}
              size="sm"
              variant="outline"
              className="h-7 px-2"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;
