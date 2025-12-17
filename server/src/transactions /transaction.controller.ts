import { Request, Response } from "express";
import { db } from "../db";
import {
  CreateTransactionDto,
  TransactionType,
} from "../types/transaction.types";

// Validation helper
const validateTransactionRequest = (
  body: CreateTransactionDto
): string | null => {
  const { type, amount, description, toAccountId } = body;

  if (!type || !["DEPOSIT", "WITHDRAWAL", "TRANSFER"].includes(type)) {
    return "Invalid transaction type. Must be 'DEPOSIT', 'WITHDRAWAL', or 'TRANSFER'";
  }

  if (!amount || typeof amount !== "number" || amount <= 0) {
    return "Amount must be a positive number";
  }

  if (amount > 1000000) {
    return "Amount exceeds maximum limit of $1,000,000";
  }

  if (!description || description.trim().length === 0) {
    return "Description is required";
  }

  if (description.length > 200) {
    return "Description must be less than 200 characters";
  }

  if (type === "TRANSFER" && !toAccountId) {
    return "Target account ID is required for transfers";
  }

  return null;
};

export const createTransaction = async (
  req: Request,
  res: Response
): Promise<void> => {
  const accountId = req.params.id;
  const transactionData: CreateTransactionDto = req.body;

  // Validate request
  const validationError = validateTransactionRequest(transactionData);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const { type, amount, description, toAccountId } = transactionData;

  try {
    // Start transaction
    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    // Get source account
    const sourceAccount: any = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM accounts WHERE id = ?", [accountId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!sourceAccount) {
      await new Promise((resolve) => db.run("ROLLBACK", () => resolve(null)));
      res.status(404).json({ error: "Account not found" });
      return;
    }

    let sourceNewBalance = sourceAccount.balance;
    let targetAccount: any = null;
    let targetNewBalance = 0;

    // Handle transfer logic
    if (type === "TRANSFER") {
      targetAccount = await new Promise((resolve, reject) => {
        db.get(
          "SELECT * FROM accounts WHERE id = ?",
          [toAccountId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!targetAccount) {
        await new Promise((resolve) => db.run("ROLLBACK", () => resolve(null)));
        res.status(404).json({ error: "Target account not found" });
        return;
      }

      if (accountId === toAccountId) {
        await new Promise((resolve) => db.run("ROLLBACK", () => resolve(null)));
        res.status(400).json({ error: "Cannot transfer to the same account" });
        return;
      }

      targetNewBalance = targetAccount.balance + amount;
    }

    // Calculate new balance for source account
    if (type === "WITHDRAWAL" || type === "TRANSFER") {
      if (sourceNewBalance < amount) {
        await new Promise((resolve) => db.run("ROLLBACK", () => resolve(null)));
        res.status(400).json({ error: "Insufficient funds" });
        return;
      }
      sourceNewBalance -= amount;
    } else if (type === "DEPOSIT") {
      sourceNewBalance += amount;
    }

    // Update source account balance
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE accounts SET balance = ? WHERE id = ?",
        [sourceNewBalance, accountId],
        (err) => {
          if (err) reject(err);
          else resolve(null);
        }
      );
    });

    // Update target account balance for transfers
    if (type === "TRANSFER" && targetAccount) {
      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE accounts SET balance = ? WHERE id = ?",
          [targetNewBalance, toAccountId],
          (err) => {
            if (err) reject(err);
            else resolve(null);
          }
        );
      });
    }

    // Insert transaction record
    const transactionResult: any = await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO transactions (account_id, type, amount, description, to_account_id) VALUES (?, ?, ?, ?, ?)",
        [accountId, type, amount, description, toAccountId || null],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.run("COMMIT", (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    // Send response
    res.status(201).json({
      id: transactionResult.id,
      accountId,
      type,
      amount,
      description,
      toAccountId: toAccountId || undefined,
      createdAt: new Date().toISOString(),
      balance: sourceNewBalance,
    });
  } catch (error) {
    // Rollback on error
    await new Promise((resolve) => db.run("ROLLBACK", () => resolve(null)));
    console.error("Transaction error:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
};

export const getTransactions = async (
  req: Request,
  res: Response
): Promise<void> => {
  const accountId = req.params.id;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  try {
    // Check if account exists
    const account: any = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM accounts WHERE id = ?", [accountId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    // Get transactions
    const transactions: any[] = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          id,
          account_id,
          type,
          amount,
          description,
          to_account_id,
          created_at
        FROM transactions 
        WHERE account_id = ? OR to_account_id = ?
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?`,
        [accountId, accountId, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get total count
    const totalResult: any = await new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) as count FROM transactions WHERE account_id = ? OR to_account_id = ?",
        [accountId, accountId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const total = totalResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      transactions,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};
