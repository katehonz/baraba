defmodule BarabaUmbrella.ECB do
  @moduledoc """
  European Central Bank (ECB) Exchange Rate Integration.

  ECB publishes exchange rates with EUR as the base currency.
  Rates are updated around 16:00 CET on working days.

  Available feeds:
  - Daily: Current rates
  - 90 days: Last 90 calendar days of history
  - Full history: All historical data since 1999
  """

  require Logger
  import SweetXml

  @service_name BarabaUmbrella.Finch

  @daily_url "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
  @hist_90d_url "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml"
  @hist_full_url "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.xml"

  # BGN is fixed to EUR at this rate until Euro adoption
  @bgn_fixed_rate Decimal.new("1.95583")

  @doc """
  Fetches the latest daily exchange rates from ECB.
  Returns {:ok, %{date: Date.t(), rates: [%{currency: String.t(), rate: Decimal.t()}]}}
  """
  def fetch_daily_rates do
    case fetch_and_parse(@daily_url) do
      {:ok, [day | _]} -> {:ok, day}
      {:ok, []} -> {:error, :no_rates_found}
      error -> error
    end
  end

  @doc """
  Fetches exchange rates for a specific date.
  Uses 90-day history feed first, falls back to full history if needed.
  Returns {:ok, %{date: Date.t(), rates: list()}} or {:error, reason}
  """
  def fetch_rates_for_date(%Date{} = date) do
    ninety_days_ago = Date.add(Date.utc_today(), -90)

    url = if Date.compare(date, ninety_days_ago) == :gt, do: @hist_90d_url, else: @hist_full_url

    case fetch_and_parse(url) do
      {:ok, days} ->
        case Enum.find(days, fn day -> day.date == date end) do
          nil ->
            # Try to find the closest previous working day
            find_closest_rate(days, date)

          day ->
            {:ok, day}
        end

      error ->
        error
    end
  end

  @doc """
  Fetches all exchange rates for a given month.
  Returns {:ok, [%{date: Date.t(), rates: list()}]} with all available days in the month.
  """
  def fetch_rates_for_month(year, month) when is_integer(year) and is_integer(month) do
    first_day = Date.new!(year, month, 1)
    last_day = Date.end_of_month(first_day)

    ninety_days_ago = Date.add(Date.utc_today(), -90)

    url = if Date.compare(first_day, ninety_days_ago) == :gt, do: @hist_90d_url, else: @hist_full_url

    case fetch_and_parse(url) do
      {:ok, days} ->
        month_rates =
          days
          |> Enum.filter(fn day ->
            Date.compare(day.date, first_day) != :lt and
              Date.compare(day.date, last_day) != :gt
          end)
          |> Enum.sort_by(& &1.date, Date)

        {:ok, month_rates}

      error ->
        error
    end
  end

  @doc """
  Returns the fixed BGN/EUR rate.
  BGN is pegged to EUR at 1.95583 BGN = 1 EUR.
  """
  def bgn_fixed_rate, do: @bgn_fixed_rate

  # Private functions

  defp fetch_and_parse(url) do
    case Finch.build(:get, url) |> Finch.request(@service_name) do
      {:ok, %Finch.Response{status: 200, body: body}} ->
        parse_ecb_xml(body)

      {:ok, %Finch.Response{status: status, body: body}} ->
        Logger.error("ECB fetch failed with status #{status}: #{body}")
        {:error, {:http_error, status}}

      {:error, reason} ->
        Logger.error("ECB connection error: #{inspect(reason)}")
        {:error, {:connection_failed, reason}}
    end
  end

  defp parse_ecb_xml(xml_body) do
    try do
      days =
        xml_body
        |> xpath(
          ~x"//Cube[@time]"l,
          date: ~x"./@time"s,
          rates: [
            ~x"./Cube"l,
            currency: ~x"./@currency"s,
            rate: ~x"./@rate"s
          ]
        )
        |> Enum.map(fn day ->
          {:ok, date} = Date.from_iso8601(day.date)

          rates =
            Enum.map(day.rates, fn rate ->
              %{
                currency: rate.currency,
                rate: Decimal.new(rate.rate)
              }
            end)

          %{date: date, rates: rates}
        end)

      {:ok, days}
    rescue
      e ->
        Logger.error("Failed to parse ECB XML: #{inspect(e)}")
        {:error, :parse_failed}
    end
  end

  defp find_closest_rate(days, target_date) do
    # Find the most recent rate before or equal to the target date
    closest =
      days
      |> Enum.filter(fn day -> Date.compare(day.date, target_date) != :gt end)
      |> Enum.sort_by(& &1.date, {:desc, Date})
      |> List.first()

    case closest do
      nil -> {:error, :no_rate_found_for_date}
      day -> {:ok, day}
    end
  end
end
