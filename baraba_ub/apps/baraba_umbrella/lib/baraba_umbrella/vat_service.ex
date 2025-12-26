defmodule BarabaUmbrella.VatService do
  @moduledoc """
  Client for the external Nim-based VAT Service.
  """

  require Logger

  def generate_vat_files(company_id, period) do
    url = service_url() <> "/api/vat/generate/#{period}"
    body = Jason.encode!(%{companyId: company_id})

    headers = [{"content-type", "application/json"}]

    case Finch.build(:post, url, headers, body) |> Finch.request(BarabaUmbrella.Finch) do
      {:ok, %Finch.Response{status: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, data} -> {:ok, data} # Returns {"POKUPKI.TXT": "...", "PRODAGBI.TXT": "...", "DEKLAR.TXT": "..."}
          {:error, _} -> {:error, :invalid_json}
        end

      {:ok, %Finch.Response{status: 404}} ->
        {:error, :company_not_found}

      {:ok, %Finch.Response{status: status, body: body}} ->
        Logger.error("VAT Service Error: #{status} - #{body}")
        {:error, :service_error}

      {:error, reason} ->
        Logger.error("VAT Service Connection Error: #{inspect(reason)}")
        {:error, :connection_error}
    end
  end

  defp service_url do
    Application.get_env(:baraba_umbrella, :vat_service_url)
  end
end
