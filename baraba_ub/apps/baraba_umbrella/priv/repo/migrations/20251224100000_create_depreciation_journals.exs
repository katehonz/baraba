defmodule BarabaUmbrella.Repo.Migrations.CreateDepreciationJournals do
  use Ecto.Migration

  def change do
    create table(:depreciation_journals, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :period, :date, null: false
      add :accounting_depreciation_amount, :decimal, precision: 15, scale: 2, null: false
      add :accounting_book_value_before, :decimal, precision: 15, scale: 2, null: false
      add :accounting_book_value_after, :decimal, precision: 15, scale: 2, null: false
      add :tax_depreciation_amount, :decimal, precision: 15, scale: 2, null: false
      add :tax_book_value_before, :decimal, precision: 15, scale: 2, null: false
      add :tax_book_value_after, :decimal, precision: 15, scale: 2, null: false
      add :is_posted, :boolean, default: false, null: false
      add :posted_at, :naive_datetime
      
      add :company_id, references(:companies, type: :binary_id, on_delete: :delete_all), null: false
      add :fixed_asset_id, references(:fixed_assets, type: :binary_id, on_delete: :delete_all), null: false
      add :journal_entry_id, references(:journal_entries, type: :binary_id, on_delete: :nilify_all)

      timestamps()
    end

    create index(:depreciation_journals, [:company_id])
    create index(:depreciation_journals, [:fixed_asset_id])
    create index(:depreciation_journals, [:journal_entry_id])
    create unique_index(:depreciation_journals, [:fixed_asset_id, :period])
  end
end
