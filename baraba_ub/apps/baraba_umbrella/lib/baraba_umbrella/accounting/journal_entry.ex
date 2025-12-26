defmodule BarabaUmbrella.Accounting.JournalEntry do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "journal_entries" do
    field(:entry_number, :string)
    field(:description, :string)
    field(:document_number, :string)
    # INVOICE, CREDIT_NOTE, DEBIT_NOTE, RECEIPT, OTHER
    field(:document_type, :string)
    field(:document_date, :date)
    field(:accounting_date, :date)
    field(:vat_date, :date)
    field(:currency, :string, default: "EUR")
    field(:exchange_rate, :decimal)
    field(:total_debit, :decimal)
    field(:total_credit, :decimal)
    field(:base_total_debit, :decimal)
    field(:base_total_credit, :decimal)
    field(:vat_amount, :decimal, default: 0)
    field(:is_posted, :boolean, default: false)
    field(:posted_at, :utc_datetime)
    field(:notes, :string)

    # VAT operation types
    field(:vat_operation_type, :string)
    field(:vat_document_type, :string)

    # VAT НАП operation codes
    field(:vat_purchase_operation, :string)  # e.g. "1-10-1", "1-09-1"
    field(:vat_sales_operation, :string)     # e.g. "2-11", "2-19-1"
    field(:vat_additional_operation, :string)
    field(:vat_additional_data, :string)

    # VAT amounts
    field(:total_amount, :decimal, default: 0)      # Tax base
    field(:total_vat_amount, :decimal, default: 0)  # VAT amount
    field(:vat_rate, :decimal, default: 0)          # VAT rate %

    # Relationships
    belongs_to(:company, BarabaUmbrella.Accounting.Company)

    belongs_to(:debtor_counterpart, BarabaUmbrella.Accounting.Counterpart,
      foreign_key: :debtor_counterpart_id
    )

    belongs_to(:creditor_counterpart, BarabaUmbrella.Accounting.Counterpart,
      foreign_key: :creditor_counterpart_id
    )

    # Single counterpart for VAT purposes
    belongs_to(:counterpart, BarabaUmbrella.Accounting.Counterpart)

    has_many(:entry_lines, BarabaUmbrella.Accounting.EntryLine)
    has_one(:vat_entry, BarabaUmbrella.Accounting.VatEntry)
    belongs_to(:posting_user, BarabaUmbrella.Accounting.User, foreign_key: :posted_by_id)
    belongs_to(:created_by_user, BarabaUmbrella.Accounting.User, foreign_key: :created_by_id)
    belongs_to(:last_modified_by_user, BarabaUmbrella.Accounting.User, foreign_key: :last_modified_by_id)

    timestamps()
  end

  @doc false
  def changeset(journal_entry, attrs) do
    journal_entry
    |> cast(attrs, [
      :entry_number,
      :description,
      :document_number,
      :document_type,
      :document_date,
      :accounting_date,
      :vat_date,
      :currency,
      :exchange_rate,
      :total_debit,
      :total_credit,
      :base_total_debit,
      :base_total_credit,
      :vat_amount,
      :is_posted,
      :posted_at,
      :posted_by_id,
      :created_by_id,
      :last_modified_by_id,
      :notes,
      :vat_operation_type,
      :vat_document_type,
      :vat_purchase_operation,
      :vat_sales_operation,
      :vat_additional_operation,
      :vat_additional_data,
      :total_amount,
      :total_vat_amount,
      :vat_rate,
      :company_id,
      :debtor_counterpart_id,
      :creditor_counterpart_id,
      :counterpart_id
    ])
    |> validate_required([
      :entry_number,
      :document_type,
      :document_date,
      :accounting_date,
      :company_id
    ])
    |> validate_inclusion(:document_type, [
      "INVOICE",
      "CREDIT_NOTE",
      "DEBIT_NOTE",
      "RECEIPT",
      "PAYMENT",
      "BANK_STATEMENT",
      "OTHER"
    ])
    |> validate_inclusion(:currency, ~w(BGN EUR USD GBP CHF))
    |> validate_positive_amounts()
    |> validate_accounting_period()
    |> validate_period_open()
    |> validate_posting_constraints()
    |> unique_constraint([:entry_number, :company_id])
    |> assoc_constraint(:company)
    |> assoc_constraint(:debtor_counterpart)
    |> assoc_constraint(:creditor_counterpart)
    |> assoc_constraint(:counterpart)
  end

  defp validate_positive_amounts(changeset) do
    changeset
    |> validate_number(:total_debit, greater_than_or_equal_to: 0)
    |> validate_number(:total_credit, greater_than_or_equal_to: 0)
    |> validate_number(:base_total_debit, greater_than_or_equal_to: 0)
    |> validate_number(:base_total_credit, greater_than_or_equal_to: 0)
    |> validate_number(:exchange_rate, greater_than: 0)
  end

  defp validate_accounting_period(changeset) do
    doc_date = get_field(changeset, :document_date)
    acc_date = get_field(changeset, :accounting_date)

    cond do
      doc_date && acc_date && Date.compare(doc_date, acc_date) == :gt ->
        add_error(changeset, :accounting_date, "cannot be earlier than document date")

      true ->
        changeset
    end
  end

  # Soft validation - period status is informational only, always allow editing
  defp validate_period_open(changeset) do
    # No blocking - closed periods are just informational for small accounting offices
    changeset
  end

  defp validate_posting_constraints(changeset) do
    is_posted = get_field(changeset, :is_posted)
    posted_at = get_field(changeset, :posted_at)
    posted_by_id = get_field(changeset, :posted_by_id)

    cond do
      is_posted && is_nil(posted_at) ->
        add_error(changeset, :posted_at, "is required when entry is posted")

      is_posted && is_nil(posted_by_id) ->
        add_error(changeset, :posted_by_id, "is required when entry is posted")

      !is_posted && (posted_at || posted_by_id) ->
        add_error(changeset, :base, "cannot have posting information when entry is not posted")

      true ->
        changeset
    end
  end

  def by_company(query \\ __MODULE__, company_id) do
    from(q in query, where: q.company_id == ^company_id)
  end

  def by_number(query \\ __MODULE__, number) do
    from(q in query, where: q.entry_number == ^number)
  end

  def posted(query \\ __MODULE__) do
    from(q in query, where: q.is_posted == true)
  end

  def unposted(query \\ __MODULE__) do
    from(q in query, where: q.is_posted == false)
  end

  def by_document_type(query \\ __MODULE__, type) do
    from(q in query, where: q.document_type == ^type)
  end

  def by_document_date_range(query \\ __MODULE__, start_date, end_date) do
    from(q in query,
      where: q.document_date >= ^start_date and q.document_date <= ^end_date
    )
  end

  def by_accounting_date_range(query \\ __MODULE__, start_date, end_date) do
    from(q in query,
      where: q.accounting_date >= ^start_date and q.accounting_date <= ^end_date
    )
  end

  def by_counterpart(query \\ __MODULE__, counterpart_id) do
    from(q in query,
      where:
        q.debtor_counterpart_id == ^counterpart_id or q.creditor_counterpart_id == ^counterpart_id
    )
  end

  def by_created_by(query \\ __MODULE__, user_id) do
    from(q in query, where: q.created_by_id == ^user_id)
  end

  def with_lines(query \\ __MODULE__) do
    from(q in query,
      preload: [:entry_lines]
    )
  end

  def with_counterparts(query \\ __MODULE__) do
    from(q in query,
      preload: [:debtor_counterpart, :creditor_counterpart]
    )
  end

  def ordered_by_date(query \\ __MODULE__) do
    from(q in query, order_by: [desc: q.document_date, desc: q.entry_number])
  end

  def ordered_by_number(query \\ __MODULE__) do
    from(q in query, order_by: [desc: q.entry_number])
  end

  def by_vat_operation_type(query \\ __MODULE__, operation_type) do
    from(q in query, where: q.vat_operation_type == ^operation_type)
  end

  def has_vat(query \\ __MODULE__) do
    from(q in query, where: q.vat_amount > 0)
  end
end
