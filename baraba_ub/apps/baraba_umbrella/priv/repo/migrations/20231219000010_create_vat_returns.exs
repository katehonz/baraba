defmodule BarabaUmbrella.Repo.Migrations.CreateVatReturns do
  use Ecto.Migration

  def change do
    create table(:vat_returns, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :period_year, :integer, null: false
      add :period_month, :integer, null: false
      add :status, :string, default: "DRAFT"
      add :purchase_base_20, :decimal, precision: 15, scale: 2, default: 0.0
      add :purchase_vat_20, :decimal, precision: 15, scale: 2, default: 0.0
      add :purchase_base_9, :decimal, precision: 15, scale: 2, default: 0.0
      add :purchase_vat_9, :decimal, precision: 15, scale: 2, default: 0.0
      add :purchase_base_0, :decimal, precision: 15, scale: 2, default: 0.0
      add :purchase_intra_eu, :decimal, precision: 15, scale: 2, default: 0.0
      add :purchase_import, :decimal, precision: 15, scale: 2, default: 0.0
      add :sales_base_20, :decimal, precision: 15, scale: 2, default: 0.0
      add :sales_vat_20, :decimal, precision: 15, scale: 2, default: 0.0
      add :sales_base_9, :decimal, precision: 15, scale: 2, default: 0.0
      add :sales_vat_9, :decimal, precision: 15, scale: 2, default: 0.0
      add :sales_base_0, :decimal, precision: 15, scale: 2, default: 0.0
      add :sales_intra_eu, :decimal, precision: 15, scale: 2, default: 0.0
      add :sales_exempt, :decimal, precision: 15, scale: 2, default: 0.0
      add :total_purchase_vat, :decimal, precision: 15, scale: 2, default: 0.0
      add :total_sales_vat, :decimal, precision: 15, scale: 2, default: 0.0
      add :vat_due, :decimal, precision: 15, scale: 2, default: 0.0
      add :pokupki_file, :binary
      add :prodajbi_file, :binary
      add :deklar_file, :binary
      add :submission_date, :utc_datetime
      add :submission_reference, :string
      add :rejection_reason, :text
      add :notes, :text
      add :company_id, references(:companies, type: :binary_id, on_delete: :delete_all), null: false
      add :created_by_id, references(:users, type: :binary_id, on_delete: :nilify_all)

      timestamps()
    end

    create index(:vat_returns, [:company_id])
    create unique_index(:vat_returns, [:company_id, :period_year, :period_month])
  end
end
