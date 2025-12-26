defmodule BarabaUmbrella.Accounting.FixedAsset do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "fixed_assets" do
    field :name, :string
    field :inventory_number, :string
    field :description, :string
    field :acquisition_date, :date
    field :acquisition_cost, :decimal
    field :residual_value, :decimal, default: 0.0
    field :document_number, :string
    field :document_date, :date
    field :put_into_service_date, :date
    field :status, :string, default: "ACTIVE" # ACTIVE, DEPRECIATED, DISPOSED, SOLD
    field :depreciation_method, :string, default: "LINEAR" # LINEAR, DECLINING_BALANCE
    field :accounting_depreciation_rate, :decimal
    field :tax_depreciation_rate, :decimal
    field :accounting_accumulated_depreciation, :decimal, default: 0.0
    field :accounting_book_value, :decimal
    field :tax_accumulated_depreciation, :decimal, default: 0.0
    field :tax_book_value, :decimal
    field :last_depreciation_date, :date
    field :disposed_date, :date
    field :disposal_amount, :decimal

    belongs_to :company, BarabaUmbrella.Accounting.Company
    belongs_to :category, BarabaUmbrella.Accounting.FixedAssetCategory

    timestamps()
  end

  @doc false
  def changeset(fixed_asset, attrs) do
    fixed_asset
    |> cast(attrs, [
      :name, :inventory_number, :description, :acquisition_date, :acquisition_cost,
      :residual_value, :document_number, :document_date, :put_into_service_date,
      :status, :depreciation_method, :accounting_depreciation_rate, :tax_depreciation_rate,
      :accounting_accumulated_depreciation, :accounting_book_value,
      :tax_accumulated_depreciation, :tax_book_value, :last_depreciation_date,
      :disposed_date, :disposal_amount, :company_id, :category_id
    ])
    |> validate_required([:name, :inventory_number, :acquisition_date, :acquisition_cost, :company_id, :category_id])
    |> unique_constraint([:company_id, :inventory_number])
  end
end
