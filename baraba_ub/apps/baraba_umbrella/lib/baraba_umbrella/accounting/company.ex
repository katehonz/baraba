defmodule BarabaUmbrella.Accounting.Company do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "companies" do
    field :name, :string
    field :eik, :string
    field :vat_number, :string
    field :address, :string
    field :city, :string
    field :country, :string
    field :post_code, :string
    field :phone, :string
    field :email, :string
    field :website, :string
    
    # Account ID references for default accounts
    field :cash_account_id, :binary_id
    field :bank_account_id, :binary_id
    field :customers_account_id, :binary_id
    field :suppliers_account_id, :binary_id
    field :vat_payable_account_id, :binary_id
    field :vat_receivable_account_id, :binary_id
    field :expenses_account_id, :binary_id
    field :revenues_account_id, :binary_id
    
    # Company settings
    field :is_vat_registered, :boolean, default: false
    field :is_intrastat_registered, :boolean, default: false
    field :nap_office, :string
    field :vat_period, :string, default: "monthly" # monthly, quarterly
    field :currency, :string, default: "EUR"
    field :fiscal_year_start_month, :integer, default: 1
    field :representative_type, :string # MANAGER, AUTHORIZED_PERSON
    field :representative_name, :string
    field :representative_eik, :string
    
    # Integration flags
    field :saltedge_enabled, :boolean, default: false
    field :ai_scanning_enabled, :boolean, default: false
    field :vies_validation_enabled, :boolean, default: true

    # Azure Document Intelligence credentials
    field :azure_di_endpoint, :string
    field :azure_di_api_key, :string

    # Salt Edge Open Banking credentials
    field :saltedge_app_id, :string
    field :saltedge_secret, :string

    # Currency revaluation configuration
    field :fx_gains_account_id, :binary_id
    field :fx_losses_account_id, :binary_id

    # S3 Storage configuration (Hetzner Object Storage)
    field :s3_enabled, :boolean, default: false
    field :s3_bucket, :string
    field :s3_region, :string
    field :s3_endpoint, :string
    field :s3_access_key, :string
    field :s3_secret_key, :string
    field :s3_folder_prefix, :string

    # Relationships
    has_many :accounts, BarabaUmbrella.Accounting.Account
    has_many :journal_entries, BarabaUmbrella.Accounting.JournalEntry
    has_many :counterparts, BarabaUmbrella.Accounting.Counterpart
    has_many :vat_rates, BarabaUmbrella.Accounting.VatRate
    has_many :fixed_assets, BarabaUmbrella.Accounting.FixedAsset
    
    timestamps()
  end
  
  @doc false
  def changeset(company, attrs) do
    company
    |> cast(attrs, [
      :name, :eik, :vat_number, :address, :city, :country, :post_code,
      :phone, :email, :website, :cash_account_id, :bank_account_id,
      :customers_account_id, :suppliers_account_id, :vat_payable_account_id,
      :vat_receivable_account_id, :expenses_account_id, :revenues_account_id,
      :is_vat_registered, :is_intrastat_registered, :nap_office, :vat_period,
      :currency, :fiscal_year_start_month, :representative_type,
      :representative_name, :representative_eik, :saltedge_enabled,
      :ai_scanning_enabled, :vies_validation_enabled,
      :fx_gains_account_id, :fx_losses_account_id,
      :azure_di_endpoint, :azure_di_api_key,
      :saltedge_app_id, :saltedge_secret,
      :s3_enabled, :s3_bucket, :s3_region, :s3_endpoint,
      :s3_access_key, :s3_secret_key, :s3_folder_prefix
    ])
    |> validate_required([:name, :eik])
    |> validate_format(:eik, ~r/^\d{9}$/)
    |> validate_format(:vat_number, ~r/^BG\d{9,10}$/, message: "must be in format BG followed by 9 or 10 digits")
    |> unique_constraint(:eik)
    |> unique_constraint(:vat_number)
  end
  
  def by_name(query \\ __MODULE__) do
    from q in query, order_by: q.name
  end
  
  def by_eik(query \\ __MODULE__, eik) do
    from q in query, where: q.eik == ^eik
  end
  
  def vat_registered(query \\ __MODULE__) do
    from q in query, where: q.is_vat_registered == true
  end
end