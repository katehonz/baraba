defmodule BarabaUmbrella.Repo.Migrations.CreateCompanies do
  use Ecto.Migration

  def change do
    create table(:companies, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :eik, :string, null: false
      add :vat_number, :string
      add :address, :string
      add :city, :string
      add :country, :string
      add :post_code, :string
      add :phone, :string
      add :email, :string
      add :website, :string
      
      # Account ID references for default accounts (no FK constraints - added later)
      add :cash_account_id, :binary_id
      add :bank_account_id, :binary_id
      add :customers_account_id, :binary_id
      add :suppliers_account_id, :binary_id
      add :vat_payable_account_id, :binary_id
      add :vat_receivable_account_id, :binary_id
      add :expenses_account_id, :binary_id
      add :revenues_account_id, :binary_id
      
      # Company settings
      add :is_vat_registered, :boolean, default: false
      add :is_intrastat_registered, :boolean, default: false
      add :nap_office, :string
      add :vat_period, :string, default: "monthly"
      add :currency, :string, default: "BGN"
      add :fiscal_year_start_month, :integer, default: 1
      add :representative_type, :string
      add :representative_name, :string
      add :representative_eik, :string
      
      # Integration flags
      add :saltedge_enabled, :boolean, default: false
      add :ai_scanning_enabled, :boolean, default: false
      add :vies_validation_enabled, :boolean, default: true
      
      timestamps()
    end
    
    create unique_index(:companies, [:eik])
    create unique_index(:companies, [:vat_number])
    create index(:companies, [:name])
    create index(:companies, [:is_vat_registered])
    create index(:companies, [:currency])
  end
end