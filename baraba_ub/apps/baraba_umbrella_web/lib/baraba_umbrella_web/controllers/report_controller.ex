defmodule BarabaUmbrellaWeb.ReportController do
  use BarabaUmbrellaWeb, :controller

  require Logger

  alias BarabaUmbrella.Jasper
  alias BarabaUmbrella.Accounting
  alias BarabaUmbrella.Storage.S3Client

  def generate(conn, %{"report_name" => report_name} = params) do
    # Extract format and parameters
    format = Map.get(params, "format", "pdf")
    report_params = Map.get(params, "parameters", %{})
    company_id = get_in(params, ["parameters", "companyId"]) || get_in(params, ["parameters", "company_id"])

    case Jasper.generate_report(report_name, report_params, format) do
      {:ok, data, content_type, content_disposition} ->
        # Upload to S3 if company has S3 enabled
        if company_id do
          Task.start(fn -> upload_report_to_s3(company_id, report_name, data, format) end)
        end

        conn
        |> put_resp_content_type(content_type)
        |> put_resp_header("content-disposition", content_disposition)
        |> send_resp(200, data)

      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: reason})
    end
  end

  defp upload_report_to_s3(company_id, report_name, data, format) do
    try do
      company = Accounting.get_company!(company_id)

      if company.s3_enabled do
        timestamp = DateTime.utc_now() |> DateTime.to_iso8601(:basic) |> String.replace(~r/[:\-]/, "")
        key = "reports/#{report_name}_#{timestamp}.#{format}"

        content_type = case format do
          "pdf" -> "application/pdf"
          "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          _ -> "application/octet-stream"
        end

        case S3Client.upload_file(company, key, data, content_type: content_type) do
          {:ok, full_key} ->
            Logger.info("Report #{report_name} uploaded to S3: #{full_key}")
          {:error, reason} ->
            Logger.error("Failed to upload report to S3: #{inspect(reason)}")
        end
      end
    rescue
      e ->
        Logger.error("Error uploading report to S3: #{inspect(e)}")
    end
  end

  def templates(conn, _params) do
    case Jasper.list_templates() do
      {:ok, data} ->
        json(conn, data)
      
      {:error, _reason} ->
        conn
        |> put_status(:service_unavailable)
        |> json(%{error: "Service unavailable"})
    end
  end
end
