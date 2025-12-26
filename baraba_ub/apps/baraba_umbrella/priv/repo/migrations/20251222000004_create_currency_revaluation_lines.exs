defmodule BarabaUmbrella.Repo.Migrations.CreateCurrencyRevaluationLines do
  use Ecto.Migration

  def change do
    create table(:currency_revaluation_lines, primary_key: false) do
      add(:id, :binary_id, primary_key: true)

      add(:revaluation_id,
        references(:currency_revaluations, type: :binary_id, on_delete: :delete_all),
        null: false
      )

      add(:account_id, references(:accounts, type: :binary_id), null: false)
      add(:currency_id, references(:currencies, type: :binary_id), null: false)

      # Balances in foreign currency
      add(:foreign_debit_balance, :decimal, precision: 15, scale: 2, default: 0)
      add(:foreign_credit_balance, :decimal, precision: 15, scale: 2, default: 0)
      add(:foreign_net_balance, :decimal, precision: 15, scale: 2, default: 0)

      # Recorded base amounts (BGN)
      add(:recorded_base_balance, :decimal, precision: 15, scale: 2, default: 0)

      # Revalued amounts
      add(:exchange_rate, :decimal, precision: 12, scale: 6)
      add(:revalued_base_balance, :decimal, precision: 15, scale: 2, default: 0)

      # Difference
      add(:revaluation_difference, :decimal, precision: 15, scale: 2, default: 0)
      add(:is_gain, :boolean, default: false)

      timestamps()
    end

    create(index(:currency_revaluation_lines, [:revaluation_id]))
    create(index(:currency_revaluation_lines, [:account_id]))
    create(index(:currency_revaluation_lines, [:currency_id]))
  end
end
