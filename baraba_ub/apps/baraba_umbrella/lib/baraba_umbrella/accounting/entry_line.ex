defmodule BarabaUmbrella.Accounting.EntryLine do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "entry_lines" do
    field :line_number, :integer
    field :description, :string
    field :debit_amount, :decimal, default: 0
    field :credit_amount, :decimal, default: 0
    field :base_debit_amount, :decimal, default: 0
    field :base_credit_amount, :decimal, default: 0
    field :quantity, :decimal
    field :unit_price, :decimal
    field :unit, :string
    field :exchange_rate, :decimal
    field :vat_amount, :decimal, default: 0
    field :vat_rate_percentage, :decimal
    field :vat_direction, :string # NONE, INPUT, OUTPUT
    field :is_reverse_charge, :boolean, default: false
    field :is_intrastat, :boolean, default: false
    field :notes, :string
    
    # Relationships
    belongs_to :journal_entry, BarabaUmbrella.Accounting.JournalEntry
    belongs_to :debit_account, BarabaUmbrella.Accounting.Account, foreign_key: :debit_account_id
    belongs_to :credit_account, BarabaUmbrella.Accounting.Account, foreign_key: :credit_account_id
    belongs_to :counterpart, BarabaUmbrella.Accounting.Counterpart
    belongs_to :vat_rate, BarabaUmbrella.Accounting.VatRate
    belongs_to :product, BarabaUmbrella.Accounting.Product
    
    timestamps()
  end
  
  @doc false
  def changeset(entry_line, attrs) do
    entry_line
    |> cast(attrs, [
      :line_number, :description, :debit_amount, :credit_amount,
      :base_debit_amount, :base_credit_amount, :quantity, :unit_price,
      :unit, :exchange_rate, :vat_amount, :vat_rate_percentage,
      :vat_direction, :is_reverse_charge, :is_intrastat, :notes,
      :journal_entry_id, :debit_account_id, :credit_account_id,
      :counterpart_id, :vat_rate_id, :product_id
    ])
    |> validate_required([:line_number, :journal_entry_id])
    |> validate_account_assignment()
    |> validate_debit_credit_exclusive()
    |> validate_positive_amounts()
    |> validate_vat_consistency()
    |> assoc_constraint(:journal_entry)
    |> assoc_constraint(:debit_account)
    |> assoc_constraint(:credit_account)
    |> assoc_constraint(:counterpart)
    |> assoc_constraint(:vat_rate)
    |> assoc_constraint(:product)
    |> unique_constraint([:journal_entry_id, :line_number])
  end
  
  defp validate_account_assignment(changeset) do
    debit_id = get_field(changeset, :debit_account_id)
    credit_id = get_field(changeset, :credit_account_id)
    
    cond do
      is_nil(debit_id) && is_nil(credit_id) ->
        add_error(changeset, :base, "must have either debit or credit account")
      
      !is_nil(debit_id) && !is_nil(credit_id) ->
        add_error(changeset, :base, "cannot have both debit and credit account")
      
      true ->
        changeset
    end
  end
  
  defp validate_debit_credit_exclusive(changeset) do
    debit = get_field(changeset, :debit_amount) || Decimal.new(0)
    credit = get_field(changeset, :credit_amount) || Decimal.new(0)
    base_debit = get_field(changeset, :base_debit_amount) || Decimal.new(0)
    base_credit = get_field(changeset, :base_credit_amount) || Decimal.new(0)
    
    cond do
      Decimal.gt?(debit, 0) && Decimal.gt?(credit, 0) ->
        add_error(changeset, :base, "cannot have both debit and credit amounts")
      
      Decimal.gt?(debit, 0) && Decimal.gt?(base_credit, 0) ->
        add_error(changeset, :base, "debit line cannot have base credit amount")
      
      Decimal.gt?(credit, 0) && Decimal.gt?(base_debit, 0) ->
        add_error(changeset, :base, "credit line cannot have base debit amount")
      
      true ->
        changeset
    end
  end
  
  defp validate_positive_amounts(changeset) do
    changeset
    |> validate_number(:debit_amount, greater_than_or_equal_to: 0)
    |> validate_number(:credit_amount, greater_than_or_equal_to: 0)
    |> validate_number(:base_debit_amount, greater_than_or_equal_to: 0)
    |> validate_number(:base_credit_amount, greater_than_or_equal_to: 0)
    |> validate_number(:quantity, greater_than_or_equal_to: 0)
    |> validate_number(:unit_price, greater_than_or_equal_to: 0)
    |> validate_number(:vat_amount, greater_than_or_equal_to: 0)
    |> validate_number(:exchange_rate, greater_than: 0)
    |> validate_number(:vat_rate_percentage, greater_than_or_equal_to: 0)
  end
  
  defp validate_vat_consistency(changeset) do
    vat_amount = get_field(changeset, :vat_amount)
    vat_direction = get_field(changeset, :vat_direction)
    
    cond do
      Decimal.gt?(vat_amount || 0, 0) && is_nil(vat_direction) ->
        add_error(changeset, :vat_direction, "is required when VAT amount is specified")
      
      vat_direction && !Enum.member?(["NONE", "INPUT", "OUTPUT"], vat_direction) ->
        add_error(changeset, :vat_direction, "must be one of: NONE, INPUT, OUTPUT")
      
      true ->
        changeset
    end
  end
  
  def by_journal_entry(query \\ __MODULE__, journal_entry_id) do
    from q in query, where: q.journal_entry_id == ^journal_entry_id
  end
  
  def debit_lines(query \\ __MODULE__) do
    from q in query, where: not is_nil(q.debit_account_id)
  end
  
  def credit_lines(query \\ __MODULE__) do
    from q in query, where: not is_nil(q.credit_account_id)
  end
  
  def by_account(query \\ __MODULE__, account_id) do
    from q in query, where: q.debit_account_id == ^account_id or q.credit_account_id == ^account_id
  end
  
  def by_debit_account(query \\ __MODULE__, account_id) do
    from q in query, where: q.debit_account_id == ^account_id
  end
  
  def by_credit_account(query \\ __MODULE__, account_id) do
    from q in query, where: q.credit_account_id == ^account_id
  end
  
  def by_counterpart(query \\ __MODULE__, counterpart_id) do
    from q in query, where: q.counterpart_id == ^counterpart_id
  end
  
  def with_vat(query \\ __MODULE__) do
    from q in query, where: q.vat_amount > 0
  end
  
  def input_vat(query \\ __MODULE__) do
    from q in query, where: q.vat_direction == "INPUT"
  end
  
  def output_vat(query \\ __MODULE__) do
    from q in query, where: q.vat_direction == "OUTPUT"
  end
  
  def reverse_charge(query \\ __MODULE__) do
    from q in query, where: q.is_reverse_charge == true
  end
  
  def intrastat(query \\ __MODULE__) do
    from q in query, where: q.is_intrastat == true
  end
  
  def with_accounts(query \\ __MODULE__) do
    from q in query,
      left_join: debit in assoc(q, :debit_account),
      left_join: credit in assoc(q, :credit_account),
      preload: [debit_account: debit, credit_account: credit]
  end
  
  def with_counterparts(query \\ __MODULE__) do
    from q in query,
      left_join: counterpart in assoc(q, :counterpart),
      preload: [counterpart: counterpart]
  end
  
  def ordered_by_line_number(query \\ __MODULE__) do
    from q in query, order_by: q.line_number
  end
  
  def with_vat_rates(query \\ __MODULE__) do
    from q in query,
      left_join: vat_rate in assoc(q, :vat_rate),
      preload: [vat_rate: vat_rate]
  end
end