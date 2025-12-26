defmodule Saft.SourceDocuments do
  @moduledoc """
  Generates the SourceDocuments section of SAF-T XML for invoices and other documents.
  """

  alias BarabaUmbrella.Accounting
  alias BarabaUmbrella.Repo
  import Ecto.Query

  def build(:monthly, company_id, year: year, month: month) do
    start_date = Date.new!(year, month, 1)
    end_date = Date.end_of_month(start_date)
    
    source_documents = get_source_documents(company_id, start_date, end_date)
    
    """
    <nsSAFT:SourceDocuments>
      #{generate_source_documents_xml(source_documents)}
    </nsSAFT:SourceDocuments>
    """
  end

  def build(:on_demand, company_id, date_from: date_from, date_to: date_to) do
    source_documents = get_source_documents(company_id, date_from, date_to)
    stock_movements = get_stock_movements(company_id, date_from, date_to)
    
    """
    <nsSAFT:SourceDocuments>
      #{generate_source_documents_xml(source_documents)}
      #{generate_stock_movements_xml(stock_movements)}
    </nsSAFT:SourceDocuments>
    """
  end

  def build(:annual, company_id, year: year) do
    start_date = Date.new!(year, 1, 1)
    end_date = Date.new!(year, 12, 31)
    
    source_documents = get_source_documents(company_id, start_date, end_date)
    
    """
    <nsSAFT:SourceDocuments>
      #{generate_source_documents_xml(source_documents)}
    </nsSAFT:SourceDocuments>
    """
  end

  defp get_source_documents(company_id, start_date, end_date) do
    from(je in "journal_entries",
      where: je.company_id == ^company_id and
             je.document_date >= ^start_date and
             je.document_date <= ^end_date and
             je.is_posted == true and
             je.document_type in ["INVOICE", "CREDIT_NOTE", "DEBIT_NOTE"],
      order_by: [asc: je.document_date, asc: je.entry_number],
      select: %{
        id: je.id,
        entry_number: je.entry_number,
        document_number: je.document_number,
        document_type: je.document_type,
        document_date: je.document_date,
        accounting_date: je.accounting_date,
        vat_date: je.vat_date,
        description: je.description,
        currency: je.currency,
        exchange_rate: je.exchange_rate,
        total_debit: je.total_debit,
        total_credit: je.total_credit,
        base_total_debit: je.base_total_debit,
        base_total_credit: je.base_total_credit,
        vat_amount: je.vat_amount,
        vat_operation_type: je.vat_operation_type,
        debtor_counterpart_id: je.debtor_counterpart_id,
        creditor_counterpart_id: je.creditor_counterpart_id
      }
    )
    |> Repo.all()
  end

  defp generate_source_documents_xml(source_documents) do
    document_xmls = Enum.map(source_documents, fn doc ->
      lines = get_entry_lines(doc[:id])
      
      """
      <nsSAFT:SourceDocument>
        <nsSAFT:SourceDocumentID>#{doc[:id]}</nsSAFT:SourceDocumentID>
        <nsSAFT:DocumentType>#{map_document_type(doc[:document_type])}</nsSAFT:DocumentType>
        <nsSAFT:DocumentNumber>#{doc[:document_number]}</nsSAFT:DocumentNumber>
        <nsSAFT:DocumentDate>#{format_date(doc[:document_date])}</nsSAFT:DocumentDate>
        <nsSAFT:EntryDate>#{format_date(doc[:accounting_date])}</nsSAFT:EntryDate>
        #{if doc[:vat_date], do: "<nsSAFT:VATDate>#{format_date(doc[:vat_date])}</nsSAFT:VATDate>", else: ""}
        <nsSAFT:Description>#{doc[:description]}</nsSAFT:Description>
        <nsSAFT:Currency>#{doc[:currency]}</nsSAFT:Currency>
        #{if doc[:exchange_rate], do: "<nsSAFT:ExchangeRate>#{format_amount(doc[:exchange_rate])}</nsSAFT:ExchangeRate>", else: ""}
        <nsSAFT:NetTotal>#{format_amount(doc[:base_total_debit])}</nsSAFT:NetTotal>
        <nsSAFT:GrossTotal>#{format_amount(Decimal.add(doc[:base_total_debit] || 0, doc[:vat_amount] || 0))}</nsSAFT:GrossTotal>
        <nsSAFT:TotalVAT>#{format_amount(doc[:vat_amount])}</nsSAFT:TotalVAT>
        #{generate_document_lines_xml(lines)}
        #{generate_document_parties_xml(doc)}
      </nsSAFT:SourceDocument>
      """
    end)
    
    Enum.join(document_xmls, "")
  end

  defp get_entry_lines(journal_entry_id) do
    from(el in "entry_lines",
      where: el.journal_entry_id == ^journal_entry_id,
      order_by: [asc: el.line_number],
      select: %{
        line_number: el.line_number,
        description: el.description,
        debit_amount: el.debit_amount,
        credit_amount: el.credit_amount,
        base_debit_amount: el.base_debit_amount,
        base_credit_amount: el.base_credit_amount,
        quantity: el.quantity,
        unit_price: el.unit_price,
        unit: el.unit,
        vat_amount: el.vat_amount,
        vat_rate_percentage: el.vat_rate_percentage,
        vat_direction: el.vat_direction,
        is_reverse_charge: el.is_reverse_charge,
        is_intrastat: el.is_intrastat,
        debit_account_id: el.debit_account_id,
        credit_account_id: el.credit_account_id,
        counterpart_id: el.counterpart_id,
        vat_rate_id: el.vat_rate_id
      }
    )
    |> Repo.all()
  end

  defp generate_document_lines_xml(lines) do
    line_xmls = Enum.map(lines, fn line ->
      account_id = line[:debit_account_id] || line[:credit_account_id]
      amount = line[:debit_amount] || line[:credit_amount]
      base_amount = line[:base_debit_amount] || line[:base_credit_amount]
      
      """
      <nsSAFT:Line>
        <nsSAFT:LineNumber>#{line[:line_number]}</nsSAFT:LineNumber>
        <nsSAFT:AccountID>#{account_id}</nsSAFT:AccountID>
        <nsSAFT:Description>#{line[:description]}</nsSAFT:Description>
        <nsSAFT:Quantity>#{format_amount(line[:quantity])}</nsSAFT:Quantity>
        <nsSAFT:UnitOfMeasure>#{line[:unit] || ""}</nsSAFT:UnitOfMeasure>
        <nsSAFT:UnitPrice>#{format_amount(line[:unit_price])}</nsSAFT:UnitPrice>
        <nsSAFT:Amount>#{format_amount(amount)}</nsSAFT:Amount>
        <nsSAFT:AmountInBaseCurrency>#{format_amount(base_amount)}</nsSAFT:AmountInBaseCurrency>
        #{if line[:vat_rate_id] && line[:vat_amount] && Decimal.gt?(line[:vat_amount], 0) do
          "<nsSAFT:TaxCodeID>#{line[:vat_rate_id]}</nsSAFT:TaxCodeID>
          <nsSAFT:TaxPercentage>#{format_amount(line[:vat_rate_percentage])}</nsSAFT:TaxPercentage>
          <nsSAFT:TaxAmount>#{format_amount(line[:vat_amount])}</nsSAFT:TaxAmount>
          <nsSAFT:TaxType>#{map_vat_direction(line[:vat_direction])}</nsSAFT:TaxType>"
        else
          ""
        end}
        #{if line[:is_reverse_charge], do: "<nsSAFT:TaxExemptionReason>16</nsSAFT:TaxExemptionReason>", else: ""}
      </nsSAFT:Line>
      """
    end)
    
    """
    <nsSAFT:Lines>
      #{Enum.join(line_xmls, "")}
    </nsSAFT:Lines>
    """
  end

  defp generate_document_parties_xml(doc) do
    parties = []
    
    parties = 
      if doc[:debtor_counterpart_id] do
        counterpart = get_counterpart(doc[:debtor_counterpart_id])
        [generate_customer_xml(counterpart) | parties]
      else
        parties
      end
    
    parties = 
      if doc[:creditor_counterpart_id] do
        counterpart = get_counterpart(doc[:creditor_counterpart_id])
        [generate_supplier_xml(counterpart) | parties]
      else
        parties
      end
    
    """
    <nsSAFT:Parties>
      #{Enum.join(parties, "")}
    </nsSAFT:Parties>
    """
  end

  defp generate_stock_movements_xml(stock_movements) do
    movement_xmls = Enum.map(stock_movements, fn sm ->
      """
      <nsSAFT:MovementOfGoods>
        <nsSAFT:MovementReference>#{sm[:reference]}</nsSAFT:MovementReference>
        <nsSAFT:MovementType>#{sm[:type]}</nsSAFT:MovementType>
        <nsSAFT:MovementDate>#{format_date(sm[:date])}</nsSAFT:MovementDate>
        <nsSAFT:ProductCode>#{sm[:product_code]}</nsSAFT:ProductCode>
        <nsSAFT:Quantity>#{format_amount(sm[:quantity])}</nsSAFT:Quantity>
        <nsSAFT:UnitOfMeasure>#{sm[:uom]}</nsSAFT:UnitOfMeasure>
        <nsSAFT:UnitPrice>#{format_amount(sm[:unit_price])}</nsSAFT:UnitPrice>
        <nsSAFT:Amount>#{format_amount(sm[:amount])}</nsSAFT:Amount>
        <nsSAFT:WarehouseID>#{sm[:warehouse_id]}</nsSAFT:WarehouseID>
        #{if sm[:location_id], do: "<nsSAFT:LocationID>#{sm[:location_id]}</nsSAFT:LocationID>", else: ""}
        #{if sm[:description], do: "<nsSAFT:Description>#{sm[:description]}</nsSAFT:Description>", else: ""}
      </nsSAFT:MovementOfGoods>
      """
    end)

    """
    <nsSAFT:MovementsOfGoods>
      #{Enum.join(movement_xmls, "")}
    </nsSAFT:MovementsOfGoods>
    """
  end

  defp get_counterpart(counterpart_id) do
    from(cp in "counterparts",
      where: cp.id == ^counterpart_id,
      select: %{
        id: cp.id,
        name: cp.name,
        eik: cp.eik,
        vat_number: cp.vat_number,
        address: cp.address,
        city: cp.city,
        post_code: cp.post_code,
        country: cp.country,
        phone: cp.phone,
        email: cp.email,
        is_customer: cp.is_customer,
        is_supplier: cp.is_supplier,
        is_vat_registered: cp.is_vat_registered
      }
    )
    |> Repo.one()
  end

  defp get_stock_movements(company_id, date_from, date_to) do
    from(sm in "stock_movements",
      where: sm.company_id == ^company_id and sm.movement_date >= ^date_from and sm.movement_date <= ^date_to,
      select: %{
        reference: sm.movement_reference,
        type: sm.movement_type,
        date: sm.movement_date,
        product_code: sm.product_code,
        quantity: sm.quantity,
        uom: sm.uom,
        unit_price: sm.unit_price,
        amount: sm.amount,
        warehouse_id: sm.warehouse_id,
        location_id: sm.location_id,
        description: sm.description
      }
    )
    |> Repo.all()
  end

  defp generate_customer_xml(counterpart) do
    if counterpart and counterpart.is_customer do
      """
      <nsSAFT:Customer>
        <nsSAFT:CustomerID>#{counterpart.id}</nsSAFT:CustomerID>
        <nsSAFT:CustomerName>#{counterpart.name}</nsSAFT:CustomerName>
        <nsSAFT:CustomerTaxID>#{counterpart.vat_number || ""}</nsSAFT:CustomerTaxID>
        <nsSAFT:CustomerAddress>
          <nsSAFT:AddressDetail>#{counterpart.address || ""}</nsSAFT:AddressDetail>
          <nsSAFT:City>#{counterpart.city || ""}</nsSAFT:City>
          <nsSAFT:PostalCode>#{counterpart.post_code || ""}</nsSAFT:PostalCode>
          <nsSAFT:Country>#{counterpart.country || "BG"}</nsSAFT:Country>
        </nsSAFT:CustomerAddress>
        <nsSAFT:CustomerPhone>#{counterpart.phone || ""}</nsSAFT:CustomerPhone>
        <nsSAFT:CustomerEmail>#{counterpart.email || ""}</nsSAFT:CustomerEmail>
      </nsSAFT:Customer>
      """
    else
      ""
    end
  end

  defp generate_supplier_xml(counterpart) do
    if counterpart and counterpart.is_supplier do
      """
      <nsSAFT:Supplier>
        <nsSAFT:SupplierID>#{counterpart.id}</nsSAFT:SupplierID>
        <nsSAFT:SupplierName>#{counterpart.name}</nsSAFT:SupplierName>
        <nsSAFT:SupplierTaxID>#{counterpart.vat_number || ""}</nsSAFT:SupplierTaxID>
        <nsSAFT:SupplierAddress>
          <nsSAFT:AddressDetail>#{counterpart.address || ""}</nsSAFT:AddressDetail>
          <nsSAFT:City>#{counterpart.city || ""}</nsSAFT:City>
          <nsSAFT:PostalCode>#{counterpart.post_code || ""}</nsSAFT:PostalCode>
          <nsSAFT:Country>#{counterpart.country || "BG"}</nsSAFT:Country>
        </nsSAFT:SupplierAddress>
        <nsSAFT:SupplierPhone>#{counterpart.phone || ""}</nsSAFT:SupplierPhone>
        <nsSAFT:SupplierEmail>#{counterpart.email || ""}</nsSAFT:SupplierEmail>
      </nsSAFT:Supplier>
      """
    else
      ""
    end
  end

  defp map_document_type("INVOICE"), do: "1"
  defp map_document_type("CREDIT_NOTE"), do: "2"
  defp map_document_type("DEBIT_NOTE"), do: "3"
  defp map_document_type(_), do: "1"

  defp map_vat_direction("INPUT"), do: "IE"
  defp map_vat_direction("OUTPUT"), do: "IE"
  defp map_vat_direction("BOTH"), do: "IE"
  defp map_vat_direction(_), do: "NS"

  defp format_date(%Date{year: year, month: month, day: day}) do
    "#{year}-#{String.pad_leading(to_string(month), 2, "0")}-#{String.pad_leading(to_string(day), 2, "0")}"
  end

  defp format_amount(nil), do: "0.00"
  defp format_amount(%Decimal{} = amount), do: Decimal.to_string(amount, :normal)
  defp format_amount(amount), do: to_string(amount)
end