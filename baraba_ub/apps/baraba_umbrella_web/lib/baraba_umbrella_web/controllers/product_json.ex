defmodule BarabaUmbrellaWeb.ProductJSON do
  alias BarabaUmbrella.Accounting.Product

  @doc """
  Renders a list of products.
  """
  def index(%{products: products}) do
    %{data: for(product <- products, do: data(product))}
  end

  @doc """
  Renders a single product.
  """
  def show(%{product: product}) do
    %{data: data(product)}
  end

  defp data(%Product{} = product) do
    %{
      id: product.id,
      product_code: product.product_code,
      type: product.type,
      product_group: product.product_group,
      description: product.description,
      commodity_code: product.commodity_code,
      ean_code: product.ean_code,
      valuation_method: product.valuation_method,
      uom_base: product.uom_base,
      uom_standard: product.uom_standard,
      uom_conversion_factor: product.uom_conversion_factor,
      tax_type: product.tax_type,
      tax_code: product.tax_code,
      company_id: product.company_id,
      inserted_at: product.inserted_at,
      updated_at: product.updated_at
    }
  end
end