defmodule BarabaUmbrellaWeb.FixedAssetCategoryController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Accounting

  def index(conn, %{"company_id" => company_id}) do
    categories = Accounting.list_fixed_asset_categories(company_id)
    render(conn, :index, fixed_asset_categories: categories)
  end

  def create(conn, %{"company_id" => company_id, "fixed_asset_category" => category_params}) do
    category_params = Map.put(category_params, "company_id", company_id)

    case Accounting.create_fixed_asset_category(category_params) do
      {:ok, category} ->
        conn
        |> put_status(:created)
        |> render(:show, fixed_asset_category: category)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def show(conn, %{"id" => id}) do
    category = Accounting.get_fixed_asset_category!(id)
    render(conn, :show, fixed_asset_category: category)
  end

  def update(conn, %{"id" => id, "fixed_asset_category" => category_params}) do
    category = Accounting.get_fixed_asset_category!(id)

    case Accounting.update_fixed_asset_category(category, category_params) do
      {:ok, category} ->
        render(conn, :show, fixed_asset_category: category)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    category = Accounting.get_fixed_asset_category!(id)

    with {:ok, _category} <- Accounting.delete_fixed_asset_category(category) do
      send_resp(conn, :no_content, "")
    end
  end
end
