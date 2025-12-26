defmodule BarabaUmbrella.Repo.Migrations.AddS3ConfigToCompanies do
  use Ecto.Migration

  def change do
    alter table(:companies) do
      add :s3_enabled, :boolean, default: false
      add :s3_bucket, :string
      add :s3_region, :string
      add :s3_endpoint, :string
      add :s3_access_key, :string
      add :s3_secret_key, :string
      add :s3_folder_prefix, :string
    end
  end
end
