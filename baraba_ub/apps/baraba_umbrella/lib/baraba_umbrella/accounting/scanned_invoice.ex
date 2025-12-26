defmodule BarabaUmbrella.Accounting.ScannedInvoice do
  use Ecto.Schema
  import Ecto.Changeset

  schema "scanned_invoices" do
    field :company_uid, :string
    field :direction, :string # PURCHASE, SALES
    field :status, :string, default: "PENDING"

    # Vendor info
    field :vendor_name, :string
    field :vendor_vat_number, :string
    field :vendor_address, :string

    # Customer info
    field :customer_name, :string
    field :customer_vat_number, :string
    field :customer_address, :string

    # Invoice details
    field :invoice_number, :string
    field :invoice_date, :date
    field :due_date, :date

    # Amounts
    field :subtotal, :decimal
    field :total_tax, :decimal
    field :invoice_total, :decimal

    # VIES validation
    field :vies_status, :string, default: "PENDING"
    field :vies_validation_message, :string
    field :vies_company_name, :string
    field :vies_company_address, :string
    field :vies_validated_at, :utc_datetime

    # Selected accounts (Associations)
    field :counterparty_account_id, :binary_id
    field :vat_account_id, :binary_id
    field :expense_revenue_account_id, :binary_id

    # Review flags
    field :requires_manual_review, :boolean, default: false
    field :manual_review_reason, :string
    field :notes, :string

    # Processing metadata
    field :confidence, :decimal
    field :original_file_name, :string
    field :journal_entry_id, :binary_id
    
    # Session links
    field :session_id, :integer
    field :session_file_id, :integer

    # S3 Storage
    field :internal_number, :integer
    field :s3_key, :string
    field :s3_uploaded_at, :utc_datetime

    # Audit
    field :created_by_id, :integer # User ID (BigInt in DB)

    timestamps(inserted_at: :created_at, type: :utc_datetime)
  end

  @doc false
  def changeset(scanned_invoice, attrs) do
    scanned_invoice
    |> cast(attrs, [
      :company_uid, :direction, :status,
      :vendor_name, :vendor_vat_number, :vendor_address,
      :customer_name, :customer_vat_number, :customer_address,
      :invoice_number, :invoice_date, :due_date,
      :subtotal, :total_tax, :invoice_total,
      :vies_status, :vies_validation_message, :vies_company_name,
      :vies_company_address, :vies_validated_at,
      :counterparty_account_id, :vat_account_id, :expense_revenue_account_id,
      :requires_manual_review, :manual_review_reason, :notes,
      :confidence, :original_file_name, :journal_entry_id,
      :session_id, :session_file_id, :created_by_id,
      :internal_number, :s3_key, :s3_uploaded_at
    ])
    |> validate_required([:company_uid, :direction, :status])
  end
end
