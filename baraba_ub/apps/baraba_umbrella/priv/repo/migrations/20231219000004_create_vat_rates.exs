defmodule BarabaUmbrella.Repo.Migrations.CreateVatRates do
  use Ecto.Migration

  def change do
    create table(:vat_rates, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :percentage, :decimal, null: false
      add :description, :string
      add :is_active, :boolean, default: true
      add :effective_from, :date, null: false
      add :effective_to, :date
      add :vat_code, :string
      add :saft_tax_type, :string
      add :is_reverse_charge_applicable, :boolean, default: false
      add :is_intrastat_applicable, :boolean, default: false
      
      # Foreign key to company
      add :company_id, references(:companies, type: :binary_id), null: false
      
      timestamps()
    end
    
    create unique_index(:vat_rates, [:name, :company_id])
    create index(:vat_rates, [:company_id])
    create index(:vat_rates, [:percentage])
    create index(:vat_rates, [:is_active])
    create index(:vat_rates, [:effective_from])
    create index(:vat_rates, [:effective_to])
  end
end