defmodule BarabaUmbrella.Accounting.OpeningBalance do
  use Ecto.Schema
  import Ecto.Changeset
  alias BarabaUmbrella.Accounting.{Account, AccountingPeriod, Company}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "opening_balances" do
    field :credit, :decimal
    field :debit, :decimal
    field :date, :date

    belongs_to :account, Account
    belongs_to :company, Company
    belongs_to :accounting_period, AccountingPeriod

    timestamps()
  end

  @doc false
  def changeset(opening_balance, attrs) do
    opening_balance
    |> cast(attrs, [:debit, :credit, :date, :account_id, :company_id, :accounting_period_id])
    |> validate_required([:debit, :credit, :date, :account_id, :company_id])
  end
end
