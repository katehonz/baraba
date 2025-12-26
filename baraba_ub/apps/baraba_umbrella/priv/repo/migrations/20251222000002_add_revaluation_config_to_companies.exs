defmodule BarabaUmbrella.Repo.Migrations.AddRevaluationConfigToCompanies do
  use Ecto.Migration

  def change do
    alter table(:companies) do
      # Account for positive currency differences (e.g., 724)
      add(:fx_gains_account_id, :binary_id)
      # Account for negative currency differences (e.g., 624)
      add(:fx_losses_account_id, :binary_id)
    end
  end
end
