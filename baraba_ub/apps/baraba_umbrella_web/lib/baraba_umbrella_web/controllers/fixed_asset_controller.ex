defmodule BarabaUmbrellaWeb.FixedAssetController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Accounting

  def index(conn, %{"company_id" => company_id}) do
    fixed_assets = Accounting.list_fixed_assets(company_id)
    render(conn, :index, fixed_assets: fixed_assets)
  end

  def create(conn, %{"company_id" => company_id, "fixed_asset" => fixed_asset_params}) do
    fixed_asset_params = Map.put(fixed_asset_params, "company_id", company_id)

    case Accounting.create_fixed_asset(fixed_asset_params) do
      {:ok, fixed_asset} ->
        conn
        |> put_status(:created)
        |> render(:show, fixed_asset: fixed_asset)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def show(conn, %{"id" => id}) do
    fixed_asset = Accounting.get_fixed_asset!(id)
    render(conn, :show, fixed_asset: fixed_asset)
  end

  def update(conn, %{"id" => id, "fixed_asset" => fixed_asset_params}) do
    fixed_asset = Accounting.get_fixed_asset!(id)

    case Accounting.update_fixed_asset(fixed_asset, fixed_asset_params) do
      {:ok, fixed_asset} ->
        render(conn, :show, fixed_asset: fixed_asset)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    fixed_asset = Accounting.get_fixed_asset!(id)

    with {:ok, _fixed_asset} <- Accounting.delete_fixed_asset(fixed_asset) do
      send_resp(conn, :no_content, "")
    end
  end

  # Depreciation

  def calculated_periods(conn, %{"company_id" => company_id}) do
    periods = Accounting.list_calculated_periods(company_id)
    render(conn, "periods.json", periods: periods)
  end

  def calculate_depreciation(conn, %{"company_id" => company_id, "year" => year, "month" => month}) do
    case Accounting.calculate_depreciation(company_id, String.to_integer(year), String.to_integer(month)) do
      {:ok, result} ->
        render(conn, "calculation_result.json", result: result)
      {:error, message} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: message})
    end
  end

  def post_depreciation(conn, %{"company_id" => company_id, "year" => year, "month" => month}) do
    # For now we use a dummy user_id if not authenticated, or get it from conn if available
    # In a real app, this should come from the auth token
    user_id = conn.assigns[:current_user_id] || "00000000-0000-0000-0000-000000000000"
    
    case Accounting.post_depreciation(company_id, String.to_integer(year), String.to_integer(month), user_id) do
      {:ok, result} ->
        render(conn, "post_result.json", result: result)
      {:error, message} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: message})
    end
  end

  def depreciation_journal(conn, %{"company_id" => company_id} = params) do
    year = if params["year"], do: String.to_integer(params["year"]), else: nil
    month = if params["month"], do: String.to_integer(params["month"]), else: nil
    
    journal = Accounting.list_depreciation_journal(company_id, year, month)
    render(conn, "journal.json", journal: journal)
  end
end
