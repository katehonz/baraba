defmodule BarabaUmbrellaWeb.ProductController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Accounting
  alias BarabaUmbrella.Accounting.Product

  action_fallback BarabaUmbrellaWeb.FallbackController

  def index(conn, %{"company_id" => company_id}) do
    products = Accounting.list_products(company_id)
    render(conn, :index, products: products)
  end

  def create(conn, %{"company_id" => company_id, "product" => product_params}) do
    product_params = Map.put(product_params, "company_id", company_id)

    with {:ok, %Product{} = product} <- Accounting.create_product(product_params) do
      conn
      |> put_status(:created)
      |> put_resp_header("location", ~p"/api/companies/#{company_id}/products/#{product}")
      |> render(:show, product: product)
    end
  end

  def show(conn, %{"company_id" => _company_id, "id" => id}) do
    product = Accounting.get_product!(id)
    render(conn, :show, product: product)
  end

  def update(conn, %{"company_id" => company_id, "id" => id, "product" => product_params}) do
    product = Accounting.get_product!(company_id, id)

    with {:ok, %Product{} = product} <- Accounting.update_product(product, product_params) do
      render(conn, :show, product: product)
    end
  end

  def delete(conn, %{"company_id" => _company_id, "id" => id}) do
    product = Accounting.get_product!(id)

    with {:ok, %Product{}} <- Accounting.delete_product(product) do
      send_resp(conn, :no_content, "")
    end
  end
end