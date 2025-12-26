defmodule BarabaUmbrella.Repo.Migrations.CreateEntryLines do
  use Ecto.Migration

  def change do
    create table(:entry_lines, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :line_number, :integer, null: false
      add :description, :string
      add :debit_amount, :decimal, default: 0
      add :credit_amount, :decimal, default: 0
      add :base_debit_amount, :decimal, default: 0
      add :base_credit_amount, :decimal, default: 0
      add :quantity, :decimal
      add :unit_price, :decimal
      add :unit, :string
      add :exchange_rate, :decimal
      add :vat_amount, :decimal, default: 0
      add :vat_rate_percentage, :decimal
      add :vat_direction, :string
      add :is_reverse_charge, :boolean, default: false
      add :is_intrastat, :boolean, default: false
      add :notes, :text
      
      # Foreign keys
      add :journal_entry_id, references(:journal_entries, type: :binary_id), null: false
      add :debit_account_id, references(:accounts, type: :binary_id)
      add :credit_account_id, references(:accounts, type: :binary_id)
      add :counterpart_id, references(:counterparts, type: :binary_id)
      add :vat_rate_id, references(:vat_rates, type: :binary_id)
      
      timestamps()
    end
    
    create unique_index(:entry_lines, [:journal_entry_id, :line_number])
    create index(:entry_lines, [:journal_entry_id])
    create index(:entry_lines, [:debit_account_id])
    create index(:entry_lines, [:credit_account_id])
    create index(:entry_lines, [:counterpart_id])
    create index(:entry_lines, [:vat_rate_id])
    create index(:entry_lines, [:vat_direction])
    create index(:entry_lines, [:is_reverse_charge])
    create index(:entry_lines, [:is_intrastat])
  end
end