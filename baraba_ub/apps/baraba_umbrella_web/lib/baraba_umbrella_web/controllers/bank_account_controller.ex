defmodule BarabaUmbrellaWeb.BankAccountController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Bank
  alias BarabaUmbrella.Bank.BankAccount

  action_fallback BarabaUmbrellaWeb.FallbackController

  def index(conn, %{"company_id" => company_id}) do
    bank_accounts = Bank.list_bank_accounts(company_id)
    render(conn, :index, bank_accounts: bank_accounts)
  end

  def create(conn, %{"company_id" => company_id, "bank_account" => bank_account_params}) do
    bank_account_params = Map.put(bank_account_params, "company_id", company_id)

    with {:ok, %BankAccount{} = bank_account} <- Bank.create_bank_account(bank_account_params) do
      conn
      |> put_status(:created)
      |> render(:show, bank_account: bank_account)
    end
  end

  def show(conn, %{"id" => id}) do
    bank_account = Bank.get_bank_account!(id)
    render(conn, :show, bank_account: bank_account)
  end

  def update(conn, %{"id" => id, "bank_account" => bank_account_params}) do
    bank_account = Bank.get_bank_account!(id)

    with {:ok, %BankAccount{} = bank_account} <- Bank.update_bank_account(bank_account, bank_account_params) do
      render(conn, :show, bank_account: bank_account)
    end
  end

  def delete(conn, %{"id" => id}) do
    bank_account = Bank.get_bank_account!(id)

    with {:ok, %BankAccount{}} <- Bank.delete_bank_account(bank_account) do
      send_resp(conn, :no_content, "")
    end
  end
end
