defmodule BarabaUmbrella.Bank.BankAccount do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "bank_accounts" do
    field :name, :string
    field :iban, :string
    field :currency, :string
    field :import_type, :string, default: "manual"
    field :saltedge_connection_id, :string

    belongs_to :company, BarabaUmbrella.Accounting.Company
    belongs_to :account, BarabaUmbrella.Accounting.Account # The GL Account (e.g. 503)

    has_many :transactions, BarabaUmbrella.Bank.BankTransaction

    timestamps()
  end

  @doc false
  def changeset(bank_account, attrs) do
    bank_account
    |> cast(attrs, [:name, :iban, :currency, :import_type, :saltedge_connection_id, :company_id, :account_id])
    |> validate_required([:name, :company_id, :import_type])
    |> validate_inclusion(:import_type, ["manual", "saltedge"])
  end
end
