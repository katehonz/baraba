defmodule BarabaUmbrella.Repo.Migrations.CreateAccountingPeriods do
  use Ecto.Migration

  def change do
    create table(:accounting_periods, primary_key: false) do
      add(:id, :binary_id, primary_key: true)

      add(:company_id, references(:companies, type: :binary_id, on_delete: :delete_all),
        null: false
      )

      add(:year, :integer, null: false)
      add(:month, :integer, null: false)
      add(:status, :string, default: "OPEN", null: false)
      add(:closed_by_id, references(:users, type: :binary_id))
      add(:closed_at, :utc_datetime)
      add(:notes, :string)

      timestamps()
    end

    create(unique_index(:accounting_periods, [:company_id, :year, :month]))
    create(index(:accounting_periods, [:company_id, :status]))
    create(index(:accounting_periods, [:closed_by_id]))
  end
end
