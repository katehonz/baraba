defmodule BarabaUmbrella.Accounting.CurrencyRevaluationLine do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "currency_revaluation_lines" do
    field :foreign_debit_balance, :decimal, default: Decimal.new(0)
    field :foreign_credit_balance, :decimal, default: Decimal.new(0)
    field :foreign_net_balance, :decimal, default: Decimal.new(0)
    field :recorded_base_balance, :decimal, default: Decimal.new(0)
    field :exchange_rate, :decimal
    field :revalued_base_balance, :decimal, default: Decimal.new(0)
    field :revaluation_difference, :decimal, default: Decimal.new(0)
    field :is_gain, :boolean, default: false

    belongs_to :revaluation, BarabaUmbrella.Accounting.CurrencyRevaluation
    belongs_to :account, BarabaUmbrella.Accounting.Account
    belongs_to :currency, BarabaUmbrella.Accounting.Currency

    timestamps()
  end

  @doc false
  def changeset(line, attrs) do
    line
    |> cast(attrs, [
      :foreign_debit_balance, :foreign_credit_balance, :foreign_net_balance,
      :recorded_base_balance, :exchange_rate, :revalued_base_balance,
      :revaluation_difference, :is_gain, :revaluation_id, :account_id, :currency_id
    ])
    |> validate_required([:revaluation_id, :account_id, :currency_id])
    |> assoc_constraint(:revaluation)
    |> assoc_constraint(:account)
    |> assoc_constraint(:currency)
  end

  def by_revaluation(query \\ __MODULE__, revaluation_id) do
    from q in query, where: q.revaluation_id == ^revaluation_id
  end

  def with_account(query \\ __MODULE__) do
    from q in query,
      join: a in assoc(q, :account),
      preload: [account: a]
  end

  def with_currency(query \\ __MODULE__) do
    from q in query,
      join: c in assoc(q, :currency),
      preload: [currency: c]
  end

  def gains(query \\ __MODULE__) do
    from q in query, where: q.is_gain == true
  end

  def losses(query \\ __MODULE__) do
    from q in query, where: q.is_gain == false
  end
end
