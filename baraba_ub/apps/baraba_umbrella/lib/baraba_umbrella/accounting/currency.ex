defmodule BarabaUmbrella.Accounting.Currency do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "currencies" do
    field :code, :string
    field :name, :string
    field :name_bg, :string
    field :symbol, :string
    field :decimal_places, :integer, default: 2
    field :is_active, :boolean, default: true
    field :is_base_currency, :boolean, default: false
    field :bnb_code, :string

    timestamps()
  end

  @doc false
  def changeset(currency, attrs) do
    currency
    |> cast(attrs, [:code, :name, :name_bg, :symbol, :decimal_places, :is_active, :is_base_currency, :bnb_code])
    |> validate_required([:code, :name])
    |> unique_constraint(:code)
  end
end
