defmodule BarabaUmbrella.Repo.Migrations.CreateJournalEntries do
  use Ecto.Migration

  def change do
    create table(:journal_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :entry_number, :string, null: false
      add :description, :string
      add :document_number, :string
      add :document_type, :string, null: false
      add :document_date, :date, null: false
      add :accounting_date, :date, null: false
      add :vat_date, :date
      add :currency, :string, default: "BGN"
      add :exchange_rate, :decimal
      add :total_debit, :decimal
      add :total_credit, :decimal
      add :base_total_debit, :decimal
      add :base_total_credit, :decimal
      add :vat_amount, :decimal, default: 0
      add :is_posted, :boolean, default: false
      add :posted_at, :utc_datetime
      add :posted_by_id, :binary_id
      add :created_by_id, :binary_id
      add :notes, :text
      
      # VAT operation types
      add :vat_operation_type, :string
      add :vat_document_type, :string
      
      # Foreign keys
      add :company_id, references(:companies, type: :binary_id), null: false
      add :debtor_counterpart_id, references(:counterparts, type: :binary_id)
      add :creditor_counterpart_id, references(:counterparts, type: :binary_id)
      
      timestamps()
    end
    
    create unique_index(:journal_entries, [:entry_number, :company_id])
    create index(:journal_entries, [:company_id])
    create index(:journal_entries, [:document_type])
    create index(:journal_entries, [:document_date])
    create index(:journal_entries, [:accounting_date])
    create index(:journal_entries, [:is_posted])
    create index(:journal_entries, [:posted_at])
    create index(:journal_entries, [:debtor_counterpart_id])
    create index(:journal_entries, [:creditor_counterpart_id])
    create index(:journal_entries, [:vat_operation_type])
    create index(:journal_entries, [:created_by_id])
  end
end