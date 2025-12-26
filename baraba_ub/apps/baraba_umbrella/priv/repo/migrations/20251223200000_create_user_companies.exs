defmodule BarabaUmbrella.Repo.Migrations.CreateUserCompanies do
  use Ecto.Migration

  def change do
    create_if_not_exists table(:user_companies) do
      add :user_id, :bigint, null: false
      add :company_id, :binary_id, null: false
      add :is_default, :boolean, default: false, null: false

      timestamps()
    end

    # Foreign key to nim_users table
    create constraint(:user_companies, :user_companies_user_id_fkey,
      check: "user_id > 0"
    )

    # Unique constraint - user can be linked to a company only once
    create_if_not_exists unique_index(:user_companies, [:user_id, :company_id])

    # Index for quick lookup by user
    create_if_not_exists index(:user_companies, [:user_id])

    # Index for quick lookup by company
    create_if_not_exists index(:user_companies, [:company_id])

    # Ensure only one default company per user
    create_if_not_exists unique_index(:user_companies, [:user_id],
      where: "is_default = true",
      name: :user_companies_one_default_per_user
    )
  end
end
