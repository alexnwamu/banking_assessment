import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "../api";
import { Loader2, Wallet } from "lucide-react";

export function AccountsPage() {
  const {
    data: accounts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
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
          Error loading accounts: {(error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground">All Accounts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage all bank accounts
        </p>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Account
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Account Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Type
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                Balance
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!accounts || accounts.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No accounts found
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr
                  key={account.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Wallet size={16} className="text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {account.accountHolder}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    •••• {account.accountNumber.slice(-4)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${
                        account.accountType === "CHECKING"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {account.accountType === "CHECKING"
                        ? "Checking"
                        : "Savings"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground text-right">
                    {formatCurrency(account.balance)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(account.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
