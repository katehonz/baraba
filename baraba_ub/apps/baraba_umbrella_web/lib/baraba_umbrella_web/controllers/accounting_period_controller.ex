defmodule BarabaUmbrellaWeb.AccountingPeriodController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Accounting
  alias BarabaUmbrella.Accounting.AccountingPeriod

  action_fallback(BarabaUmbrellaWeb.FallbackController)

  def index(conn, %{"company_id" => company_id} = params) do
    opts = %{
      year: Map.get(params, "year") |> maybe_parse_integer(),
      month: Map.get(params, "month") |> maybe_parse_integer(),
      status: Map.get(params, "status")
    }

    accounting_periods = Accounting.list_accounting_periods(company_id, opts)
    render(conn, :index, accounting_periods: accounting_periods)
  end

  def show(conn, %{"company_id" => company_id, "year" => year, "month" => month}) do
    accounting_period = Accounting.get_accounting_period!(company_id, year, month)
    render(conn, :show, accounting_period: accounting_period)
  end

  def create(conn, %{"company_id" => company_id, "accounting_period" => period_params}) do
    period_params = Map.put(period_params, "company_id", company_id)

    case Accounting.create_accounting_period(period_params) do
      {:ok, accounting_period} ->
        conn
        |> put_status(:created)
        |> put_resp_header(
          "location",
          ~p"/api/companies/#{company_id}/accounting-periods/#{accounting_period.year}/#{accounting_period.month}"
        )
        |> render(:show, accounting_period: accounting_period)

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def close(
        conn,
        %{"company_id" => company_id, "year" => year, "month" => month, "user_id" => user_id} =
          params
      ) do
    accounting_period = Accounting.get_accounting_period!(company_id, year, month)
    notes = Map.get(params, "notes")

    case Accounting.close_accounting_period(accounting_period, user_id, notes) do
      {:ok, updated_period} ->
        render(conn, :show, accounting_period: updated_period)

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def reopen(conn, %{"company_id" => company_id, "year" => year, "month" => month}) do
    accounting_period = Accounting.get_accounting_period!(company_id, year, month)

    case Accounting.reopen_accounting_period(accounting_period) do
      {:ok, updated_period} ->
        render(conn, :show, accounting_period: updated_period)

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def initialize_year(conn, %{"company_id" => company_id, "year" => year}) do
    case Accounting.get_or_create_year_periods(company_id, year) do
      periods when is_list(periods) ->
        conn
        |> put_status(:created)
        |> render(:index, accounting_periods: periods)

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "Failed to initialize periods: #{inspect(reason)}"})
    end
  end

  defp maybe_parse_integer(nil), do: nil

  defp maybe_parse_integer(str) when is_binary(str) do
    case Integer.parse(str) do
      {int, ""} -> int
      _ -> nil
    end
  end

  defp maybe_parse_integer(int) when is_integer(int), do: int
end
