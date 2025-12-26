defmodule BarabaUmbrellaWeb.CompanyJSON do
  alias BarabaUmbrella.Accounting.Company
  
  @doc """
  Renders a list of companies.
  """
  def index(%{companies: companies}) do
    %{data: for(company <- companies, do: data(company))}
  end
  
  @doc """
  Renders a single company.
  """
  def show(%{company: company}) do
    %{data: data(company)}
  end
  
  @doc """
  Renders error for changeset.
  """
  def error(%{changeset: changeset}) do
    %{
      errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)
    }
  end
  
  defp data(%Company{} = company) do
    %{
      id: company.id,
      name: company.name,
      eik: company.eik,
      vat_number: company.vat_number,
      address: company.address,
      city: company.city,
      country: company.country,
      post_code: company.post_code,
      phone: company.phone,
      email: company.email,
      website: company.website,
      is_vat_registered: company.is_vat_registered,
      is_intrastat_registered: company.is_intrastat_registered,
      nap_office: company.nap_office,
      vat_period: company.vat_period,
      currency: company.currency,
      fiscal_year_start_month: company.fiscal_year_start_month,
      representative_type: company.representative_type,
      representative_name: company.representative_name,
      representative_eik: company.representative_eik,
      saltedge_enabled: company.saltedge_enabled,
      ai_scanning_enabled: company.ai_scanning_enabled,
      vies_validation_enabled: company.vies_validation_enabled,
      # Account IDs for default accounts
      cash_account_id: company.cash_account_id,
      bank_account_id: company.bank_account_id,
      customers_account_id: company.customers_account_id,
      suppliers_account_id: company.suppliers_account_id,
      vat_payable_account_id: company.vat_payable_account_id,
      vat_receivable_account_id: company.vat_receivable_account_id,
      expenses_account_id: company.expenses_account_id,
      revenues_account_id: company.revenues_account_id,
      # Integration credentials (masked for security)
      azure_di_endpoint: company.azure_di_endpoint,
      azure_di_api_key_configured: not is_nil(company.azure_di_api_key) and company.azure_di_api_key != "",
      saltedge_app_id: company.saltedge_app_id,
      saltedge_secret_configured: not is_nil(company.saltedge_secret) and company.saltedge_secret != "",
      # S3 Storage configuration
      s3_enabled: company.s3_enabled,
      s3_bucket: company.s3_bucket,
      s3_region: company.s3_region,
      s3_endpoint: company.s3_endpoint,
      s3_access_key: company.s3_access_key,
      s3_secret_key_configured: not is_nil(company.s3_secret_key) and company.s3_secret_key != "",
      s3_folder_prefix: company.s3_folder_prefix,
      inserted_at: company.inserted_at,
      updated_at: company.updated_at
    }
  end
  
  # Define translate_error/1 function or import from appropriate module
  defp translate_error({msg, opts}) do
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", to_string(value))
    end)
  end
end