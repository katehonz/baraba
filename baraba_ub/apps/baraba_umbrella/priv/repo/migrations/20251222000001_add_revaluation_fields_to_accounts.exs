defmodule BarabaUmbrella.Repo.Migrations.AddRevaluationFieldsToAccounts do
  use Ecto.Migration

  def change do
    alter table(:accounts) do
      add(:is_revaluable, :boolean, default: false)
      add(:default_currency_id, references(:currencies, type: :binary_id))
    end

    create(index(:accounts, [:is_revaluable]))
    create(index(:accounts, [:default_currency_id]))
  end
end
