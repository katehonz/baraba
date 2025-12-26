defmodule BarabaUmbrella.Accounting.Product do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "products" do
    field :product_code, :string
    field :type, :string # "PRODUCT" or "SERVICE"
    field :product_group, :string
    field :description, :string
    field :commodity_code, :string # NC8_TARIC
    field :ean_code, :string
    field :valuation_method, :string
    field :uom_base, :string
    field :uom_standard, :string
    field :uom_conversion_factor, :decimal, default: 1.0
    field :tax_type, :string
    field :tax_code, :string

    belongs_to :company, BarabaUmbrella.Accounting.Company
    has_many :entry_lines, BarabaUmbrella.Accounting.EntryLine

    timestamps()
  end

  @doc false
  def changeset(product, attrs) do
    product
    |> cast(attrs, [
      :product_code, :type, :product_group, :description, :commodity_code,
      :ean_code, :valuation_method, :uom_base, :uom_standard,
      :uom_conversion_factor, :tax_type, :tax_code, :company_id
    ])
    |> validate_required([:product_code, :type, :description, :uom_base, :uom_standard, :tax_type, :tax_code, :company_id])
    |> validate_inclusion(:type, ["PRODUCT", "SERVICE"])
    |> unique_constraint([:company_id, :product_code])
  end
end
