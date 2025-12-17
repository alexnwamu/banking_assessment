import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, Mock } from "vitest";
import { TransactionForm } from "../TransactionForm";
import { createTransaction } from "../../api";

vi.mock("../../api");

const mockCreateTransaction = createTransaction as Mock;

describe("TransactionForm", () => {
  const mockAccount = {
    id: "1",
    accountNumber: "1001",
    accountType: "CHECKING" as const,
    balance: 1000,
    accountHolder: "John Doe",
    createdAt: "2024-01-01",
  };

  const mockAccounts = [
    mockAccount,
    {
      id: "2",
      accountNumber: "1002",
      accountType: "SAVINGS" as const,
      balance: 2000,
      accountHolder: "Jane Smith",
      createdAt: "2024-01-01",
    },
  ];

  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (onSuccess?: () => void) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TransactionForm
          account={mockAccount}
          accounts={mockAccounts}
          onSuccess={onSuccess}
        />
      </QueryClientProvider>
    );
  };

  it("renders form with all fields", () => {
    renderComponent();

    expect(screen.getByLabelText(/transaction type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^submit$/i })
    ).toBeInTheDocument();
  });

  it("validates amount is positive", async () => {
    renderComponent();

    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByRole("button", {
      name: /^submit$/i,
    });

    fireEvent.change(amountInput, { target: { value: "-100" } });
    fireEvent.submit(submitButton.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(
        screen.getByText(/amount must be greater than 0/i)
      ).toBeInTheDocument();
    });
  });

  it("validates amount does not exceed limit", async () => {
    renderComponent();

    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByRole("button", {
      name: /^submit$/i,
    });

    fireEvent.change(amountInput, { target: { value: "1000001" } });
    fireEvent.submit(submitButton.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(
        screen.getByText(/amount exceeds maximum limit/i)
      ).toBeInTheDocument();
    });
  });

  it("validates description is required", async () => {
    renderComponent();

    const submitButton = screen.getByRole("button", {
      name: /^submit$/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });
  });

  it("shows transfer target field when transfer is selected", () => {
    renderComponent();

    const typeSelect = screen.getByLabelText(/transaction type/i);
    fireEvent.change(typeSelect, { target: { value: "TRANSFER" } });

    expect(screen.getByLabelText(/transfer to/i)).toBeInTheDocument();
  });

  it("validates insufficient funds for withdrawal", async () => {
    renderComponent();

    const typeSelect = screen.getByLabelText(/transaction type/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole("button", {
      name: /^submit$/i,
    });

    fireEvent.change(typeSelect, { target: { value: "WITHDRAWAL" } });
    fireEvent.change(amountInput, { target: { value: "2000" } });
    fireEvent.change(descriptionInput, {
      target: { value: "Test withdrawal" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/insufficient funds/i)).toBeInTheDocument();
    });
  });

  it("submits deposit transaction successfully", async () => {
    const onSuccess = vi.fn();
    mockCreateTransaction.mockResolvedValueOnce({
      id: 1,
      accountId: "1",
      type: "DEPOSIT",
      amount: 100,
      description: "Test deposit",
      createdAt: "2024-01-01",
      balance: 1100,
    });

    renderComponent(onSuccess);

    const amountInput = screen.getByLabelText(/amount/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole("button", {
      name: /^submit$/i,
    });

    fireEvent.change(amountInput, { target: { value: "100" } });
    fireEvent.change(descriptionInput, { target: { value: "Test deposit" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledWith("1", {
        type: "DEPOSIT",
        amount: 100,
        description: "Test deposit",
        toAccountId: undefined,
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("submits transfer transaction successfully", async () => {
    mockCreateTransaction.mockResolvedValueOnce({
      id: 2,
      accountId: "1",
      type: "TRANSFER",
      amount: 200,
      description: "Test transfer",
      toAccountId: "2",
      createdAt: "2024-01-01",
      balance: 800,
    });

    renderComponent();

    const typeSelect = screen.getByLabelText(/transaction type/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole("button", {
      name: /^submit$/i,
    });

    fireEvent.change(typeSelect, { target: { value: "TRANSFER" } });

    const targetSelect = screen.getByLabelText(/transfer to/i);
    fireEvent.change(targetSelect, { target: { value: "2" } });

    fireEvent.change(amountInput, { target: { value: "200" } });
    fireEvent.change(descriptionInput, { target: { value: "Test transfer" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledWith("1", {
        type: "TRANSFER",
        amount: 200,
        description: "Test transfer",
        toAccountId: "2",
      });
    });
  });

  it("displays error message on API failure", async () => {
    mockCreateTransaction.mockRejectedValueOnce(new Error("Network error"));

    renderComponent();

    const amountInput = screen.getByLabelText(/amount/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole("button", {
      name: /^submit$/i,
    });

    fireEvent.change(amountInput, { target: { value: "100" } });
    fireEvent.change(descriptionInput, { target: { value: "Test deposit" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});
