defmodule BarabaUmbrella.Accounting.User do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :email, :string
    field :password_hash, :string
    field :first_name, :string
    field :last_name, :string
    field :phone, :string
    field :role, :string, default: "user" # admin, accountant, user
    field :is_active, :boolean, default: true
    field :last_login_at, :utc_datetime
    field :password_reset_token, :string
    field :password_reset_expires_at, :utc_datetime
    field :email_verified_at, :utc_datetime
    
    # Relationships
    has_many :posted_entries, BarabaUmbrella.Accounting.JournalEntry, foreign_key: :posted_by_id
    has_many :created_entries, BarabaUmbrella.Accounting.JournalEntry, foreign_key: :created_by_id
    
    timestamps()
  end
  
  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [
      :email, :password_hash, :first_name, :last_name, :phone, :role,
      :is_active, :last_login_at, :password_reset_token,
      :password_reset_expires_at, :email_verified_at
    ])
    |> validate_required([:email, :role])
    |> validate_format(:email, ~r/@/)
    |> validate_inclusion(:role, ["admin", "accountant", "user"])
    |> unique_constraint(:email)
  end
  
  def by_email(query \\ __MODULE__, email) do
    from q in query, where: q.email == ^email
  end
  
  def active(query \\ __MODULE__) do
    from q in query, where: q.is_active == true
  end
  
  def by_role(query \\ __MODULE__, role) do
    from q in query, where: q.role == ^role
  end
  
  def with_last_login(query \\ __MODULE__) do
    from q in query, where: not is_nil(q.last_login_at)
  end
end