defmodule BarabaUmbrellaWeb.FixedAssetJSON do
  def index(%{fixed_assets: fixed_assets}) do
    %{data: for(fixed_asset <- fixed_assets, do: data(fixed_asset))}
  end

  def show(%{fixed_asset: fixed_asset}) do
    %{data: data(fixed_asset)}
  end

  def periods(%{periods: periods}) do
    %{data: periods}
  end

  def calculation_result(%{result: result}) do
    %{data: result}
  end

  def post_result(%{result: result}) do
    %{data: result}
  end

  def journal(%{journal: journal}) do
    %{data: journal}
  end

  def error(%{changeset: changeset}) do
    %{errors: Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)}
  end

  defp data(fixed_asset) do
    %{
      id: fixed_asset.id,
      name: fixed_asset.name,
      inventory_number: fixed_asset.inventory_number,
      description: fixed_asset.description,
      acquisition_date: fixed_asset.acquisition_date,
      acquisition_cost: fixed_asset.acquisition_cost,
      residual_value: fixed_asset.residual_value,
      document_number: fixed_asset.document_number,
      document_date: fixed_asset.document_date,
      put_into_service_date: fixed_asset.put_into_service_date,
      status: fixed_asset.status,
      depreciation_method: fixed_asset.depreciation_method,
      accounting_depreciation_rate: fixed_asset.accounting_depreciation_rate,
      tax_depreciation_rate: fixed_asset.tax_depreciation_rate,
      accounting_accumulated_depreciation: fixed_asset.accounting_accumulated_depreciation,
      accounting_book_value: fixed_asset.accounting_book_value,
      tax_accumulated_depreciation: fixed_asset.tax_accumulated_depreciation,
      tax_book_value: fixed_asset.tax_book_value,
      last_depreciation_date: fixed_asset.last_depreciation_date,
      disposed_date: fixed_asset.disposed_date,
      disposal_amount: fixed_asset.disposal_amount,
      company_id: fixed_asset.company_id,
      category_id: fixed_asset.category_id,
      category: category_data(fixed_asset.category)
    }
  end

  defp category_data(%Ecto.Association.NotLoaded{}), do: nil
  defp category_data(nil), do: nil
  defp category_data(category) do
    %{
      id: category.id,
      name: category.name,
      description: category.description
    }
  end
end
