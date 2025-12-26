defmodule BarabaUmbrella.Repo.Migrations.AddAccountsToFixedAssetCategories do
  use Ecto.Migration

  def change do
    alter table(:fixed_asset_categories) do
      add :depreciation_account_id, references(:accounts, type: :binary_id, on_delete: :nilify_all)
      add :accumulated_depreciation_account_id, references(:accounts, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:fixed_asset_categories, [:depreciation_account_id])
    create index(:fixed_asset_categories, [:accumulated_depreciation_account_id])
  end
end
