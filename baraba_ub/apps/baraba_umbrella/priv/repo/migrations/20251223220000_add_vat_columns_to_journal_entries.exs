defmodule BarabaUmbrella.Repo.Migrations.AddVatColumnsToJournalEntries do
  use Ecto.Migration

  def change do
    alter table(:journal_entries) do
      # VAT operation codes for НАП
      add :vat_purchase_operation, :string  # e.g. "1-10-1", "1-09-1"
      add :vat_sales_operation, :string     # e.g. "2-11", "2-19-1"
      add :vat_additional_operation, :string
      add :vat_additional_data, :text

      # Total amounts for VAT calculation
      add :total_amount, :decimal, default: 0  # Tax base
      add :total_vat_amount, :decimal, default: 0  # VAT amount
      add :vat_rate, :decimal, default: 0  # VAT rate percentage

      # Single counterpart reference (for VAT purposes)
      add :counterpart_id, references(:counterparts, type: :binary_id)
    end

    create index(:journal_entries, [:vat_purchase_operation])
    create index(:journal_entries, [:vat_sales_operation])
    create index(:journal_entries, [:counterpart_id])
  end
end
