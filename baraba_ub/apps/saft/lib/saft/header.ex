defmodule Saft.Header do
  @moduledoc """
  Generates the Header section of SAF-T XML.
  """

  @namespace "mf:nra:dgti:dxxxx:declaration:v1"
  @schema_version "007"
  @country "BG"

  def build(type, company, opts \\ []) do
    audit_file_code = audit_file_code(type, opts)
    start_date = start_date(type, opts)
    end_date = end_date(type, opts)
    
    header = %{
      audit_file_code: audit_file_code,
      audit_file_version: "1.0",
      company_id: company[:id],
      tax_registration_number: company[:vat_number],
      tax_entity: tax_entity(company),
      company_name: company[:name],
      company_address: company[:address],
      company_fiscal_year: fiscal_year(opts),
      company_tax_entity: tax_entity(company),
      date_start: start_date,
      date_end: end_date,
      product_code: "PT",
      product_version: "1.0.1",
      currency_code: company[:default_currency],
      date_created: DateTime.to_iso8601(DateTime.utc_now()),
      tax_entity_id: company[:eik],
      tax_registration: tax_registration(company),
      telephone_number: company[:phone],
      email: company[:email],
      contact_person: company[:contact_name],
      country: @country,
      region_code: company[:region_code] || "22",
      tax_basis: company[:tax_basis] || "A",
      owner_name: company[:owner_name],
      owner_egn: company[:owner_egn],
      software_validation: false,
      software_company_name: "Baraba ERP",
      software_id: "BARABA2023",
      software_version: "1.0.0"
    }
    
    generate_header_xml(header)
  end

  defp audit_file_code(:monthly, _opts), do: "1"
  defp audit_file_code(:annual, _opts), do: "2"
  defp audit_file_code(:on_demand, _opts), do: "3"

  defp start_date(:monthly, opts) do
    year = Keyword.get(opts, :year)
    month = Keyword.get(opts, :month)
    "#{year}-#{String.pad_leading(to_string(month), 2, "0")}-01"
  end

  defp start_date(:on_demand, opts) do
    opts[:date_from] |> to_string()
  end

  defp start_date(:annual, opts) do
    year = Keyword.get(opts, :year)
    "#{year}-01-01"
  end

  defp end_date(:monthly, opts) do
    year = Keyword.get(opts, :year)
    month = Keyword.get(opts, :month)
    
    # Get last day of month
    last_day = :calendar.last_day_of_the_month(year, month)
    "#{year}-#{String.pad_leading(to_string(month), 2, "0")}-#{String.pad_leading(to_string(last_day), 2, "0")}"
  end

  defp end_date(:on_demand, opts) do
    opts[:date_to] |> to_string()
  end

  defp end_date(:annual, opts) do
    year = Keyword.get(opts, :year)
    "#{year}-12-31"
  end

  defp fiscal_year(opts) do
    cond do
      year = Keyword.get(opts, :year) -> to_string(year)
      date = Keyword.get(opts, :date_to) -> to_string(date.year)
      true -> to_string(Date.utc_today().year)
    end
  end

  defp tax_entity(company) do
    if company[:is_vat_registered] do
      "IE"
    else
      "IS"
    end
  end

  defp tax_registration(company) do
    if company[:is_vat_registered] do
      "IE"
    else
      "IS"
    end
  end

  defp generate_header_xml(header) do
    """
    <nsSAFT:Header>
      <nsSAFT:AuditFileVersion>1.0</nsSAFT:AuditFileVersion>
      <nsSAFT:AuditFileCode>#{header[:audit_file_code]}</nsSAFT:AuditFileCode>
      <nsSAFT:AuditFileVersion>#{header[:audit_file_version]}</nsSAFT:AuditFileVersion>
      <nsSAFT:CompanyID>#{header[:company_id]}</nsSAFT:CompanyID>
      <nsSAFT:TaxRegistrationNumber>#{header[:tax_registration_number]}</nsSAFT:TaxRegistrationNumber>
      <nsSAFT:TaxEntity>#{header[:tax_entity]}</nsSAFT:TaxEntity>
      <nsSAFT:CompanyName>#{header[:company_name]}</nsSAFT:CompanyName>
      <nsSAFT:CompanyAddress>
        <nsSAFT:AddressDetail>#{header[:company_address][:street]}</nsSAFT:AddressDetail>
        <nsSAFT:City>#{header[:company_address][:city]}</nsSAFT:City>
        <nsSAFT:PostalCode>#{header[:company_address][:postal_code]}</nsSAFT:PostalCode>
        <nsSAFT:Country>#{header[:company_address][:country]}</nsSAFT:Country>
      </nsSAFT:CompanyAddress>
      <nsSAFT:CompanyFiscalYear>#{header[:company_fiscal_year]}</nsSAFT:CompanyFiscalYear>
      <nsSAFT:CompanyTaxEntity>#{header[:company_tax_entity]}</nsSAFT:CompanyTaxEntity>
      <nsSAFT:DateStart>#{header[:date_start]}</nsSAFT:DateStart>
      <nsSAFT:DateEnd>#{header[:date_end]}</nsSAFT:DateEnd>
      <nsSAFT:ProductCode>#{header[:product_code]}</nsSAFT:ProductCode>
      <nsSAFT:ProductVersion>#{header[:product_version]}</nsSAFT:ProductVersion>
      <nsSAFT:CurrencyCode>#{header[:currency_code]}</nsSAFT:CurrencyCode>
      <nsSAFT:DateCreated>#{header[:date_created]}</nsSAFT:DateCreated>
      <nsSAFT:TaxEntityID>#{header[:tax_entity_id]}</nsSAFT:TaxEntityID>
      <nsSAFT:TaxRegistration>#{header[:tax_registration]}</nsSAFT:TaxRegistration>
      <nsSAFT:TelephoneNumber>#{header[:telephone_number]}</nsSAFT:TelephoneNumber>
      <nsSAFT:Email>#{header[:email]}</nsSAFT:Email>
      <nsSAFT:ContactPerson>#{header[:contact_person]}</nsSAFT:ContactPerson>
      <nsSAFT:Country>#{header[:country]}</nsSAFT:Country>
      <nsSAFT:RegionCode>#{header[:region_code]}</nsSAFT:RegionCode>
      <nsSAFT:TaxBasis>#{header[:tax_basis]}</nsSAFT:TaxBasis>
      <nsSAFT:OwnerName>#{header[:owner_name]}</nsSAFT:OwnerName>
      <nsSAFT:OwnerEGN>#{header[:owner_egn]}</nsSAFT:OwnerEGN>
      <nsSAFT:SoftwareValidation>#{header[:software_validation]}</nsSAFT:SoftwareValidation>
      <nsSAFT:SoftwareCompanyName>#{header[:software_company_name]}</nsSAFT:SoftwareCompanyName>
      <nsSAFT:SoftwareID>#{header[:software_id]}</nsSAFT:SoftwareID>
      <nsSAFT:SoftwareVersion>#{header[:software_version]}</nsSAFT:SoftwareVersion>
    </nsSAFT:Header>
    """
  end
end