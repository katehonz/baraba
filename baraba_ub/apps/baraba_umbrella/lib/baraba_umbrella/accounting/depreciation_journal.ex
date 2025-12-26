defmodule BarabaUmbrella.Accounting.DepreciationJournal do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "depreciation_journals" do
    field :period, :date
    field :accounting_depreciation_amount, :decimal
    field :accounting_book_value_before, :decimal
    field :accounting_book_value_after, :decimal
    field :tax_depreciation_amount, :decimal
    field :tax_book_value_before, :decimal
    field :tax_book_value_after, :decimal
    field :is_posted, :boolean, default: false
    field :posted_at, :naive_datetime

    belongs_to :company, BarabaUmbrella.Accounting.Company
    belongs_to :fixed_asset, BarabaUmbrella.Accounting.FixedAsset
    belongs_to :journal_entry, BarabaUmbrella.Accounting.JournalEntry

    timestamps()
  end

  @doc false
  def changeset(depreciation_journal, attrs) do
    depreciation_journal
    |> cast(attrs, [
      :period, :accounting_depreciation_amount, :accounting_book_value_before,
      :accounting_book_value_after, :tax_depreciation_amount, :tax_book_value_before,
      :tax_book_value_after, :is_posted, :posted_at, :company_id, :fixed_asset_id,
      :journal_entry_id
    ])
    |> validate_required([
      :period, :accounting_depreciation_amount, :accounting_book_value_before,
      :accounting_book_value_after, :tax_depreciation_amount, :tax_book_value_before,
      :tax_book_value_after, :company_id, :fixed_asset_id
    ])
    |> unique_constraint([:fixed_asset_id, :period])
  end
end
