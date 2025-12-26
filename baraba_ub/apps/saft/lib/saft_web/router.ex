defmodule SaftWeb.Router do
  use Plug.Router
  require Logger

  plug Plug.Logger
  plug :match
  plug Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Jason
  plug :dispatch

  # Health check
  get "/health" do
    response = %{
      status: "healthy",
      service: "saft-service",
      version: "1.0.0",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    }
    send_json(conn, 200, response)
  end

  # Generate SAF-T Monthly report
  post "/api/saft/monthly" do
    with {:ok, company_id} <- get_param(conn.body_params, "company_id"),
         {:ok, year} <- get_param(conn.body_params, "year"),
         {:ok, month} <- get_param(conn.body_params, "month"),
         {:ok, xml} <- Saft.generate(:monthly, company_id, year: year, month: month) do

      filename = "SAFT_Monthly_#{year}_#{String.pad_leading(to_string(month), 2, "0")}.xml"

      conn
      |> put_resp_content_type("application/xml")
      |> put_resp_header("content-disposition", "attachment; filename=\"#{filename}\"")
      |> send_resp(200, xml)
    else
      {:error, reason} ->
        send_json(conn, 400, %{error: inspect(reason)})
    end
  end

  # Generate SAF-T Annual report
  post "/api/saft/annual" do
    with {:ok, company_id} <- get_param(conn.body_params, "company_id"),
         {:ok, year} <- get_param(conn.body_params, "year"),
         {:ok, xml} <- Saft.generate(:annual, company_id, year: year) do

      filename = "SAFT_Annual_#{year}.xml"

      conn
      |> put_resp_content_type("application/xml")
      |> put_resp_header("content-disposition", "attachment; filename=\"#{filename}\"")
      |> send_resp(200, xml)
    else
      {:error, reason} ->
        send_json(conn, 400, %{error: inspect(reason)})
    end
  end

  # GET endpoint for monthly (query params)
  get "/api/saft/monthly/:company_id/:year/:month" do
    company_id = String.to_integer(company_id)
    year = String.to_integer(year)
    month = String.to_integer(month)

    case Saft.generate(:monthly, company_id, year: year, month: month) do
      {:ok, xml} ->
        filename = "SAFT_Monthly_#{year}_#{String.pad_leading(to_string(month), 2, "0")}.xml"

        conn
        |> put_resp_content_type("application/xml")
        |> put_resp_header("content-disposition", "attachment; filename=\"#{filename}\"")
        |> send_resp(200, xml)

      {:error, reason} ->
        send_json(conn, 400, %{error: inspect(reason)})
    end
  end

  # GET endpoint for annual
  get "/api/saft/annual/:company_id/:year" do
    company_id = String.to_integer(company_id)
    year = String.to_integer(year)

    case Saft.generate(:annual, company_id, year: year) do
      {:ok, xml} ->
        filename = "SAFT_Annual_#{year}.xml"

        conn
        |> put_resp_content_type("application/xml")
        |> put_resp_header("content-disposition", "attachment; filename=\"#{filename}\"")
        |> send_resp(200, xml)

      {:error, reason} ->
        send_json(conn, 400, %{error: inspect(reason)})
    end
  end

  # Validate XML against XSD
  post "/api/saft/validate" do
    xml_content = conn.body_params["xml"] || ""

    case Saft.validate_xml(xml_content) do
      {:ok, :valid} ->
        send_json(conn, 200, %{valid: true, message: "XML is valid according to SAF-T BG Schema"})

      {:error, reason} ->
        send_json(conn, 200, %{valid: false, errors: inspect(reason)})
    end
  end

  # List available report types
  get "/api/saft/types" do
    response = %{
      types: [
        %{
          id: "monthly",
          name: "Месечен отчет",
          description: "MasterFiles + GeneralLedgerEntries + SourceDocuments",
          parameters: ["company_id", "year", "month"]
        },
        %{
          id: "annual",
          name: "Годишен отчет",
          description: "Assets + AssetTransactions",
          parameters: ["company_id", "year"]
        }
      ],
      note: "Материални запаси (PhysicalStock) ще бъдат добавени през 2027г."
    }
    send_json(conn, 200, response)
  end

  match _ do
    send_json(conn, 404, %{error: "Not found"})
  end

  # Helpers

  defp send_json(conn, status, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(data))
  end

  defp get_param(params, key) do
    case Map.get(params, key) do
      nil -> {:error, {:missing_param, key}}
      value when is_binary(value) -> {:ok, String.to_integer(value)}
      value when is_integer(value) -> {:ok, value}
      _ -> {:error, {:invalid_param, key}}
    end
  end
end