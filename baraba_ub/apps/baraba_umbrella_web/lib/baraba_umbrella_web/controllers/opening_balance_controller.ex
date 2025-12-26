defmodule BarabaUmbrellaWeb.OpeningBalanceController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Accounting
  alias BarabaUmbrella.Repo

  action_fallback(BarabaUmbrellaWeb.FallbackController)

  def index(conn, %{"company_id" => company_id} = params) do
    opts = build_filter_opts(params)
    opening_balances = Accounting.list_opening_balances(company_id, opts)
    render(conn, :index, opening_balances: opening_balances)
  end

  def show(conn, %{"company_id" => _company_id, "id" => id}) do
    opening_balance = Accounting.get_opening_balance!(id) |> Repo.preload([:account])
    render(conn, :show, opening_balance: opening_balance)
  end

  def create(conn, %{"company_id" => company_id, "opening_balance" => balance_params}) do
    balance_params = Map.put(balance_params, "company_id", company_id)

    case Accounting.create_opening_balance(balance_params) do
      {:ok, opening_balance} ->
        opening_balance = Repo.preload(opening_balance, [:account])
        conn
        |> put_status(:created)
        |> put_resp_header(
          "location",
          ~p"/api/companies/#{company_id}/opening-balances/#{opening_balance.id}"
        )
        |> render(:show, opening_balance: opening_balance)

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def update(conn, %{"company_id" => _company_id, "id" => id, "opening_balance" => balance_params}) do
    opening_balance = Accounting.get_opening_balance!(id)

    case Accounting.update_opening_balance(opening_balance, balance_params) do
      {:ok, updated_balance} ->
        updated_balance = Repo.preload(updated_balance, [:account])
        render(conn, :show, opening_balance: updated_balance)

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def delete(conn, %{"company_id" => _company_id, "id" => id}) do
    opening_balance = Accounting.get_opening_balance!(id)

    case Accounting.delete_opening_balance(opening_balance) do
      {:ok, _} ->
        send_resp(conn, :no_content, "")

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: reason})
    end
  end

  defp build_filter_opts(params) do
    %{}
    |> maybe_add_date_filter(params)
    |> maybe_add_year_filter(params)
    |> maybe_add_month_filter(params)
  end

  defp maybe_add_date_filter(opts, %{"date" => date}) when is_binary(date) and date != "" do
    case Date.from_iso8601(date) do
      {:ok, parsed_date} -> Map.put(opts, :date, parsed_date)
      _ -> opts
    end
  end
  defp maybe_add_date_filter(opts, _), do: opts

  defp maybe_add_year_filter(opts, %{"year" => year}) when is_binary(year) do
    case Integer.parse(year) do
      {int, ""} -> Map.put(opts, :year, int)
      _ -> opts
    end
  end
  defp maybe_add_year_filter(opts, _), do: opts

  defp maybe_add_month_filter(opts, %{"month" => month}) when is_binary(month) do
    case Integer.parse(month) do
      {int, ""} -> Map.put(opts, :month, int)
      _ -> opts
    end
  end
  defp maybe_add_month_filter(opts, _), do: opts
end
