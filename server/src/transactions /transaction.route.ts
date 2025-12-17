import express from "express";
import { createTransaction, getTransactions } from "./transaction.controller";

const transactionRouter = express.Router();

transactionRouter.post("/:id/transactions", createTransaction);
transactionRouter.get("/:id/transactions", getTransactions);

export { transactionRouter };
