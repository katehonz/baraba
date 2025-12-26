defmodule BarabaUmbrella.Repo.Migrations.CreateAccounts do
  use Ecto.Migration

  def change do
    create table(:accounts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :code, :string, null: false
      add :name, :string, null: false
      add :description, :string
      add :account_type, :string, null: false
      add :account_class, :string
      add :level, :integer
      add :parent_id, references(:accounts, type: :binary_id)
      add :is_active, :boolean, default: true
      add :is_system, :boolean, default: false
      add :is_analytical, :boolean, default: false
      add :analytical_group, :string
      add :can_have_direct_entries, :boolean, default: false
      add :vat_applicable, :string, default: "NONE"
      add :saft_account_code, :string
      add :saft_account_type, :string
      
      # Currency and quantities support
      add :is_multi_currency, :boolean, default: false
      add :is_quantity_tracked, :boolean, default: false
      add :default_unit, :string
      
      # Foreign key to company
      add :company_id, references(:companies, type: :binary_id), null: false
      
      timestamps()
    end
    
    create unique_index(:accounts, [:code, :company_id])
    create index(:accounts, [:company_id])
    create index(:accounts, [:account_type])
    create index(:accounts, [:parent_id])
    create index(:accounts, [:is_active])
    create index(:accounts, [:is_system])
    create index(:accounts, [:is_analytical])
    create index(:accounts, [:level])
  end
end