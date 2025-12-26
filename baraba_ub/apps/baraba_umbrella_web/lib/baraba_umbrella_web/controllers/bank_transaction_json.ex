defmodule BarabaUmbrellaWeb.BankTransactionJSON do
  alias BarabaUmbrella.Bank.BankTransaction

  @doc """
  Renders a list of bank_transactions.
  """
  def index(%{transactions: transactions}) do
    %{data: for(transaction <- transactions, do: data(transaction))}
  end

  @doc """
  Renders a single bank_transaction.
  """
  def show(%{bank_transaction: transaction}) do
    %{data: data(transaction)}
  end

  defp data(%BankTransaction{} = transaction) do
    %{
      id: transaction.id,
      transaction_date: transaction.transaction_date,
      booking_date: transaction.booking_date,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      counterparty_name: transaction.counterparty_name,
      counterparty_iban: transaction.counterparty_iban,
      external_id: transaction.external_id,
      status: transaction.status,
      journal_entry_id: transaction.journal_entry_id,
      bank_account_id: transaction.bank_account_id
    }
  end
end
