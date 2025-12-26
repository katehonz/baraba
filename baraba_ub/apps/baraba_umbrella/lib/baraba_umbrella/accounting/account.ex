defmodule BarabaUmbrella.Accounting.Account do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "accounts" do
    field :code, :string
    field :name, :string
    field :description, :string
    field :account_type, :string # ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    field :account_class, :string # CURRENT, NON_CURRENT, etc.
    field :level, :integer
    field :is_active, :boolean, default: true
    field :is_system, :boolean, default: false
    field :is_analytical, :boolean, default: false
    field :analytical_group, :string
    field :can_have_direct_entries, :boolean, default: false
    field :vat_applicable, :string, default: "NONE" # NONE, INPUT, OUTPUT, BOTH
    field :saft_account_code, :string
    field :saft_account_type, :string
    
    # Currency and quantities support
    field :is_multi_currency, :boolean, default: false
    field :is_quantity_tracked, :boolean, default: false
    field :default_unit, :string

    # Revaluation support
    field :is_revaluable, :boolean, default: false

    # Relationships
    belongs_to :company, BarabaUmbrella.Accounting.Company
    belongs_to :default_currency, BarabaUmbrella.Accounting.Currency
    has_many :debit_lines, BarabaUmbrella.Accounting.EntryLine, foreign_key: :debit_account_id
    has_many :credit_lines, BarabaUmbrella.Accounting.EntryLine, foreign_key: :credit_account_id
    has_many :child_accounts, __MODULE__, foreign_key: :parent_id
    belongs_to :parent_account, __MODULE__, foreign_key: :parent_id
    
    timestamps()
  end
  
  @doc false
  def changeset(account, attrs) do
    account
    |> cast(attrs, [
      :code, :name, :description, :account_type, :account_class, :level,
      :parent_id, :is_active, :is_system, :is_analytical, :analytical_group,
      :can_have_direct_entries, :vat_applicable, :saft_account_code,
      :saft_account_type, :is_multi_currency, :is_quantity_tracked,
      :default_unit, :company_id, :is_revaluable, :default_currency_id
    ])
    |> validate_required([:code, :name, :account_type, :company_id])
    |> validate_format(:code, ~r/^\d+(\.\d+)*$/, message: "must be numeric code with optional dots")
    |> validate_inclusion(:account_type, ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"])
    |> validate_inclusion(:vat_applicable, ["NONE", "INPUT", "OUTPUT", "BOTH"])
    |> unique_constraint([:code, :company_id])
    |> validate_hierarchy()
    |> assoc_constraint(:company)
  end
  
  # Validate that parent account exists and doesn't create circular references
  defp validate_hierarchy(changeset) do
    case get_field(changeset, :parent_id) do
      nil -> 
        changeset
      parent_id ->
        company_id = get_field(changeset, :company_id)
        id = get_field(changeset, :id)
        
        if parent_id == id do
          add_error(changeset, :parent_id, "cannot be self-reference")
        else
          # Additional validation could be added to check if parent_id belongs to same company
          changeset
        end
    end
  end
  
  def by_code(query \\ __MODULE__, code) do
    from q in query, where: q.code == ^code
  end
  
  def by_company(query \\ __MODULE__, company_id) do
    from q in query, where: q.company_id == ^company_id
  end
  
  def by_type(query \\ __MODULE__, type) do
    from q in query, where: q.account_type == ^type
  end
  
  def active(query \\ __MODULE__) do
    from q in query, where: q.is_active == true
  end
  
  def system(query \\ __MODULE__) do
    from q in query, where: q.is_system == true
  end
  
  def analytical(query \\ __MODULE__) do
    from q in query, where: q.is_analytical == true
  end
  
  def with_hierarchy(query \\ __MODULE__) do
    from q in query,
      left_join: parent in assoc(q, :parent_account),
      preload: [parent_account: parent]
  end
  
  def by_level(query \\ __MODULE__, level) do
    from q in query, where: q.level == ^level
  end
  
  def ordered(query \\ __MODULE__) do
    from q in query, order_by: [q.code]
  end

  def revaluable(query \\ __MODULE__) do
    from q in query, where: q.is_revaluable == true
  end

  def multi_currency(query \\ __MODULE__) do
    from q in query, where: q.is_multi_currency == true
  end
end