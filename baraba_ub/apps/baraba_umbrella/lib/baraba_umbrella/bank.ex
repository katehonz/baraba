defmodule BarabaUmbrella.Bank do
  @moduledoc """
  The Bank context.
  """

  import Ecto.Query, warn: false
  alias BarabaUmbrella.Repo

  alias BarabaUmbrella.Bank.BankAccount
  alias BarabaUmbrella.Bank.BankTransaction

  ## Bank Accounts

  def list_bank_accounts(company_id) do
    BankAccount
    |> where(company_id: ^company_id)
    |> Repo.all()
    |> Repo.preload(:account)
  end

  def get_bank_account!(id), do: Repo.get!(BankAccount, id) |> Repo.preload(:account)

  def create_bank_account(attrs \\ %{}) do
    %BankAccount{}
    |> BankAccount.changeset(attrs)
    |> Repo.insert()
  end

  def update_bank_account(%BankAccount{} = bank_account, attrs) do
    bank_account
    |> BankAccount.changeset(attrs)
    |> Repo.update()
  end

  def delete_bank_account(%BankAccount{} = bank_account) do
    Repo.delete(bank_account)
  end

  def change_bank_account(%BankAccount{} = bank_account, attrs \\ %{}) do
    BankAccount.changeset(bank_account, attrs)
  end

  ## Bank Transactions

  def list_transactions(bank_account_id) do
    BankTransaction
    |> where(bank_account_id: ^bank_account_id)
    |> order_by(desc: :transaction_date)
    |> Repo.all()
  end

  def list_pending_transactions(bank_account_id) do
    BankTransaction
    |> where(bank_account_id: ^bank_account_id)
    |> where(status: "pending")
    |> order_by(desc: :transaction_date)
    |> Repo.all()
  end

  def get_transaction!(id), do: Repo.get!(BankTransaction, id)

  def create_transaction(attrs \\ %{}) do
    %BankTransaction{}
    |> BankTransaction.changeset(attrs)
    |> Repo.insert()
  end

  def update_transaction(%BankTransaction{} = transaction, attrs) do
    transaction
    |> BankTransaction.changeset(attrs)
    |> Repo.update()
  end

  def change_transaction(%BankTransaction{} = transaction, attrs \\ %{}) do
    BankTransaction.changeset(transaction, attrs)
  end
end
