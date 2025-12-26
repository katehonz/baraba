defmodule BarabaUmbrella.Repo.Migrations.CreateVatEntries do
  use Ecto.Migration

  def change do
    create table(:vat_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :company_id, references(:companies, on_delete: :delete_all, type: :binary_id), null: false
      add :journal_entry_id, references(:journal_entries, on_delete: :delete_all, type: :binary_id)
      add :counterpart_id, references(:counterparts, on_delete: :nilify_all, type: :binary_id)
      
      add :document_type, :string, null: false # "01", "02", "03", "09"...
      add :document_number, :string, null: false
      add :document_date, :date, null: false
      add :posting_date, :date, null: false # Included in VAT period
      
      add :deal_type, :string, null: false # "01" - Purchase w/ credit, "11" - Sales 20%, etc.
      add :description, :string
      
      add :tax_base, :decimal, default: 0.0
      add :vat_amount, :decimal, default: 0.0
      add :vat_rate, :decimal # 20, 9, 0
      add :total_amount, :decimal, default: 0.0
      
      add :is_purchase, :boolean, default: true # true = Purchase Diary, false = Sales Diary
      add :is_included, :boolean, default: true # Should be included in generation

      timestamps()
    end

    create index(:vat_entries, [:company_id])
    create index(:vat_entries, [:journal_entry_id])
    create index(:vat_entries, [:posting_date])
  end
end
