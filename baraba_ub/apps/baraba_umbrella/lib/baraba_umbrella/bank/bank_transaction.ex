defmodule BarabaUmbrella.Bank.BankTransaction do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "bank_transactions" do
    field :transaction_date, :date
    field :booking_date, :date
    field :amount, :decimal
    field :currency, :string
    field :description, :string
    field :counterparty_name, :string
    field :counterparty_iban, :string
    field :external_id, :string
    field :status, :string, default: "pending"
    field :raw_data, :map

    belongs_to :bank_account, BarabaUmbrella.Bank.BankAccount
    belongs_to :journal_entry, BarabaUmbrella.Accounting.JournalEntry

    timestamps()
  end

  @doc false
  def changeset(bank_transaction, attrs) do
    bank_transaction
    |> cast(attrs, [:transaction_date, :booking_date, :amount, :currency, :description, :counterparty_name, :counterparty_iban, :external_id, :status, :raw_data, :bank_account_id, :journal_entry_id])
    |> validate_required([:transaction_date, :amount, :currency, :bank_account_id, :status])
    |> validate_inclusion(:status, ["pending", "posted", "ignored"])
    |> unique_constraint([:bank_account_id, :external_id], name: :bank_transactions_account_external_id_index)
  end
end
