defmodule BarabaUmbrella.Accounting.Counterpart do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "counterparts" do
    field :name, :string
    field :eik, :string
    field :vat_number, :string
    field :address, :string
    field :long_address, :string
    field :city, :string
    field :country, :string, default: "BG"
    field :post_code, :string
    field :phone, :string
    field :email, :string
    field :website, :string
    field :contact_person, :string
    field :notes, :string
    
    # Type flags
    field :is_customer, :boolean, default: false
    field :is_supplier, :boolean, default: false
    field :is_employee, :boolean, default: false
    field :is_vat_registered, :boolean, default: false
    field :is_eu_registered, :boolean, default: false
    field :is_intrastat_registered, :boolean, default: false
    
    # VAT validation
    field :vat_validated, :boolean, default: false
    field :vat_validation_date, :utc_datetime
    field :vies_status, :string
    
    # Payment terms
    field :payment_terms_days, :integer, default: 0
    field :payment_method, :string # BANK, CASH, CARD
    field :bank_account, :string
    field :bank_name, :string
    field :swift, :string
    field :iban, :string
    
    # Relationships
    belongs_to :company, BarabaUmbrella.Accounting.Company
    has_many :journal_entries_as_debtor, BarabaUmbrella.Accounting.JournalEntry, foreign_key: :debtor_counterpart_id
    has_many :journal_entries_as_creditor, BarabaUmbrella.Accounting.JournalEntry, foreign_key: :creditor_counterpart_id
    has_many :debit_entry_lines, BarabaUmbrella.Accounting.EntryLine, foreign_key: :counterpart_id
    has_many :credit_entry_lines, BarabaUmbrella.Accounting.EntryLine, foreign_key: :counterpart_id
    
    timestamps()
  end
  
  @doc false
  def changeset(counterpart, attrs) do
    counterpart
    |> cast(attrs, [
      :name, :eik, :vat_number, :address, :long_address, :city, :country, :post_code,
      :phone, :email, :website, :contact_person, :notes, :is_customer,
      :is_supplier, :is_employee, :is_vat_registered, :is_eu_registered,
      :is_intrastat_registered, :vat_validated, :vat_validation_date,
      :vies_status, :payment_terms_days, :payment_method, :bank_account,
      :bank_name, :swift, :iban, :company_id
    ])
    |> validate_required([:name, :company_id])
    |> validate_format(:eik, ~r/^\d{9,13}$/, message: "must be 9-13 digits")
    |> validate_format(:vat_number, ~r/^[A-Z]{2}\d{9,13}$/, message: "must be country code followed by 9-13 digits")
    |> validate_inclusion(:country, ~w(BG AT BE HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE GB))
    |> validate_inclusion(:payment_method, ["BANK", "CASH", "CARD"])
    |> unique_constraint([:eik, :company_id])
    |> unique_constraint([:vat_number, :company_id])
    |> validate_at_least_one_role()
    |> assoc_constraint(:company)
  end
  
  defp validate_at_least_one_role(changeset) do
    is_customer = get_field(changeset, :is_customer) || false
    is_supplier = get_field(changeset, :is_supplier) || false
    is_employee = get_field(changeset, :is_employee) || false
    
    if not (is_customer or is_supplier or is_employee) do
      add_error(changeset, :base, "Counterpart must be at least one of: customer, supplier, or employee")
    else
      changeset
    end
  end
  
  def by_name(query \\ __MODULE__) do
    from q in query, order_by: q.name
  end
  
  def by_company(query \\ __MODULE__, company_id) do
    from q in query, where: q.company_id == ^company_id
  end
  
  def customers(query \\ __MODULE__) do
    from q in query, where: q.is_customer == true
  end
  
  def suppliers(query \\ __MODULE__) do
    from q in query, where: q.is_supplier == true
  end
  
  def employees(query \\ __MODULE__) do
    from q in query, where: q.is_employee == true
  end
  
  def vat_registered(query \\ __MODULE__) do
    from q in query, where: q.is_vat_registered == true
  end
  
  def eu_registered(query \\ __MODULE__) do
    from q in query, where: q.is_eu_registered == true
  end
  
  def by_vat_number(query \\ __MODULE__, vat_number) do
    from q in query, where: q.vat_number == ^vat_number
  end
  
  def by_eik(query \\ __MODULE__, eik) do
    from q in query, where: q.eik == ^eik
  end
  
  def with_vat_validation(query \\ __MODULE__) do
    from q in query, where: not is_nil(q.vat_validation_date)
  end
  
  def recently_validated(query \\ __MODULE__, days \\ 30) do
    cutoff_date = DateTime.add(DateTime.utc_now(), -days * 24 * 3600, :second)
    from q in query, where: q.vat_validation_date > ^cutoff_date
  end
  
  def search(query \\ __MODULE__, term) do
    search_term = "%#{term}%"
    from q in query,
      where: ilike(q.name, ^search_term) or
             ilike(q.eik, ^search_term) or
             ilike(q.vat_number, ^search_term) or
             ilike(q.email, ^search_term)
  end
end