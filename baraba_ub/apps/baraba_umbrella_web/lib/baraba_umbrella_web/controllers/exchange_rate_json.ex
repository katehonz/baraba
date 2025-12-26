defmodule BarabaUmbrellaWeb.ExchangeRateJSON do
  def index(%{exchange_rates: exchange_rates}) do
    %{data: for(rate <- exchange_rates, do: data(rate))}
  end

  def show(%{exchange_rate: exchange_rate}) do
    %{data: data(exchange_rate)}
  end

  defp data(rate) do
    %{
      id: rate.id,
      rate: rate.rate,
      reverse_rate: rate.reverse_rate,
      valid_date: rate.valid_date,
      rate_source: rate.rate_source,
      is_active: rate.is_active,
      from_currency: currency_data(rate.from_currency),
      to_currency: currency_data(rate.to_currency)
    }
  end

  defp currency_data(nil), do: nil
  defp currency_data(currency) do
    %{
      id: currency.id,
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol
    }
  end
end
