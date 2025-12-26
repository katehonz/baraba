defmodule BarabaUmbrella.Repo.Migrations.CreateFixedAssets do
  use Ecto.Migration

  def change do
    create table(:fixed_asset_categories, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :min_depreciation_rate, :decimal, precision: 5, scale: 2
      add :max_depreciation_rate, :decimal, precision: 5, scale: 2
      add :company_id, references(:companies, type: :binary_id, on_delete: :delete_all), null: false

      timestamps()
    end

    create index(:fixed_asset_categories, [:company_id])

    create table(:fixed_assets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :inventory_number, :string, null: false
      add :description, :text
      add :acquisition_date, :date, null: false
      add :acquisition_cost, :decimal, precision: 15, scale: 2, null: false
      add :residual_value, :decimal, precision: 15, scale: 2, default: 0.0
      add :document_number, :string
      add :document_date, :date
      add :put_into_service_date, :date
      add :status, :string, default: "ACTIVE"
      add :depreciation_method, :string, default: "LINEAR"
      add :accounting_depreciation_rate, :decimal, precision: 5, scale: 2
      add :tax_depreciation_rate, :decimal, precision: 5, scale: 2
      add :accounting_accumulated_depreciation, :decimal, precision: 15, scale: 2, default: 0.0
      add :accounting_book_value, :decimal, precision: 15, scale: 2
      add :tax_accumulated_depreciation, :decimal, precision: 15, scale: 2, default: 0.0
      add :tax_book_value, :decimal, precision: 15, scale: 2
      add :last_depreciation_date, :date
      add :disposed_date, :date
      add :disposal_amount, :decimal, precision: 15, scale: 2
      add :company_id, references(:companies, type: :binary_id, on_delete: :delete_all), null: false
      add :category_id, references(:fixed_asset_categories, type: :binary_id, on_delete: :restrict), null: false

      timestamps()
    end

    create index(:fixed_assets, [:company_id])
    create index(:fixed_assets, [:category_id])
    create unique_index(:fixed_assets, [:company_id, :inventory_number])
  end
end
