defmodule BarabaUmbrellaWeb.BankTransactionController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Bank
  alias BarabaUmbrella.Bank.BankTransaction

  action_fallback BarabaUmbrellaWeb.FallbackController

  def index(conn, %{"bank_account_id" => bank_account_id}) do
    transactions = Bank.list_transactions(bank_account_id)
    render(conn, :index, transactions: transactions)
  end

  def import(conn, %{"bank_account_id" => bank_account_id, "transactions" => transactions_params}) do
     results = Enum.map(transactions_params, fn t ->
        t = Map.put(t, "bank_account_id", bank_account_id)
        # If external_id is missing, generate one from fields to prevent duplicates on re-upload
        t = if is_nil(t["external_id"]) or t["external_id"] == "" do
           uniq_str = "#{t["transaction_date"]}_#{t["amount"]}_#{t["description"]}_#{t["counterparty_iban"]}"
           Map.put(t, "external_id", :crypto.hash(:md5, uniq_str) |> Base.encode16())
        else
           t
        end
        
        Bank.create_transaction(t)
     end)

     success_count = Enum.count(results, fn 
        {:ok, _} -> true
        _ -> false 
     end)
     
     json(conn, %{imported: success_count, total: length(transactions_params)})
  end

  def update(conn, %{"id" => id, "bank_transaction" => transaction_params}) do
    transaction = Bank.get_transaction!(id)

    with {:ok, %BankTransaction{} = transaction} <- Bank.update_transaction(transaction, transaction_params) do
      render(conn, :show, bank_transaction: transaction)
    end
  end
end