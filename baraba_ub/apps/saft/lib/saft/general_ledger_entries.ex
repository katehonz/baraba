defmodule Saft.GeneralLedgerEntries do
  @moduledoc """
  Generates the GeneralLedgerEntries section of SAF-T XML.
  """

  alias BarabaUmbrella.Accounting
  alias BarabaUmbrella.Repo
  import Ecto.Query

  def build(company_id, year: year, month: month) do
    start_date = Date.new!(year, month, 1)
    end_date = Date.end_of_month(start_date)
    
    journal_entries = get_journal_entries(company_id, start_date, end_date)
    
    """
    <nsSAFT:GeneralLedgerEntries>
      #{generate_journal_entries_xml(journal_entries)}
    </nsSAFT:GeneralLedgerEntries>
    """
  end

  defp get_journal_entries(company_id, start_date, end_date) do
    from(je in "journal_entries",
      where: je.company_id == ^company_id and
             je.accounting_date >= ^start_date and
             je.accounting_date <= ^end_date and
             je.is_posted == true,
      order_by: [asc: je.accounting_date, asc: je.entry_number],
      select: %{
        id: je.id,
        entry_number: je.entry_number,
        description: je.description,
        document_number: je.document_number,
        document_type: je.document_type,
        accounting_date: je.accounting_date,
        currency: je.currency,
        exchange_rate: je.exchange_rate,
        total_debit: je.total_debit,
        total_credit: je.total_credit,
        base_total_debit: je.base_total_debit,
        base_total_credit: je.base_total_credit,
        vat_amount: je.vat_amount,
        posted_at: je.posted_at,
        vat_operation_type: je.vat_operation_type,
        debtor_counterpart_id: je.debtor_counterpart_id,
        creditor_counterpart_id: je.creditor_counterpart_id
      }
    )
    |> Repo.all()
  end

  defp generate_journal_entries_xml(journal_entries) do
    entry_xmls = Enum.map(journal_entries, fn entry ->
      lines = get_entry_lines(entry[:id])
      
      """
      <nsSAFT:JournalEntry>
        <nsSAFT:JournalID>#{entry[:id]}</nsSAFT:JournalID>
        <nsSAFT:JournalDescription>#{entry[:description]}</nsSAFT:JournalDescription>
        <nsSAFT:JournalDate>#{format_date(entry[:accounting_date])}</nsSAFT:JournalDate>
        <nsSAFT:TransactionID>#{entry[:entry_number]}</nsSAFT:TransactionID>
        <nsSAFT:TransactionDescription>#{entry[:description]}</nsSAFT:TransactionDescription>
        <nsSAFT:SourceID>#{entry[:document_number]}</nsSAFT:SourceID>
        <nsSAFT:TransactionType>#{map_transaction_type(entry[:document_type])}</nsSAFT:TransactionType>
        <nsSAFT:TransactionDate>#{format_date(entry[:accounting_date])}</nsSAFT:TransactionDate>
        <nsSAFT:Period>#{extract_period(entry[:accounting_date])}</nsSAFT:Period>
        <nsSAFT:DebitAmount>#{format_amount(entry[:base_total_debit])}</nsSAFT:DebitAmount>
        <nsSAFT:CreditAmount>#{format_amount(entry[:base_total_credit])}</nsSAFT:CreditAmount>
        <nsSAFT:Currency>#{entry[:currency]}</nsSAFT:Currency>
        <nsSAFT:ExchangeRate>#{format_amount(entry[:exchange_rate])}</nsSAFT:ExchangeRate>
        #{generate_entry_lines_xml(lines)}
      </nsSAFT:JournalEntry>
      """
    end)
    
    Enum.join(entry_xmls, "")
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

  defp generate_entry_lines_xml(lines) do
    line_xmls = Enum.map(lines, fn line ->
      account_id = line[:debit_account_id] || line[:credit_account_id]
      amount = line[:debit_amount] || line[:credit_amount]
      base_amount = line[:base_debit_amount] || line[:base_credit_amount]
      is_debit = not is_nil(line[:debit_amount_id])
      
      """
      <nsSAFT:Line>
        <nsSAFT:LineType>#{if is_debit, do: "D", else: "C"}</nsSAFT:LineType>
        <nsSAFT:AccountID>#{account_id}</nsSAFT:AccountID>
        <nsSAFT:AccountDescription>#{line[:description]}</nsSAFT:AccountDescription>
        <nsSAFT:Amount>#{format_amount(amount)}</nsSAFT:Amount>
        <nsSAFT:AmountInBaseCurrency>#{format_amount(base_amount)}</nsSAFT:AmountInBaseCurrency>
        #{if line[:quantity], do: "<nsSAFT:Quantity>#{format_amount(line[:quantity])}</nsSAFT:Quantity>", else: ""}
        #{if line[:unit_price], do: "<nsSAFT:UnitPrice>#{format_amount(line[:unit_price])}</nsSAFT:UnitPrice>", else: ""}
        #{if line[:unit], do: "<nsSAFT:UnitOfMeasure>#{line[:unit]}</nsSAFT:UnitOfMeasure>", else: ""}
        #{if line[:vat_rate_id] && line[:vat_amount] && Decimal.gt?(line[:vat_amount], 0), do: "<nsSAFT:TaxCodeID>#{line[:vat_rate_id]}</nsSAFT:TaxCodeID>", else: ""}
        #{if line[:vat_rate_percentage], do: "<nsSAFT:TaxPercentage>#{format_amount(line[:vat_rate_percentage])}</nsSAFT:TaxPercentage>", else: ""}
        #{if line[:vat_amount] && Decimal.gt?(line[:vat_amount], 0), do: "<nsSAFT:TaxAmount>#{format_amount(line[:vat_amount])}</nsSAFT:TaxAmount>", else: ""}
        #{if line[:vat_direction], do: "<nsSAFT:TaxType>#{map_vat_direction(line[:vat_direction])}</nsSAFT:TaxType>", else: ""}
        #{if line[:counterpart_id], do: "<nsSAFT:CustomerID>#{line[:counterpart_id]}</nsSAFT:CustomerID>", else: ""}
        #{if line[:counterpart_id], do: "<nsSAFT:SupplierID>#{line[:counterpart_id]}</nsSAFT:SupplierID>", else: ""}
      </nsSAFT:Line>
      """
    end)
    
    Enum.join(line_xmls, "")
  end

  defp map_transaction_type("INVOICE"), do: "1"
  defp map_transaction_type("CREDIT_NOTE"), do: "2"
  defp map_transaction_type("DEBIT_NOTE"), do: "3"
  defp map_transaction_type("RECEIPT"), do: "4"
  defp map_transaction_type("PAYMENT"), do: "5"
  defp map_transaction_type("BANK_STATEMENT"), do: "6"
  defp map_transaction_type(_), do: "1"

  defp map_vat_direction("INPUT"), do: "IE"
  defp map_vat_direction("OUTPUT"), do: "IE"
  defp map_vat_direction("BOTH"), do: "IE"
  defp map_vat_direction(_), do: "NS"

  defp extract_period(%Date{year: year, month: month}), do: "#{year}#{String.pad_leading(to_string(month), 2, "0")}"

  defp format_date(%Date{year: year, month: month, day: day}) do
    "#{year}-#{String.pad_leading(to_string(month), 2, "0")}-#{String.pad_leading(to_string(day), 2, "0")}"
  end

  defp format_amount(nil), do: "0.00"
  defp format_amount(%Decimal{} = amount), do: Decimal.to_string(amount, :normal)
  defp format_amount(amount), do: to_string(amount)
end