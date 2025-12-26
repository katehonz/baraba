defmodule BarabaUmbrella.Accounting.CurrencyRevaluation do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "currency_revaluations" do
    field :year, :integer
    field :month, :integer
    field :revaluation_date, :date
    field :status, :string, default: "PENDING"
    field :total_gains, :decimal, default: Decimal.new(0)
    field :total_losses, :decimal, default: Decimal.new(0)
    field :net_result, :decimal, default: Decimal.new(0)
    field :notes, :string
    field :posted_at, :utc_datetime

    belongs_to :company, BarabaUmbrella.Accounting.Company
    belongs_to :journal_entry, BarabaUmbrella.Accounting.JournalEntry
    belongs_to :created_by, BarabaUmbrella.Accounting.User
    belongs_to :posted_by, BarabaUmbrella.Accounting.User

    has_many :lines, BarabaUmbrella.Accounting.CurrencyRevaluationLine, foreign_key: :revaluation_id

    timestamps()
  end

  @doc false
  def changeset(revaluation, attrs) do
    revaluation
    |> cast(attrs, [
      :year, :month, :revaluation_date, :status, :total_gains, :total_losses,
      :net_result, :notes, :posted_at, :company_id, :journal_entry_id,
      :created_by_id, :posted_by_id
    ])
    |> validate_required([:year, :month, :revaluation_date, :company_id])
    |> validate_inclusion(:status, ["PENDING", "POSTED", "REVERSED"])
    |> validate_number(:year, greater_than: 1999, less_than: 2100)
    |> validate_number(:month, greater_than: 0, less_than: 13)
    |> unique_constraint([:company_id, :year, :month])
    |> assoc_constraint(:company)
  end

  # Query helpers
  def by_company(query \\ __MODULE__, company_id) do
    from q in query, where: q.company_id == ^company_id
  end

  def by_period(query \\ __MODULE__, year, month) do
    from q in query, where: q.year == ^year and q.month == ^month
  end

  def by_status(query \\ __MODULE__, status) do
    from q in query, where: q.status == ^status
  end

  def pending(query \\ __MODULE__) do
    from q in query, where: q.status == "PENDING"
  end

  def posted(query \\ __MODULE__) do
    from q in query, where: q.status == "POSTED"
  end

  def ordered_by_date(query \\ __MODULE__) do
    from q in query, order_by: [desc: q.year, desc: q.month]
  end

  def with_lines(query \\ __MODULE__) do
    from q in query, preload: [:lines]
  end
end
