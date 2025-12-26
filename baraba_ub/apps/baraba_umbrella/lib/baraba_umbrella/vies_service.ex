defmodule BarabaUmbrella.ViesService do
  @moduledoc """
  Client for the external Nim-based VIES Service.
  """

  require Logger

  def validate_vat(vat_number) do
    url = service_url() <> "/api/vies/validate/#{vat_number}"

    case Finch.build(:get, url) |> Finch.request(BarabaUmbrella.Finch) do
      {:ok, %Finch.Response{status: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, data} -> {:ok, data}
          {:error, _} -> {:error, :invalid_json}
        end

      {:ok, %Finch.Response{status: 400, body: body}} ->
        Logger.warning("VIES Validation Bad Request: #{body}")
        {:error, :bad_request}

      {:ok, %Finch.Response{status: status, body: body}} ->
        Logger.error("VIES Service Error: #{status} - #{body}")
        {:error, :service_error}

      {:error, reason} ->
        Logger.error("VIES Service Connection Error: #{inspect(reason)}")
        {:error, :connection_error}
    end
  end

  defp service_url do
    Application.get_env(:baraba_umbrella, :vies_service_url)
  end
end
