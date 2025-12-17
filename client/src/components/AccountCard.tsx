import { useState } from "react";
import { Account } from "../types";
import { Button } from "./ui/button";
import { TransactionForm } from "./TransactionForm";
import TransactionTable from "./TransactionTable";
import { ChevronDown, ChevronUp, Plus, Wallet } from "lucide-react";

interface AccountCardProps {
  account: Account;
  accounts: Account[];
}

export function AccountCard({ account, accounts }: AccountCardProps) {
  const [showTransactions, setShowTransactions] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getAccountTypeStyles = (type: string) => {
    return type === "CHECKING"
      ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
      : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400";
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Wallet size={20} className="text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {account.accountHolder}
              </h3>
              <p className="text-sm text-muted-foreground">
                •••• {account.accountNumber.slice(-4)}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md ${getAccountTypeStyles(
              account.accountType
            )}`}
          >
            {account.accountType === "CHECKING" ? "Checking" : "Savings"}
          </span>
        </div>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {formatCurrency(account.balance)}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowTransactions(!showTransactions)}
            variant="outline"
            className="flex-1 h-10"
          >
            {showTransactions ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Transactions
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowTransactionForm(!showTransactionForm)}
            className="flex-1 h-10"
          >
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>
      </div>

      {showTransactionForm && (
        <div className="border-t border-border px-6 py-5 bg-muted/50">
          <h4 className="font-medium text-foreground mb-4">New Transaction</h4>
          <TransactionForm
            account={account}
            accounts={accounts}
            onSuccess={() => setShowTransactionForm(false)}
          />
        </div>
      )}

      {showTransactions && (
        <div className="border-t border-border px-6 py-5">
          <TransactionTable accountId={account.id} />
        </div>
      )}
    </div>
  );
}
