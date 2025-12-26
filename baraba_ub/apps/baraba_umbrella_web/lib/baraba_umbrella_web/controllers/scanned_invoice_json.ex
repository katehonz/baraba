defmodule BarabaUmbrellaWeb.ScannedInvoiceJSON do
  alias BarabaUmbrella.Accounting.ScannedInvoice

  @doc """
  Renders a list of scanned_invoices.
  """
  def index(%{scanned_invoices: scanned_invoices}) do
    %{data: for(scanned_invoice <- scanned_invoices, do: data(scanned_invoice))}
  end

  @doc """
  Renders a single scanned_invoice.
  """
  def show(%{scanned_invoice: scanned_invoice}) do
    %{data: data(scanned_invoice)}
  end

  defp data(%ScannedInvoice{} = scanned_invoice) do
    %{
      id: scanned_invoice.id,
      company_uid: scanned_invoice.company_uid,
      direction: scanned_invoice.direction,
      status: scanned_invoice.status,
      vendor_name: scanned_invoice.vendor_name,
      vendor_vat_number: scanned_invoice.vendor_vat_number,
      vendor_address: scanned_invoice.vendor_address,
      customer_name: scanned_invoice.customer_name,
      customer_vat_number: scanned_invoice.customer_vat_number,
      customer_address: scanned_invoice.customer_address,
      invoice_number: scanned_invoice.invoice_number,
      invoice_date: scanned_invoice.invoice_date,
      due_date: scanned_invoice.due_date,
      subtotal: scanned_invoice.subtotal,
      total_tax: scanned_invoice.total_tax,
      invoice_total: scanned_invoice.invoice_total,
      vies_status: scanned_invoice.vies_status,
      vies_validation_message: scanned_invoice.vies_validation_message,
      requires_manual_review: scanned_invoice.requires_manual_review,
      manual_review_reason: scanned_invoice.manual_review_reason,
      notes: scanned_invoice.notes,
      original_file_name: scanned_invoice.original_file_name,
      created_at: scanned_invoice.created_at,
      # Include linked IDs
      counterparty_account_id: scanned_invoice.counterparty_account_id,
      vat_account_id: scanned_invoice.vat_account_id,
      expense_revenue_account_id: scanned_invoice.expense_revenue_account_id,
      journal_entry_id: scanned_invoice.journal_entry_id,
      # S3 Storage
      internal_number: scanned_invoice.internal_number,
      s3_key: scanned_invoice.s3_key,
      s3_uploaded_at: scanned_invoice.s3_uploaded_at
    }
  end
end
