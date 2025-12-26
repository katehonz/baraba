defmodule BarabaUmbrella.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :email, :string, null: false
      add :password_hash, :string
      add :first_name, :string
      add :last_name, :string
      add :phone, :string
      add :role, :string, default: "user"
      add :is_active, :boolean, default: true
      add :last_login_at, :utc_datetime
      add :password_reset_token, :string
      add :password_reset_expires_at, :utc_datetime
      add :email_verified_at, :utc_datetime
      
      timestamps()
    end
    
    create unique_index(:users, [:email])
    create index(:users, [:role])
    create index(:users, [:is_active])
    create index(:users, [:last_login_at])
    create index(:users, [:password_reset_token])
  end
end