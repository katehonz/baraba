defmodule BarabaUmbrella.Jasper do
  @moduledoc """
  Client for interacting with the Jasper Reports Service.
  """

  require Logger

  @service_name BarabaUmbrella.Finch

  defp get_service_url do
    Application.get_env(:baraba_umbrella, :jasper_service_url)
  end

  def generate_report(report_name, params, format \\ "pdf") do
    url = "#{get_service_url()}/api/reports/generate"
    
    # Ensure params is a map
    params = params || %{}

    payload = %{
      reportName: report_name,
      format: format,
      parameters: params
    }

    case Finch.build(:post, url, [{"content-type", "application/json"}], Jason.encode!(payload))
         |> Finch.request(@service_name) do
      {:ok, %Finch.Response{status: 200, body: body, headers: headers}} ->
        content_type = 
          Enum.find(headers, fn {k, _} -> String.downcase(k) == "content-type" end) 
          |> case do
            {_, v} -> v
            nil -> "application/octet-stream"
          end
        
        content_disposition = 
          Enum.find(headers, fn {k, _} -> String.downcase(k) == "content-disposition" end)
          |> case do
            {_, v} -> v
            nil -> "attachment; filename=report.#{format}"
          end

        {:ok, body, content_type, content_disposition}

      {:ok, %Finch.Response{status: status, body: body}} ->
        Logger.error("Jasper Service error: #{status} - #{body}")
        {:error, "Jasper Service returned #{status}: #{body}"}

      {:error, reason} ->
        Logger.error("Jasper Service connection error: #{inspect(reason)}")
        {:error, "Connection failed: #{inspect(reason)}"}
    end
  end

  def list_templates do
    url = "#{get_service_url()}/api/reports/templates"

    case Finch.build(:get, url) |> Finch.request(@service_name) do
      {:ok, %Finch.Response{status: 200, body: body}} ->
        Jason.decode(body)
      
      {:ok, %Finch.Response{status: status}} ->
        Logger.error("Failed to list templates. Status: #{status}")
        {:error, :failed_to_list_templates}

      {:error, reason} ->
        Logger.error("Failed to list templates: #{inspect(reason)}")
        {:error, :connection_failed}
    end
  end
end
