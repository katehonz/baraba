defmodule BarabaUmbrellaWeb.ExchangeRateController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Accounting

  def index(conn, params) do
    opts = %{}
    opts = if params["from_currency_id"], do: Map.put(opts, :from_currency_id, params["from_currency_id"]), else: opts
    opts = if params["to_currency_id"], do: Map.put(opts, :to_currency_id, params["to_currency_id"]), else: opts
    opts = if params["limit"], do: Map.put(opts, :limit, String.to_integer(params["limit"])), else: opts

    exchange_rates = Accounting.list_exchange_rates_filtered(opts)
    render(conn, :index, exchange_rates: exchange_rates)
  end

  def fetch_latest(conn, _params) do
    case Accounting.import_ecb_latest_rates() do
      {:ok, result} ->
        json(conn, %{
          success: true,
          date: Date.to_iso8601(result.date),
          imported_count: result.imported_count,
          message: "Successfully imported #{result.imported_count} exchange rates for #{result.date}"
        })

      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{success: false, error: inspect(reason)})
    end
  end

  def fetch_date(conn, %{"date" => date_str}) do
    case Date.from_iso8601(date_str) do
      {:ok, date} ->
        case Accounting.import_ecb_rates_for_date(date) do
          {:ok, result} ->
            json(conn, %{
              success: true,
              date: Date.to_iso8601(result.date),
              imported_count: result.imported_count,
              message: "Successfully imported #{result.imported_count} exchange rates for #{result.date}"
            })

          {:error, reason} ->
            conn
            |> put_status(:bad_request)
            |> json(%{success: false, error: inspect(reason)})
        end

      {:error, _} ->
        conn
        |> put_status(:bad_request)
        |> json(%{success: false, error: "Invalid date format. Use YYYY-MM-DD"})
    end
  end

  def fetch_month(conn, %{"year" => year_str, "month" => month_str}) do
    with {year, ""} <- Integer.parse(year_str),
         {month, ""} <- Integer.parse(month_str),
         true <- month >= 1 and month <= 12 do

      case Accounting.import_ecb_rates_for_month(year, month) do
        {:ok, result} ->
          json(conn, %{
            success: true,
            year: year,
            month: month,
            days_count: result.days_count,
            imported_count: result.imported_count,
            message: "Successfully imported #{result.imported_count} exchange rates for #{result.days_count} days in #{year}-#{String.pad_leading(Integer.to_string(month), 2, "0")}"
          })

        {:error, reason} ->
          conn
          |> put_status(:bad_request)
          |> json(%{success: false, error: inspect(reason)})
      end
    else
      _ ->
        conn
        |> put_status(:bad_request)
        |> json(%{success: false, error: "Invalid year or month. Year must be a number, month must be 1-12"})
    end
  end
end
