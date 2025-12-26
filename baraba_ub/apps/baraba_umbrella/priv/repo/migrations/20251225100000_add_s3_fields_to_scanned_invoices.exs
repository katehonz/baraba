defmodule BarabaUmbrella.Repo.Migrations.AddS3FieldsToScannedInvoices do
  use Ecto.Migration

  def change do
    alter table(:scanned_invoices) do
      add :internal_number, :integer
      add :s3_key, :string
      add :s3_uploaded_at, :utc_datetime
    end

    # Unique constraint for internal_number per company/month/direction
    create index(:scanned_invoices, [:company_uid, :direction, :internal_number],
      unique: true,
      where: "internal_number IS NOT NULL",
      name: :scanned_invoices_internal_number_unique)
  end
end
