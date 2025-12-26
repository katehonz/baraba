defmodule BarabaUmbrellaWeb.VatReturnController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Accounting

  def index(conn, %{"company_id" => company_id}) do
    vat_returns = Accounting.list_vat_returns(company_id)
    render(conn, :index, vat_returns: vat_returns)
  end

  def create(conn, %{"company_id" => company_id, "vat_return" => vat_return_params}) do
    vat_return_params = Map.put(vat_return_params, "company_id", company_id)

    case Accounting.create_vat_return(vat_return_params) do
      {:ok, vat_return} ->
        conn
        |> put_status(:created)
        |> render(:show, vat_return: vat_return)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def show(conn, %{"id" => id}) do
    vat_return = Accounting.get_vat_return!(id)
    render(conn, :show, vat_return: vat_return)
  end

  def update(conn, %{"id" => id, "vat_return" => vat_return_params}) do
    vat_return = Accounting.get_vat_return!(id)

    case Accounting.update_vat_return(vat_return, vat_return_params) do
      {:ok, vat_return} ->
        render(conn, :show, vat_return: vat_return)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def generate(conn, %{"company_id" => company_id, "period" => period}) do
    case BarabaUmbrella.VatService.generate_vat_files(String.to_integer(company_id), period) do
      {:ok, files} ->
        json(conn, %{data: files})
      
      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Failed to generate VAT files: #{inspect(reason)}"})
    end
  end
end
