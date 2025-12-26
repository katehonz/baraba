defmodule BarabaUmbrellaWeb.FixedAssetCategoryJSON do
  def index(%{fixed_asset_categories: categories}) do
    %{data: for(category <- categories, do: data(category))}
  end

  def show(%{fixed_asset_category: category}) do
    %{data: data(category)}
  end

  def error(%{changeset: changeset}) do
    %{errors: Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)}
  end

  defp data(category) do
    %{
      id: category.id,
      name: category.name,
      description: category.description,
      min_depreciation_rate: category.min_depreciation_rate,
      max_depreciation_rate: category.max_depreciation_rate,
      depreciation_account_id: category.depreciation_account_id,
      accumulated_depreciation_account_id: category.accumulated_depreciation_account_id,
      company_id: category.company_id
    }
  end
end
