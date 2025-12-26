defmodule BarabaUmbrella.Accounting.VatRate do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "vat_rates" do
    field :name, :string
    field :percentage, :decimal
    field :description, :string
    field :is_active, :boolean, default: true
    field :effective_from, :date
    field :effective_to, :date
    field :vat_code, :string
    field :saft_tax_type, :string
    field :is_reverse_charge_applicable, :boolean, default: false
    field :is_intrastat_applicable, :boolean, default: false
    
    # Relationships
    belongs_to :company, BarabaUmbrella.Accounting.Company
    has_many :entry_lines, BarabaUmbrella.Accounting.EntryLine
    
    timestamps()
  end
  
  @doc false
  def changeset(vat_rate, attrs) do
    vat_rate
    |> cast(attrs, [
      :name, :percentage, :description, :is_active, :effective_from,
      :effective_to, :vat_code, :saft_tax_type, :is_reverse_charge_applicable,
      :is_intrastat_applicable, :company_id
    ])
    |> validate_required([:name, :percentage, :effective_from, :company_id])
    |> validate_number(:percentage, greater_than_or_equal_to: 0, less_than_or_equal_to: 100)
    |> validate_effective_period()
    |> unique_constraint([:name, :company_id])
    |> assoc_constraint(:company)
  end
  
  defp validate_effective_period(changeset) do
    effective_from = get_field(changeset, :effective_from)
    effective_to = get_field(changeset, :effective_to)
    
    cond do
      effective_to && effective_from && Date.compare(effective_from, effective_to) == :gt ->
        add_error(changeset, :effective_from, "cannot be later than effective_to")
      
      effective_to && Date.compare(effective_to, Date.utc_today()) == :lt ->
        add_error(changeset, :effective_to, "cannot be in the past")
      
      true ->
        changeset
    end
  end
  
  def by_company(query \\ __MODULE__, company_id) do
    from q in query, where: q.company_id == ^company_id
  end
  
  def active(query \\ __MODULE__) do
    current_date = Date.utc_today()
    from q in query, 
      where: q.is_active == true and
             q.effective_from <= ^current_date and
             (is_nil(q.effective_to) or q.effective_to >= ^current_date)
  end
  
  def currently_applicable(query \\ __MODULE__) do
    current_date = Date.utc_today()
    from q in query, 
      where: q.effective_from <= ^current_date and
             (is_nil(q.effective_to) or q.effective_to >= ^current_date)
  end
  
  def by_percentage(query \\ __MODULE__, percentage) do
    from q in query, where: q.percentage == ^percentage
  end
  
  def by_vat_code(query \\ __MODULE__, vat_code) do
    from q in query, where: q.vat_code == ^vat_code
  end
  
  def ordered(query \\ __MODULE__) do
    from q in query, order_by: q.percentage
  end
  
  def standard_rates(query \\ __MODULE__) do
    # Standard Bulgarian VAT rates (this could be configurable per company)
    from q in query, where: q.percentage in [0, 9, 20]
  end
  
  def zero_rated(query \\ __MODULE__) do
    from q in query, where: q.percentage == 0
  end
  
  def reduced_rates(query \\ __MODULE__) do
    from q in query, where: q.percentage > 0 and q.percentage < 20
  end
  
  def standard_rate(query \\ __MODULE__) do
    from q in query, where: q.percentage == 20
  end
  
  def reverse_charge_applicable(query \\ __MODULE__) do
    from q in query, where: q.is_reverse_charge_applicable == true
  end
  
  def intrastat_applicable(query \\ __MODULE__) do
    from q in query, where: q.is_intrastat_applicable == true
  end
  
  def with_company(query \\ __MODULE__) do
    from q in query,
      preload: [:company]
  end
end