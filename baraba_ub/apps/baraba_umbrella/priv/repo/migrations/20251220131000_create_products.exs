defmodule BarabaUmbrella.Repo.Migrations.CreateProducts do
  use Ecto.Migration

  def change do
    create table(:products, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :product_code, :string, null: false
      add :type, :string, null: false # "PRODUCT" or "SERVICE"
      add :product_group, :string
      add :description, :text, null: false
      add :commodity_code, :string # NC8_TARIC
      add :ean_code, :string
      add :valuation_method, :string
      add :uom_base, :string, null: false
      add :uom_standard, :string, null: false
      add :uom_conversion_factor, :decimal, null: false, default: 1.0
      add :tax_type, :string, null: false
      add :tax_code, :string, null: false
      add :company_id, references(:companies, on_delete: :delete_all, type: :binary_id), null: false

      timestamps()
    end

    create index(:products, [:company_id])
    create unique_index(:products, [:company_id, :product_code])
  end
end
