defmodule BarabaUmbrellaWeb.VatReturnJSON do
  def index(%{vat_returns: vat_returns}) do
    %{data: for(vat_return <- vat_returns, do: data(vat_return))}
  end

  def show(%{vat_return: vat_return}) do
    %{data: data(vat_return)}
  end

  def error(%{changeset: changeset}) do
    %{errors: Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)}
  end

  defp data(vat_return) do
    %{
      id: vat_return.id,
      period_year: vat_return.period_year,
      period_month: vat_return.period_month,
      status: vat_return.status,
      purchase_base_20: vat_return.purchase_base_20,
      purchase_vat_20: vat_return.purchase_vat_20,
      purchase_base_9: vat_return.purchase_base_9,
      purchase_vat_9: vat_return.purchase_vat_9,
      purchase_base_0: vat_return.purchase_base_0,
      purchase_intra_eu: vat_return.purchase_intra_eu,
      purchase_import: vat_return.purchase_import,
      sales_base_20: vat_return.sales_base_20,
      sales_vat_20: vat_return.sales_vat_20,
      sales_base_9: vat_return.sales_base_9,
      sales_vat_9: vat_return.sales_vat_9,
      sales_base_0: vat_return.sales_base_0,
      sales_intra_eu: vat_return.sales_intra_eu,
      sales_exempt: vat_return.sales_exempt,
      total_purchase_vat: vat_return.total_purchase_vat,
      total_sales_vat: vat_return.total_sales_vat,
      vat_due: vat_return.vat_due,
      submission_date: vat_return.submission_date,
      submission_reference: vat_return.submission_reference,
      rejection_reason: vat_return.rejection_reason,
      notes: vat_return.notes,
      company_id: vat_return.company_id,
      created_by_id: vat_return.created_by_id
    }
  end
end
