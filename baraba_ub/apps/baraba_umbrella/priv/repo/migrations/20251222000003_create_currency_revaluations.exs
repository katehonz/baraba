defmodule BarabaUmbrella.Repo.Migrations.CreateCurrencyRevaluations do
  use Ecto.Migration

  def change do
    create table(:currency_revaluations, primary_key: false) do
      add(:id, :binary_id, primary_key: true)

      add(:company_id, references(:companies, type: :binary_id, on_delete: :delete_all),
        null: false
      )

      add(:year, :integer, null: false)
      add(:month, :integer, null: false)
      add(:revaluation_date, :date, null: false)
      add(:status, :string, default: "PENDING", null: false)
      add(:total_gains, :decimal, precision: 15, scale: 2, default: 0)
      add(:total_losses, :decimal, precision: 15, scale: 2, default: 0)
      add(:net_result, :decimal, precision: 15, scale: 2, default: 0)
      add(:notes, :text)

      add(:journal_entry_id, references(:journal_entries, type: :binary_id))
      add(:created_by_id, references(:users, type: :binary_id))
      add(:posted_by_id, references(:users, type: :binary_id))
      add(:posted_at, :utc_datetime)

      timestamps()
    end

    create(unique_index(:currency_revaluations, [:company_id, :year, :month]))
    create(index(:currency_revaluations, [:company_id]))
    create(index(:currency_revaluations, [:status]))
    create(index(:currency_revaluations, [:revaluation_date]))
    create(index(:currency_revaluations, [:journal_entry_id]))
  end
end
