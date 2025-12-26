defmodule BarabaUmbrella.Repo.Migrations.CreateCounterparts do
  use Ecto.Migration

  def change do
    create table(:counterparts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :eik, :string
      add :vat_number, :string
      add :address, :string
      add :city, :string
      add :country, :string, default: "BG"
      add :post_code, :string
      add :phone, :string
      add :email, :string
      add :website, :string
      add :contact_person, :string
      add :notes, :text
      
      # Type flags
      add :is_customer, :boolean, default: false
      add :is_supplier, :boolean, default: false
      add :is_employee, :boolean, default: false
      add :is_vat_registered, :boolean, default: false
      add :is_eu_registered, :boolean, default: false
      add :is_intrastat_registered, :boolean, default: false
      
      # VAT validation
      add :vat_validated, :boolean, default: false
      add :vat_validation_date, :utc_datetime
      add :vies_status, :string
      
      # Payment terms
      add :payment_terms_days, :integer, default: 0
      add :payment_method, :string
      add :bank_account, :string
      add :bank_name, :string
      add :swift, :string
      add :iban, :string
      
      # Foreign key to company
      add :company_id, references(:companies, type: :binary_id), null: false
      
      timestamps()
    end
    
    create unique_index(:counterparts, [:eik, :company_id])
    create unique_index(:counterparts, [:vat_number, :company_id])
    create index(:counterparts, [:company_id])
    create index(:counterparts, [:name])
    create index(:counterparts, [:is_customer])
    create index(:counterparts, [:is_supplier])
    create index(:counterparts, [:is_employee])
    create index(:counterparts, [:is_vat_registered])
    create index(:counterparts, [:vat_validation_date])
  end
end