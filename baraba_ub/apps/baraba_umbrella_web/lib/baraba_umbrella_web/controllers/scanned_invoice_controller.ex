defmodule BarabaUmbrellaWeb.ScannedInvoiceController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Accounting
  alias BarabaUmbrella.Accounting.ScannedInvoice

  action_fallback BarabaUmbrellaWeb.FallbackController

  @scanner_service_url System.get_env("SCANNER_SERVICE_URL", "http://localhost:5001")

  def index(conn, %{"company_id" => company_uid} = params) do
    scanned_invoices = Accounting.list_scanned_invoices(company_uid, params)
    render(conn, :index, scanned_invoices: scanned_invoices)
  end

  def show(conn, %{"id" => id}) do
    scanned_invoice = Accounting.get_scanned_invoice!(id)
    render(conn, :show, scanned_invoice: scanned_invoice)
  end

  def update(conn, %{"id" => id, "scanned_invoice" => scanned_invoice_params}) do
    scanned_invoice = Accounting.get_scanned_invoice!(id)

    with {:ok, %ScannedInvoice{} = scanned_invoice} <- Accounting.update_scanned_invoice(scanned_invoice, scanned_invoice_params) do
      render(conn, :show, scanned_invoice: scanned_invoice)
    end
  end

  def delete(conn, %{"id" => id}) do
    scanned_invoice = Accounting.get_scanned_invoice!(id)

    with {:ok, %ScannedInvoice{}} <- Accounting.delete_scanned_invoice(scanned_invoice) do
      send_resp(conn, :no_content, "")
    end
  end

  def next_pending(conn, %{"company_id" => company_uid} = params) do
    current_id = Map.get(params, "current_id")
    # Convert current_id to integer if present (since it's serial/bigserial in DB)
    # But wait, ScannedInvoice id is BIGSERIAL (integer), but if the frontend sends it, it might be string
    current_id = if current_id, do: String.to_integer(current_id), else: 0

    scanned_invoice = Accounting.get_next_pending_invoice(company_uid, current_id)

    if scanned_invoice do
      render(conn, :show, scanned_invoice: scanned_invoice)
    else
      # Return 204 or 404 if no more pending invoices
      conn
      |> put_status(:not_found)
      |> json(%{error: "No more pending invoices"})
    end
  end

  @doc """
  Approve a scanned invoice:
  1. Fetch PDF from scanner_service
  2. Upload to S3 with proper path structure
  3. Update status to APPROVED
  """
  def approve(conn, %{"company_id" => company_uid, "id" => id}) do
    scanned_invoice = Accounting.get_scanned_invoice!(id)
    company = Accounting.get_company_by_uid!(company_uid)

    with {:ok, pdf_content} <- fetch_pdf_from_scanner(scanned_invoice),
         {:ok, updated_invoice} <- Accounting.upload_scanned_invoice_to_s3(scanned_invoice, pdf_content, company),
         {:ok, final_invoice} <- Accounting.update_scanned_invoice(updated_invoice, %{status: "APPROVED"}) do
      render(conn, :show, scanned_invoice: final_invoice)
    else
      {:error, reason} when is_binary(reason) ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: reason})

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Validation failed", details: format_changeset_errors(changeset)})

      _ ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "Failed to approve invoice"})
    end
  end

  @doc """
  Download the PDF for a scanned invoice from S3.
  Returns the PDF binary with proper content-type.
  """
  def download_pdf(conn, %{"company_id" => company_uid, "id" => id}) do
    scanned_invoice = Accounting.get_scanned_invoice!(id)
    company = Accounting.get_company_by_uid!(company_uid)

    case Accounting.download_scanned_invoice_from_s3(scanned_invoice, company) do
      {:ok, pdf_content} ->
        filename = "invoice_#{scanned_invoice.internal_number || scanned_invoice.id}.pdf"

        conn
        |> put_resp_content_type("application/pdf")
        |> put_resp_header("content-disposition", "attachment; filename=\"#{filename}\"")
        |> send_resp(200, pdf_content)

      {:error, reason} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: reason})
    end
  end

  # Fetch PDF from scanner_service using session_id and session_file_id
  defp fetch_pdf_from_scanner(%ScannedInvoice{session_id: nil}),
    do: {:error, "No session_id - cannot fetch PDF"}

  defp fetch_pdf_from_scanner(%ScannedInvoice{session_file_id: nil}),
    do: {:error, "No session_file_id - cannot fetch PDF"}

  defp fetch_pdf_from_scanner(%ScannedInvoice{session_id: session_id, session_file_id: file_id}) do
    url = "#{@scanner_service_url}/api/scan/sessions/#{session_id}/files/#{file_id}/download"

    case HTTPoison.get(url, [], recv_timeout: 30_000) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        {:ok, body}

      {:ok, %HTTPoison.Response{status_code: status}} ->
        {:error, "Scanner service returned status #{status}"}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "Failed to fetch PDF: #{inspect(reason)}"}
    end
  end

  defp format_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
