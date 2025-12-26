defmodule BarabaUmbrella.Repo.Migrations.AddIntegrationCredentialsToCompanies do
  use Ecto.Migration

  def change do
    alter table(:companies) do
      # Azure Document Intelligence credentials
      add :azure_di_endpoint, :string
      add :azure_di_api_key, :string

      # Salt Edge Open Banking credentials
      add :saltedge_app_id, :string
      add :saltedge_secret, :string
    end
  end
end
