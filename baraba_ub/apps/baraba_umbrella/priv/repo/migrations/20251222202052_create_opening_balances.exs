defmodule BarabaUmbrella.Repo.Migrations.CreateOpeningBalances do
  use Ecto.Migration

  def change do
    create table(:opening_balances, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :debit, :decimal, precision: 14, scale: 2
      add :credit, :decimal, precision: 14, scale: 2
      add :date, :date
      add :account_id, references(:accounts, type: :binary_id, on_delete: :nothing)
      add :company_id, references(:companies, type: :binary_id, on_delete: :nothing)
      add :accounting_period_id, references(:accounting_periods, type: :binary_id, on_delete: :nothing)

      timestamps()
    end

    create index(:opening_balances, [:account_id])
    create index(:opening_balances, [:company_id])
    create index(:opening_balances, [:accounting_period_id])
  end
end
