defmodule BarabaUmbrella.Accounting.StockLevel do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "stock_levels" do
    field :period_start, :date
    field :period_end, :date
    field :warehouse_id, :string
    field :location_id, :string
    field :product_code, :string
    field :product_type, :string
    field :uom_physical_stock, :string
    field :unit_price_begin, :decimal
    field :unit_price_end, :decimal
    field :opening_stock_quantity, :decimal
    field :opening_stock_value, :decimal
    field :closing_stock_quantity, :decimal
    field :closing_stock_value, :decimal
    field :owner_id, :string

    belongs_to :company, BarabaUmbrella.Accounting.Company

    timestamps()
  end

  @doc false
  def changeset(stock_level, attrs) do
    stock_level
    |> cast(attrs, [
      :period_start, :period_end, :warehouse_id, :location_id, :product_code,
      :product_type, :uom_physical_stock, :unit_price_begin, :unit_price_end,
      :opening_stock_quantity, :opening_stock_value, :closing_stock_quantity,
      :closing_stock_value, :owner_id, :company_id
    ])
    |> validate_required([:period_start, :period_end, :warehouse_id, :product_code, :product_type, :company_id])
  end
end
