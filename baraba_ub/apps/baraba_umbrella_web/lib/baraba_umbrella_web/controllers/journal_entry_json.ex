defmodule BarabaUmbrellaWeb.JournalEntryJSON do
  alias BarabaUmbrella.Accounting.JournalEntry
  alias BarabaUmbrella.Accounting.EntryLine
  
  @doc """
  Renders a list of journal entries.
  """
  def index(%{journal_entries: journal_entries}) do
    %{data: for(entry <- journal_entries, do: data(entry))}
  end
  
  @doc """
  Renders a single journal entry.
  """
  def show(%{journal_entry: journal_entry}) do
    %{data: data(journal_entry)}
  end
  
  @doc """
  Renders error for changeset.
  """
  def error(%{changeset: changeset}) do
    %{
      errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)
    }
  end
  
  @doc """
  Renders generic error.
  """
  def error(%{error: error}) do
    %{error: to_string(error)}
  end
  
  defp data(%JournalEntry{} = journal_entry) do
    %{
      id: journal_entry.id,
      entry_number: journal_entry.entry_number,
      description: journal_entry.description,
      document_number: journal_entry.document_number,
      document_type: journal_entry.document_type,
      document_date: journal_entry.document_date,
      accounting_date: journal_entry.accounting_date,
      vat_date: journal_entry.vat_date,
      currency: journal_entry.currency,
      exchange_rate: journal_entry.exchange_rate,
      total_debit: journal_entry.total_debit,
      total_credit: journal_entry.total_credit,
      base_total_debit: journal_entry.base_total_debit,
      base_total_credit: journal_entry.base_total_credit,
      vat_amount: journal_entry.vat_amount,
      is_posted: journal_entry.is_posted,
      posted_at: journal_entry.posted_at,
      posted_by_id: journal_entry.posted_by_id,
      created_by_id: journal_entry.created_by_id,
      last_modified_by_id: journal_entry.last_modified_by_id,
      notes: journal_entry.notes,
      vat_operation_type: journal_entry.vat_operation_type,
      vat_document_type: journal_entry.vat_document_type,
      company_id: journal_entry.company_id,
      debtor_counterpart_id: journal_entry.debtor_counterpart_id,
      creditor_counterpart_id: journal_entry.creditor_counterpart_id,
      entry_lines: for(line <- journal_entry.entry_lines || [], do: entry_line_data(line)),
      inserted_at: journal_entry.inserted_at,
      updated_at: journal_entry.updated_at
    }
  end
  
  defp entry_line_data(%EntryLine{} = line) do
    %{
      id: line.id,
      line_number: line.line_number,
      description: line.description,
      debit_amount: line.debit_amount,
      credit_amount: line.credit_amount,
      base_debit_amount: line.base_debit_amount,
      base_credit_amount: line.base_credit_amount,
      quantity: line.quantity,
      unit_price: line.unit_price,
      unit: line.unit,
      exchange_rate: line.exchange_rate,
      vat_amount: line.vat_amount,
      vat_rate_percentage: line.vat_rate_percentage,
      vat_direction: line.vat_direction,
      is_reverse_charge: line.is_reverse_charge,
      is_intrastat: line.is_intrastat,
      notes: line.notes,
      journal_entry_id: line.journal_entry_id,
      debit_account_id: line.debit_account_id,
      credit_account_id: line.credit_account_id,
      counterpart_id: line.counterpart_id,
      vat_rate_id: line.vat_rate_id
    }
  end
  
  # Define translate_error/1 function
  defp translate_error({msg, opts}) do
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", to_string(value))
    end)
  end
end