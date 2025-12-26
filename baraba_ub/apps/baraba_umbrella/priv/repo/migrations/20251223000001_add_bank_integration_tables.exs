defmodule BarabaUmbrella.Repo.Migrations.AddBankIntegrationTables do
  use Ecto.Migration

  def change do
    create table(:bank_accounts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :company_id, references(:companies, type: :binary_id, on_delete: :delete_all), null: false
      add :account_id, references(:accounts, type: :binary_id, on_delete: :nilify_all) # Link to GL Account
      add :name, :string, null: false
      add :iban, :string
      add :currency, :string, size: 3
      add :import_type, :string, default: "manual" # "manual" or "saltedge"
      add :saltedge_connection_id, :string

      timestamps()
    end

    create index(:bank_accounts, [:company_id])

    create table(:bank_transactions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :bank_account_id, references(:bank_accounts, type: :binary_id, on_delete: :delete_all), null: false
      add :transaction_date, :date, null: false
      add :booking_date, :date
      add :amount, :decimal, null: false
      add :currency, :string, size: 3
      add :description, :text
      add :counterparty_name, :string
      add :counterparty_iban, :string
      add :external_id, :string
      add :status, :string, default: "pending" # pending, posted, ignored
      add :journal_entry_id, references(:journal_entries, type: :binary_id, on_delete: :nilify_all)
      add :raw_data, :map

      timestamps()
    end

    create index(:bank_transactions, [:bank_account_id])
    create index(:bank_transactions, [:status])
    # Unique constraint to prevent duplicate imports
    create unique_index(:bank_transactions, [:bank_account_id, :external_id], name: :bank_transactions_account_external_id_index)
  end
end
