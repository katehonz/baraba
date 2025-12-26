defmodule BarabaUmbrellaWeb.AccountController do
  use BarabaUmbrellaWeb, :controller
  
  alias BarabaUmbrella.Accounting
  
  def index(conn, %{"company_id" => company_id}) do
    accounts = Accounting.list_accounts(company_id)
    render(conn, :index, accounts: accounts)
  end
  
  def create(conn, %{"company_id" => company_id, "account" => account_params}) do
    account_params = Map.put(account_params, "company_id", company_id)
    
    case Accounting.create_account(account_params) do
      {:ok, account} ->
        conn
        |> put_status(:created)
        |> put_resp_header("location", ~p"/api/companies/#{company_id}/accounts/#{account}")
        |> render(:show, account: account)
      
      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end
  
  def show(conn, %{"company_id" => company_id, "id" => id}) do
    account = Accounting.get_account!(id)
    
    if account.company_id == company_id do
      render(conn, :show, account: account)
    else
      send_resp(conn, :not_found, "")
    end
  end
  
  def update(conn, %{"company_id" => company_id, "id" => id, "account" => account_params}) do
    account = Accounting.get_account!(id)
    
    if account.company_id == company_id do
      case Accounting.update_account(account, account_params) do
        {:ok, account} ->
          render(conn, :show, account: account)
        
        {:error, %Ecto.Changeset{} = changeset} ->
          conn
          |> put_status(:unprocessable_entity)
          |> render(:error, changeset: changeset)
      end
    else
      send_resp(conn, :not_found, "")
    end
  end
  
  def delete(conn, %{"company_id" => company_id, "id" => id}) do
    account = Accounting.get_account!(id)
    
    if account.company_id == company_id do
      with {:ok, _account} <- Accounting.delete_account(account) do
        send_resp(conn, :no_content, "")
      end
    else
      send_resp(conn, :not_found, "")
    end
  end
end