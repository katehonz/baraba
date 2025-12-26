defmodule Saft do
  @moduledoc """
  SAF-T (Standard Audit File for Tax) за България.
  BG Schema V 1.0.1 - без материални запаси (2027).

  ## Видове отчети
  - **Месечен (Monthly)** - MasterFiles + GeneralLedgerEntries + SourceDocuments
  - **Годишен (Annual)** - Assets + AssetTransactions
  """

  alias Saft.{Header, MasterFiles, GeneralLedgerEntries, SourceDocuments}
  alias BarabaUmbrella.Repo
  alias BarabaUmbrella.Accounting

  @namespace "mf:nra:dgti:dxxxx:declaration:v1"
  @schema_version "007"
  @country "BG"

  @type report_type :: :monthly | :annual | :on_demand
  @type generation_result :: {:ok, String.t()} | {:error, term()}

  def namespace, do: @namespace
  def schema_version, do: @schema_version
  def country, do: @country

  @spec generate(report_type(), binary(), keyword()) :: generation_result()
  def generate(type, company_id, opts \\ [])

  def generate(:monthly, company_id, opts) do
    with {:ok, company} <- get_company(company_id),
         {:ok, year} <- get_required_opt(opts, :year),
         {:ok, month} <- get_required_opt(opts, :month),
         {:ok, header} <- Header.build(:monthly, company, year: year, month: month),
         {:ok, master_files} <- MasterFiles.build(:monthly, company_id, year: year, month: month),
         {:ok, gl_entries} <- GeneralLedgerEntries.build(company_id, year: year, month: month),
         {:ok, source_docs} <- SourceDocuments.build(:monthly, company_id, year: year, month: month) do
      xml = build_xml_document([header, master_files, gl_entries, source_docs])
      {:ok, xml}
    end
  end

  def generate(:on_demand, company_id, opts) do
    with {:ok, company} <- get_company(company_id),
         {:ok, date_from} <- get_required_opt(opts, :date_from),
         {:ok, date_to} <- get_required_opt(opts, :date_to),
         {:ok, header} <- Header.build(:on_demand, company, date_from: date_from, date_to: date_to),
         {:ok, master_files} <- MasterFiles.build(:on_demand, company_id, date_from: date_from, date_to: date_to),
         {:ok, gl_entries} <- GeneralLedgerEntries.build(company_id, date_from: date_from, date_to: date_to),
         {:ok, source_docs} <- SourceDocuments.build(:on_demand, company_id, date_from: date_from, date_to: date_to) do
      xml = build_xml_document([header, master_files, gl_entries, source_docs])
      {:ok, xml}
    end
  end

  def generate(:annual, company_id, opts) do
    with {:ok, company} <- get_company(company_id),
         {:ok, year} <- get_required_opt(opts, :year),
         {:ok, header} <- Header.build(:annual, company, year: year),
         {:ok, master_files} <- MasterFiles.build(:annual, company_id, year: year),
         {:ok, source_docs} <- SourceDocuments.build(:annual, company_id, year: year) do
      xml = build_xml_document([header, master_files, source_docs])
      {:ok, xml}
    end
  end

  def export(type, company_id, file_path, opts \\ []) do
    with {:ok, xml} <- generate(type, company_id, opts) do
      File.write(file_path, xml)
    end
  end

  def validate_xml(xml_content) do
    xsd_path = Path.join(:code.priv_dir(:saft), "saft/BG_SAFT_Schema_V_1.0.1.xsd")

    case File.exists?(xsd_path) do
      true ->
        case :erlsom.compile_xsd_file(to_charlist(xsd_path)) do
          {:ok, model} ->
            case :erlsom.scan(to_charlist(xml_content), model) do
              {:ok, _structure, _rest} -> {:ok, :valid}
              {:error, reason, _} -> {:error, reason}
            end
          {:error, reason} -> {:error, reason}
        end
      false ->
        {:error, :xsd_not_found}
    end
  end

  # Private

  defp get_company(company_id) do
    import Ecto.Query

    case Accounting.get_company!(company_id) do
      nil -> {:error, :company_not_found}
      company -> {:ok, normalize_company(company)}
    end
  rescue
    Ecto.NoResultsError -> {:error, :company_not_found}
  end

  defp normalize_company(company) do
    %{
      id: company.id,
      name: company.name,
      eik: company.eik,
      vat_number: company.vat_number,
      is_vat_registered: company.is_vat_registered,
      address: %{
        street: company.address || "",
        city: company.city || "",
        postal_code: company.post_code || "",
        country: company.country || "BG"
      },
      phone: company.phone,
      email: company.email,
      contact_name: company.representative_name,
      iban: nil, # Would need to be added to company schema
      default_currency: company.currency || "EUR",
      region_code: "22",
      tax_basis: "A",
      owner_name: company.representative_name,
      owner_egn: nil
    }
  end

  defp get_required_opt(opts, key) do
    case Keyword.fetch(opts, key) do
      {:ok, value} -> {:ok, value}
      :error -> {:error, {:missing_option, key}}
    end
  end

  defp build_xml_document(elements) do
    content = Enum.join(elements, "\n")

    """
    <?xml version="1.0" encoding="utf-8"?>
    <nsSAFT:AuditFile xmlns:doc="urn:schemas-OECD:schema-extensions:documentation" xml:lang=en" xmlns:nsSAFT="#{@namespace}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    #{content}
    </nsSAFT:AuditFile>
    """
  end
end