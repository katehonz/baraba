defmodule BarabaUmbrella.Accounting.VatReturn do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "vat_returns" do
    field :period_year, :integer
    field :period_month, :integer
    field :status, :string, default: "DRAFT" # DRAFT, SUBMITTED, ACCEPTED, REJECTED

    # Purchases
    field :purchase_base_20, :decimal, default: 0.0
    field :purchase_vat_20, :decimal, default: 0.0
    field :purchase_base_9, :decimal, default: 0.0
    field :purchase_vat_9, :decimal, default: 0.0
    field :purchase_base_0, :decimal, default: 0.0
    field :purchase_intra_eu, :decimal, default: 0.0
    field :purchase_import, :decimal, default: 0.0

    # Sales
    field :sales_base_20, :decimal, default: 0.0
    field :sales_vat_20, :decimal, default: 0.0
    field :sales_base_9, :decimal, default: 0.0
    field :sales_vat_9, :decimal, default: 0.0
    field :sales_base_0, :decimal, default: 0.0
    field :sales_intra_eu, :decimal, default: 0.0
    field :sales_exempt, :decimal, default: 0.0

    # Totals
    field :total_purchase_vat, :decimal, default: 0.0
    field :total_sales_vat, :decimal, default: 0.0
    field :vat_due, :decimal, default: 0.0

    # Files
    field :pokupki_file, :binary
    field :prodajbi_file, :binary
    field :deklar_file, :binary

    # Submission
    field :submission_date, :utc_datetime
    field :submission_reference, :string
    field :rejection_reason, :string

    field :notes, :string
    
    belongs_to :company, BarabaUmbrella.Accounting.Company
    belongs_to :created_by, BarabaUmbrella.Accounting.User

    timestamps()
  end

  @doc false
  def changeset(vat_return, attrs) do
    vat_return
    |> cast(attrs, [
      :period_year, :period_month, :status, :purchase_base_20, :purchase_vat_20,
      :purchase_base_9, :purchase_vat_9, :purchase_base_0, :purchase_intra_eu,
      :purchase_import, :sales_base_20, :sales_vat_20, :sales_base_9, :sales_vat_9,
      :sales_base_0, :sales_intra_eu, :sales_exempt, :total_purchase_vat,
      :total_sales_vat, :vat_due, :pokupki_file, :prodajbi_file, :deklar_file,
      :submission_date, :submission_reference, :rejection_reason, :notes,
      :company_id, :created_by_id
    ])
    |> validate_required([:period_year, :period_month, :company_id])
    |> unique_constraint([:company_id, :period_year, :period_month])
  end
end
