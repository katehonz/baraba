defmodule BarabaUmbrella.Repo.Migrations.CreateStockData do
  use Ecto.Migration

  def change do
    # PhysicalStock (SAF-T 2.10)
    create table(:stock_levels, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :period_start, :date, null: false
      add :period_end, :date, null: false
      add :warehouse_id, :string, null: false
      add :location_id, :string
      add :product_code, :string, null: false
      add :product_type, :string, null: false # from Nom_Inventory_Types
      add :uom_physical_stock, :string
      add :unit_price_begin, :decimal, precision: 18, scale: 2
      add :unit_price_end, :decimal, precision: 18, scale: 2
      add :opening_stock_quantity, :decimal, precision: 18, scale: 4
      add :opening_stock_value, :decimal, precision: 18, scale: 2
      add :closing_stock_quantity, :decimal, precision: 18, scale: 4
      add :closing_stock_value, :decimal, precision: 18, scale: 2
      add :owner_id, :string # EIK
      add :company_id, references(:companies, on_delete: :delete_all, type: :binary_id), null: false

      timestamps()
    end

    create index(:stock_levels, [:company_id])
    create index(:stock_levels, [:company_id, :period_start, :period_end])

    # MovementOfGoods (SAF-T 4.4)
    create table(:stock_movements, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :movement_reference, :string, null: false
      add :movement_type, :string, null: false # from Stock_movement.csv
      add :movement_date, :date, null: false
      add :product_code, :string, null: false
      add :quantity, :decimal, precision: 18, scale: 4, null: false
      add :uom, :string, null: false
      add :unit_price, :decimal, precision: 18, scale: 4
      add :amount, :decimal, precision: 18, scale: 2
      add :warehouse_id, :string, null: false
      add :location_id, :string
      add :description, :string
      add :company_id, references(:companies, on_delete: :delete_all, type: :binary_id), null: false

      timestamps()
    end

    create index(:stock_movements, [:company_id])
    create index(:stock_movements, [:company_id, :movement_date])
  end
end
