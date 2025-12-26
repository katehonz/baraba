defmodule BarabaUmbrella.Accounting.StockMovement do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "stock_movements" do
    field :movement_reference, :string
    field :movement_type, :string
    field :movement_date, :date
    field :product_code, :string
    field :quantity, :decimal
    field :uom, :string
    field :unit_price, :decimal
    field :amount, :decimal
    field :warehouse_id, :string
    field :location_id, :string
    field :description, :string

    belongs_to :company, BarabaUmbrella.Accounting.Company

    timestamps()
  end

  @doc false
  def changeset(stock_movement, attrs) do
    stock_movement
    |> cast(attrs, [
      :movement_reference, :movement_type, :movement_date, :product_code,
      :quantity, :uom, :unit_price, :amount, :warehouse_id, :location_id,
      :description, :company_id
    ])
    |> validate_required([:movement_reference, :movement_type, :movement_date, :product_code, :quantity, :uom, :warehouse_id, :company_id])
  end
end
