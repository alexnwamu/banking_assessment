import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createTransaction } from "../api";
import { Account } from "../types";
import {
  CreateTransactionDto,
  TransactionType,
} from "../types/transaction.types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";

interface TransactionFormProps {
  account: Account;
  accounts: Account[];
  onSuccess?: () => void;
}

export function TransactionForm({
  account,
  accounts,
  onSuccess,
}: TransactionFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateTransactionDto>({
    type: "DEPOSIT",
    amount: 0,
    description: "",
    toAccountId: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionDto) =>
      createTransaction(account.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account", account.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions", account.id] });
      setFormData({
        type: "DEPOSIT",
        amount: 0,
        description: "",
        toAccountId: undefined,
      });
      setErrors({});
      toast.success("Transaction created successfully");
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message });
      toast.error(error.message);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (formData.amount > 1000000) {
      newErrors.amount = "Amount exceeds maximum limit of $1,000,000";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (formData.description.length > 200) {
      newErrors.description = "Description must be less than 200 characters";
    }

    if (formData.type === "TRANSFER" && !formData.toAccountId) {
      newErrors.toAccountId = "Target account is required for transfers";
    }

    if (formData.type === "WITHDRAWAL" && formData.amount > account.balance) {
      newErrors.amount = "Insufficient funds";
    }

    if (formData.type === "TRANSFER" && formData.amount > account.balance) {
      newErrors.amount = "Insufficient funds for transfer";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createMutation.mutate(formData);
    }
  };

  const otherAccounts = accounts.filter((a) => a.id !== account.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="type" className="text-xs text-muted-foreground">
          Transaction Type
        </Label>
        <Select
          id="type"
          value={formData.type}
          onChange={(e) =>
            setFormData({
              ...formData,
              type: e.target.value as TransactionType,
              toAccountId: undefined,
            })
          }
          className="h-9"
        >
          <option value="DEPOSIT">Deposit</option>
          <option value="WITHDRAWAL">Withdrawal</option>
          {otherAccounts.length > 0 && (
            <option value="TRANSFER">Transfer</option>
          )}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount" className="text-xs text-muted-foreground">
          Amount ($)
        </Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          max="1000000"
          value={formData.amount || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              amount: parseFloat(e.target.value) || 0,
            })
          }
          className={`h-9 ${
            errors.amount ? "border-red-500 dark:border-red-500" : ""
          }`}
        />
        {errors.amount && (
          <p className="text-xs text-red-500 dark:text-red-400">
            {errors.amount}
          </p>
        )}
      </div>

      {formData.type === "TRANSFER" && (
        <div className="space-y-1.5">
          <Label
            htmlFor="toAccountId"
            className="text-xs text-muted-foreground"
          >
            Transfer To
          </Label>
          <Select
            id="toAccountId"
            value={formData.toAccountId || ""}
            onChange={(e) =>
              setFormData({ ...formData, toAccountId: e.target.value })
            }
            className={`h-9 ${
              errors.toAccountId ? "border-red-500 dark:border-red-500" : ""
            }`}
          >
            <option value="">Select account...</option>
            {otherAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.accountHolder} - •••• {acc.accountNumber.slice(-4)}
              </option>
            ))}
          </Select>
          {errors.toAccountId && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {errors.toAccountId}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs text-muted-foreground">
          Description
        </Label>
        <Input
          id="description"
          type="text"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          maxLength={200}
          placeholder="Enter description"
          className={`h-9 ${
            errors.description ? "border-red-500 dark:border-red-500" : ""
          }`}
        />
        {errors.description && (
          <p className="text-xs text-red-500 dark:text-red-400">
            {errors.description}
          </p>
        )}
      </div>

      {errors.submit && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50 p-3">
          <p className="text-xs text-red-600 dark:text-red-400">
            {errors.submit}
          </p>
        </div>
      )}

      <Button
        type="submit"
        disabled={createMutation.isPending}
        className="w-full h-9"
      >
        {createMutation.isPending ? "Processing..." : "Submit"}
      </Button>
    </form>
  );
}
