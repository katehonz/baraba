defmodule BarabaUmbrella.Accounting.ExchangeRate do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "exchange_rates" do
    field :rate, :decimal
    field :reverse_rate, :decimal
    field :valid_date, :date
    field :rate_source, :string, default: "MANUAL"
    field :bnb_rate_id, :string
    field :is_active, :boolean, default: true
    field :notes, :string
    
    belongs_to :from_currency, BarabaUmbrella.Accounting.Currency
    belongs_to :to_currency, BarabaUmbrella.Accounting.Currency
    belongs_to :created_by, BarabaUmbrella.Accounting.User

    timestamps()
  end

  @doc false
  def changeset(exchange_rate, attrs) do
    exchange_rate
    |> cast(attrs, [:rate, :reverse_rate, :valid_date, :rate_source, :bnb_rate_id, :is_active, :notes, :from_currency_id, :to_currency_id, :created_by_id])
    |> validate_required([:rate, :valid_date, :from_currency_id, :to_currency_id])
  end
end
