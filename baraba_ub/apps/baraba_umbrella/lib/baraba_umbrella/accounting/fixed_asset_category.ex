defmodule BarabaUmbrella.Accounting.FixedAssetCategory do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "fixed_asset_categories" do
    field :name, :string
    field :description, :string
    field :min_depreciation_rate, :decimal
    field :max_depreciation_rate, :decimal
    
    belongs_to :company, BarabaUmbrella.Accounting.Company
    belongs_to :depreciation_account, BarabaUmbrella.Accounting.Account
    belongs_to :accumulated_depreciation_account, BarabaUmbrella.Accounting.Account
    has_many :fixed_assets, BarabaUmbrella.Accounting.FixedAsset, foreign_key: :category_id

    timestamps()
  end

  @doc false
  def changeset(category, attrs) do
    category
    |> cast(attrs, [:name, :description, :min_depreciation_rate, :max_depreciation_rate, :company_id, :depreciation_account_id, :accumulated_depreciation_account_id])
    |> validate_required([:name, :company_id])
  end
end
