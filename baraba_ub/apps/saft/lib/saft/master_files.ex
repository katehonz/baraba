defmodule Saft.MasterFiles do
  @moduledoc """
  Generates the MasterFiles section of SAF-T XML.
  """

  alias BarabaUmbrella.Accounting
  alias BarabaUmbrella.Repo
  import Ecto.Query

  def build(:monthly, company_id, opts) do
    accounts = get_accounts(company_id)
    vat_rates = get_vat_rates(company_id)
    products = get_products(company_id)
    
    """
    <nsSAFT:MasterFiles>
      #{generate_accounts_xml(accounts)}
      #{generate_vat_rates_xml(vat_rates)}
      #{generate_products_xml(products)}
    </nsSAFT:MasterFiles>
    """
  end

  def build(:on_demand, company_id, opts) do
    accounts = get_accounts(company_id)
    vat_rates = get_vat_rates(company_id)
    products = get_products(company_id)
    
    date_from = opts[:date_from]
    date_to = opts[:date_to]
    physical_stock = get_physical_stock(company_id, date_from, date_to)
    
    """
    <nsSAFT:MasterFiles>
      #{generate_accounts_xml(accounts)}
      #{generate_vat_rates_xml(vat_rates)}
      #{generate_products_xml(products)}
      #{generate_physical_stock_xml(physical_stock)}
    </nsSAFT:MasterFiles>
    """
  end

  def build(:annual, company_id, _opts) do
    # Annual reports would include fixed assets and asset transactions
    # For now, we'll include accounts and VAT rates
    accounts = get_accounts(company_id)
    vat_rates = get_vat_rates(company_id)
    # Products are not mandatory for annual if I recall correctly, but CSV says Mandatory for Monthly.
    # User asked to leave material records.
    
    """
    <nsSAFT:MasterFiles>
      #{generate_accounts_xml(accounts)}
      #{generate_vat_rates_xml(vat_rates)}
    </nsSAFT:MasterFiles>
    """
  end

  defp get_accounts(company_id) do
    from(a in "accounts",
      where: a.company_id == ^company_id,
      select: %{
        id: a.id,
        code: a.code,
        name: a.name,
        description: a.description,
        account_type: a.account_type,
        account_class: a.account_class,
        level: a.level,
        is_active: a.is_active,
        is_analytical: a.is_analytical,
        analytical_group: a.analytical_group,
        can_have_direct_entries: a.can_have_direct_entries,
        saft_account_code: a.saft_account_code,
        saft_account_type: a.saft_account_type,
        is_multi_currency: a.is_multi_currency,
        is_quantity_tracked: a.is_quantity_tracked,
        default_unit: a.default_unit
      }
    )
    |> Repo.all()
  end

  defp get_vat_rates(company_id) do
    from(vr in "vat_rates",
      where: vr.company_id == ^company_id and vr.is_active == true,
      select: %{
        id: vr.id,
        name: vr.name,
        percentage: vr.percentage,
        description: vr.description,
        effective_from: vr.effective_from,
        effective_to: vr.effective_to,
        vat_code: vr.vat_code,
        saft_tax_type: vr.saft_tax_type,
        is_reverse_charge_applicable: vr.is_reverse_charge_applicable,
        is_intrastat_applicable: vr.is_intrastat_applicable
      }
    )
    |> Repo.all()
  end

  defp get_products(company_id) do
    from(p in "products",
      where: p.company_id == ^company_id,
      select: %{
        product_code: p.product_code,
        type: p.type,
        product_group: p.product_group,
        description: p.description,
        commodity_code: p.commodity_code,
        ean_code: p.ean_code,
        valuation_method: p.valuation_method,
        uom_base: p.uom_base,
        uom_standard: p.uom_standard,
        uom_conversion_factor: p.uom_conversion_factor,
        tax_type: p.tax_type,
        tax_code: p.tax_code
      }
    )
    |> Repo.all()
  end

  defp get_physical_stock(company_id, date_from, date_to) do
    from(sl in "stock_levels",
      where: sl.company_id == ^company_id and sl.period_start == ^date_from and sl.period_end == ^date_to,
      select: %{
        warehouse_id: sl.warehouse_id,
        location_id: sl.location_id,
        product_code: sl.product_code,
        product_type: sl.product_type,
        uom: sl.uom_physical_stock,
        unit_price_begin: sl.unit_price_begin,
        unit_price_end: sl.unit_price_end,
        opening_qty: sl.opening_stock_quantity,
        opening_value: sl.opening_stock_value,
        closing_qty: sl.closing_stock_quantity,
        closing_value: sl.closing_stock_value,
        owner_id: sl.owner_id
      }
    )
    |> Repo.all()
  end

  defp generate_accounts_xml(accounts) do
    account_xmls = Enum.map(accounts, fn account ->
      """
      <nsSAFT:Account>
        <nsSAFT:AccountID>#{account[:id]}</nsSAFT:AccountID>
        <nsSAFT:AccountCode>#{account[:code]}</nsSAFT:AccountCode>
        <nsSAFT:AccountDescription>#{account[:name]}</nsSAFT:AccountDescription>
        <nsSAFT:AccountType>#{map_account_type(account[:account_type])}</nsSAFT:AccountType>
        <nsSAFT:AccountClassification>#{account[:account_class] || ""}</nsSAFT:AccountClassification>
        <nsSAFT:AccountLevel>#{account[:level] || 1}</nsSAFT:AccountLevel>
        <nsSAFT:AccountStatus>#{if account[:is_active], do: "1", else: "0"}</nsSAFT:AccountStatus>
        <nsSAFT:Analytical>#{if account[:is_analytical], do: "1", else: "0"}</nsSAFT:Analytical>
        <nsSAFT:AnalyticalCode>#{account[:analytical_group] || ""}</nsSAFT:AnalyticalCode>
        <nsSAFT:NonDirectEntryAllowed>#{if account[:can_have_direct_entries], do: "0", else: "1"}</nsSAFT:NonDirectEntryAllowed>
        <nsSAFT:SAFTAccountID>#{account[:saft_account_code] || ""}</nsSAFT:SAFTAccountID>
        <nsSAFT:SAFTAccountType>#{account[:saft_account_type] || ""}</nsSAFT:SAFTAccountType>
        <nsSAFT:MultiCurrency>#{if account[:is_multi_currency], do: "1", else: "0"}</nsSAFT:MultiCurrency>
        <nsSAFT:Quantity>#{if account[:is_quantity_tracked], do: "1", else: "0"}</nsSAFT:Quantity>
        <nsSAFT:DefaultUnit>#{account[:default_unit] || ""}</nsSAFT:DefaultUnit>
      </nsSAFT:Account>
      """
    end)
    
    """
    <nsSAFT:ChartOfAccounts>
      #{Enum.join(account_xmls, "")}
    </nsSAFT:ChartOfAccounts>
    """
  end

  defp generate_vat_rates_xml(vat_rates) do
    vat_rate_xmls = Enum.map(vat_rates, fn vat_rate ->
      """
      <nsSAFT:TaxCode>
        <nsSAFT:TaxCodeID>#{vat_rate[:id]}</nsSAFT:TaxCodeID>
        <nsSAFT:TaxCodeDescription>#{vat_rate[:name]}</nsSAFT:TaxCodeDescription>
        <nsSAFT:TaxPercentage>#{vat_rate[:percentage]}</nsSAFT:TaxPercentage>
        <nsSAFT:TaxType>#{map_vat_type(vat_rate[:saft_tax_type])}</nsSAFT:TaxType>
        <nsSAFT:EffectiveFrom>#{format_date(vat_rate[:effective_from])}</nsSAFT:EffectiveFrom>
        #{if vat_rate[:effective_to], do: "<nsSAFT:EffectiveTo>#{format_date(vat_rate[:effective_to])}</nsSAFT:EffectiveTo>", else: ""}
      </nsSAFT:TaxCode>
      """
    end)
    
    """
    <nsSAFT:TaxCodeTable>
      #{Enum.join(vat_rate_xmls, "")}
    </nsSAFT:TaxCodeTable>
    """
  end

  defp generate_products_xml(products) do
    product_xmls = Enum.map(products, fn product ->
      """
      <nsSAFT:Product>
        <nsSAFT:ProductCode>#{product[:product_code]}</nsSAFT:ProductCode>
        <nsSAFT:GoodsServicesID>#{map_product_type(product[:type])}</nsSAFT:GoodsServicesID>
        #{if product[:product_group], do: "<nsSAFT:ProductGroup>#{product[:product_group]}</nsSAFT:ProductGroup>", else: ""}
        <nsSAFT:Description>#{product[:description]}</nsSAFT:Description>
        <nsSAFT:ProductCommodityCode>#{product[:commodity_code] || "0"}</nsSAFT:ProductCommodityCode>
        #{if product[:ean_code], do: "<nsSAFT:ProductNumberCode>#{product[:ean_code]}</nsSAFT:ProductNumberCode>", else: ""}
        #{if product[:valuation_method], do: "<nsSAFT:ValuationMethod>#{product[:valuation_method]}</nsSAFT:ValuationMethod>", else: ""}
        <nsSAFT:UOMBase>#{product[:uom_base]}</nsSAFT:UOMBase>
        <nsSAFT:UOMStandard>#{product[:uom_standard]}</nsSAFT:UOMStandard>
        <nsSAFT:UOMToUOMBaseConversionFactor>#{format_amount(product[:uom_conversion_factor])}</nsSAFT:UOMToUOMBaseConversionFactor>
        <nsSAFT:Tax>
          <nsSAFT:TaxType>#{product[:tax_type]}</nsSAFT:TaxType>
          <nsSAFT:TaxCode>#{product[:tax_code]}</nsSAFT:TaxCode>
        </nsSAFT:Tax>
      </nsSAFT:Product>
      """
    end)

    """
    <nsSAFT:Products>
      #{Enum.join(product_xmls, "")}
    </nsSAFT:Products>
    """
  end

  defp generate_physical_stock_xml(physical_stock) do
    stock_xmls = Enum.map(physical_stock, fn stock ->
      """
      <nsSAFT:PhysicalStockEntry>
        <nsSAFT:WarehouseID>#{stock[:warehouse_id]}</nsSAFT:WarehouseID>
        #{if stock[:location_id], do: "<nsSAFT:LocationID>#{stock[:location_id]}</nsSAFT:LocationID>", else: ""}
        <nsSAFT:ProductCode>#{stock[:product_code]}</nsSAFT:ProductCode>
        <nsSAFT:ProductType>#{stock[:product_type]}</nsSAFT:ProductType>
        <nsSAFT:OwnerID>#{stock[:owner_id] || ""}</nsSAFT:OwnerID>
        #{if stock[:uom], do: "<nsSAFT:UOMPhysicalStock>#{stock[:uom]}</nsSAFT:UOMPhysicalStock>", else: ""}
        <nsSAFT:UnitPriceBegin>#{format_amount(stock[:unit_price_begin])}</nsSAFT:UnitPriceBegin>
        <nsSAFT:UnitPriceEnd>#{format_amount(stock[:unit_price_end])}</nsSAFT:UnitPriceEnd>
        <nsSAFT:OpeningStockQuantity>#{format_amount(stock[:opening_qty])}</nsSAFT:OpeningStockQuantity>
        <nsSAFT:OpeningStockValue>#{format_amount(stock[:opening_value])}</nsSAFT:OpeningStockValue>
        <nsSAFT:ClosingStockQuantity>#{format_amount(stock[:closing_qty])}</nsSAFT:ClosingStockQuantity>
        <nsSAFT:ClosingStockValue>#{format_amount(stock[:closing_value])}</nsSAFT:ClosingStockValue>
      </nsSAFT:PhysicalStockEntry>
      """
    end)

    """
    <nsSAFT:PhysicalStock>
      #{Enum.join(stock_xmls, "")}
    </nsSAFT:PhysicalStock>
    """
  end

  defp map_account_type("ASSET"), do: "1"
  defp map_account_type("LIABILITY"), do: "2"
  defp map_account_type("EQUITY"), do: "3"
  defp map_account_type("REVENUE"), do: "4"
  defp map_account_type("EXPENSE"), do: "5"
  defp map_account_type(_), do: "1"

  defp map_vat_type("VAT"), do: "IE"
  defp map_vat_type("VAT_EXEMPT"), do: "NS"
  defp map_vat_type("INTRA"), do: "IM"
  defp map_vat_type("REVERSE_CHARGE"), do: "RC"
  defp map_vat_type(_), do: "NS"

  defp map_product_type("PRODUCT"), do: "01"
  defp map_product_type("SERVICE"), do: "02"
  defp map_product_type(_), do: "01"

  defp format_amount(nil), do: "0"
  defp format_amount(decimal) when is_map(decimal) do
    case Map.get(decimal, :__decimal__) do
      nil -> "0"
      _ -> Decimal.to_string(decimal, :normal)
    end
  end
  defp format_amount(number) when is_number(number) do
    to_string(number)
  end
  defp format_amount(_), do: "0"

  defp format_date(%Date{year: year, month: month, day: day}) do
    "#{year}-#{String.pad_leading(to_string(month), 2, "0")}-#{String.pad_leading(to_string(day), 2, "0")}"
  end
end