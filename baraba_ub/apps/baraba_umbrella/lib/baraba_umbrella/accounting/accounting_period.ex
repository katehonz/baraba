defmodule BarabaUmbrella.Accounting.AccountingPeriod do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "accounting_periods" do
    field(:year, :integer)
    field(:month, :integer)
    field(:status, :string, default: "OPEN")
    field(:closed_at, :utc_datetime)
    field(:notes, :string)

    belongs_to(:company, BarabaUmbrella.Accounting.Company)
    belongs_to(:closed_by, BarabaUmbrella.Accounting.User)

    timestamps()
  end

  @doc false
  def changeset(accounting_period, attrs) do
    accounting_period
    |> cast(attrs, [:year, :month, :status, :closed_at, :notes, :company_id])
    |> validate_required([:year, :month, :status, :company_id])
    |> validate_inclusion(:status, ["OPEN", "CLOSED"])
    |> validate_year()
    |> validate_month()
    |> unique_constraint([:company_id, :year, :month])
    |> assoc_constraint(:company)
    |> assoc_constraint(:closed_by)
  end

  defp validate_year(changeset) do
    validate_number(changeset, :year, greater_than: 1999, less_than: 2100)
  end

  defp validate_month(changeset) do
    validate_number(changeset, :month, greater_than: 0, less_than: 13)
  end

  def by_company(query \\ __MODULE__, company_id) do
    from(q in query, where: q.company_id == ^company_id)
  end

  def by_year(query \\ __MODULE__, year) do
    from(q in query, where: q.year == ^year)
  end

  def by_month(query \\ __MODULE__, month) do
    from(q in query, where: q.month == ^month)
  end

  def open(query \\ __MODULE__) do
    from(q in query, where: q.status == "OPEN")
  end

  def closed(query \\ __MODULE__) do
    from(q in query, where: q.status == "CLOSED")
  end

  def for_date(query \\ __MODULE__, date) do
    from(q in query,
      where: q.year == ^date.year and q.month == ^date.month
    )
  end

  def ordered_by_date(query \\ __MODULE__) do
    from(q in query, order_by: [desc: q.year, desc: q.month])
  end
end
