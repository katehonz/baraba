defmodule BarabaUmbrella.Accounting.VatEntry do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "vat_entries" do
    field :document_type, :string # "01" Invoice, "02" Debit Note, "03" Credit Note, "09" Protocol
    field :document_number, :string
    field :document_date, :date
    field :posting_date, :date
    field :deal_type, :string # Code for the type of deal (e.g., "01", "02")
    field :description, :string
    field :tax_base, :decimal
    field :vat_amount, :decimal
    field :vat_rate, :decimal
    field :total_amount, :decimal
    field :is_purchase, :boolean, default: true
    field :is_included, :boolean, default: true

    belongs_to :company, BarabaUmbrella.Accounting.Company
    belongs_to :journal_entry, BarabaUmbrella.Accounting.JournalEntry
    belongs_to :counterpart, BarabaUmbrella.Accounting.Counterpart

    timestamps()
  end

  @doc false
  def changeset(vat_entry, attrs) do
    vat_entry
    |> cast(attrs, [
      :document_type, :document_number, :document_date, :posting_date,
      :deal_type, :description, :tax_base, :vat_amount, :vat_rate,
      :total_amount, :is_purchase, :is_included,
      :company_id, :journal_entry_id, :counterpart_id
    ])
    |> validate_required([
      :document_type, :document_number, :document_date, :posting_date,
      :deal_type, :tax_base, :vat_amount, :total_amount, :company_id
    ])
  end
end
