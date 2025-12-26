defmodule BarabaUmbrellaWeb.CompanyController do
  use BarabaUmbrellaWeb, :controller
  
  alias BarabaUmbrella.Accounting
  
  def index(conn, _params) do
    companies = Accounting.list_companies()
    render(conn, :index, companies: companies)
  end
  
  def create(conn, %{"company" => company_params}) do
    case Accounting.create_company(company_params) do
      {:ok, company} ->
        conn
        |> put_status(:created)
        |> put_resp_header("location", ~p"/api/companies/#{company}")
        |> render(:show, company: company)
      
      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end
  
  def show(conn, %{"id" => id}) do
    company = Accounting.get_company!(id)
    render(conn, :show, company: company)
  end
  
  def update(conn, %{"id" => id, "company" => company_params}) do
    company = Accounting.get_company!(id)
    
    case Accounting.update_company(company, company_params) do
      {:ok, company} ->
        render(conn, :show, company: company)
      
      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end
  
  def delete(conn, %{"id" => id}) do
    company = Accounting.get_company!(id)

    with {:ok, _company} <- Accounting.delete_company(company) do
      send_resp(conn, :no_content, "")
    end
  end

  @doc """
  Returns Azure Document Intelligence credentials for the company.
  Used by the scanner service for invoice processing.
  """
  def azure_credentials(conn, %{"company_id" => id}) do
    company = Accounting.get_company!(id)

    if company.ai_scanning_enabled and company.azure_di_endpoint and company.azure_di_api_key do
      json(conn, %{
        endpoint: company.azure_di_endpoint,
        api_key: company.azure_di_api_key
      })
    else
      conn
      |> put_status(:bad_request)
      |> json(%{error: "Azure Document Intelligence not configured for this company"})
    end
  end
end