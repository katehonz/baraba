defmodule BarabaUmbrellaWeb.CurrencyRevaluationController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Accounting

  def index(conn, %{"company_id" => company_id} = params) do
    opts = %{}
    opts = if params["status"], do: Map.put(opts, :status, params["status"]), else: opts

    revaluations = Accounting.list_currency_revaluations(company_id, opts)
    render(conn, :index, revaluations: revaluations)
  end

  def show(conn, %{"id" => id}) do
    revaluation = Accounting.get_currency_revaluation!(id)
    render(conn, :show, revaluation: revaluation)
  end

  @doc """
  Preview revaluation without creating records.
  POST /api/companies/:company_id/currency-revaluations/preview
  Body: { "year": 2024, "month": 12 }
  """
  def preview(conn, %{"company_id" => company_id, "year" => year, "month" => month}) do
    year = if is_binary(year), do: String.to_integer(year), else: year
    month = if is_binary(month), do: String.to_integer(month), else: month

    case Accounting.preview_currency_revaluation(company_id, year, month) do
      {:ok, preview} ->
        json(conn, %{
          success: true,
          data: render_preview(preview)
        })

      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{success: false, error: reason})
    end
  end

  @doc """
  Create a revaluation (saves to database, but not posted).
  POST /api/companies/:company_id/currency-revaluations
  Body: { "year": 2024, "month": 12 }
  """
  def create(conn, %{"company_id" => company_id, "year" => year, "month" => month}) do
    year = if is_binary(year), do: String.to_integer(year), else: year
    month = if is_binary(month), do: String.to_integer(month), else: month
    user_id = conn.assigns[:current_user_id]

    case Accounting.create_currency_revaluation(company_id, year, month, user_id) do
      {:ok, revaluation} ->
        conn
        |> put_status(:created)
        |> render(:show, revaluation: revaluation)

      {:error, reason} when is_binary(reason) ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: reason})

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:errors, changeset: changeset)
    end
  end

  @doc """
  Post a revaluation (creates journal entry).
  POST /api/companies/:company_id/currency-revaluations/:id/post
  """
  def post_revaluation(conn, %{"id" => id}) do
    user_id = conn.assigns[:current_user_id]

    case Accounting.post_currency_revaluation(id, user_id) do
      {:ok, revaluation} ->
        json(conn, %{
          success: true,
          revaluation: render_revaluation(revaluation),
          journal_entry_id: revaluation.journal_entry_id
        })

      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{success: false, error: reason})
    end
  end

  @doc """
  Reverse a posted revaluation.
  POST /api/companies/:company_id/currency-revaluations/:id/reverse
  """
  def reverse(conn, %{"id" => id}) do
    user_id = conn.assigns[:current_user_id]

    case Accounting.reverse_currency_revaluation(id, user_id) do
      {:ok, revaluation} ->
        json(conn, %{
          success: true,
          revaluation: render_revaluation(revaluation)
        })

      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{success: false, error: reason})
    end
  end

  @doc """
  Delete a pending revaluation.
  DELETE /api/companies/:company_id/currency-revaluations/:id
  """
  def delete(conn, %{"id" => id}) do
    revaluation = Accounting.get_currency_revaluation!(id)

    case Accounting.delete_currency_revaluation(revaluation) do
      {:ok, _} ->
        send_resp(conn, :no_content, "")

      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: reason})
    end
  end

  @doc """
  Get revaluable accounts for a company.
  GET /api/companies/:company_id/currency-revaluations/revaluable-accounts
  """
  def revaluable_accounts(conn, %{"company_id" => company_id}) do
    accounts = Accounting.list_revaluable_accounts(company_id)
    render(conn, :accounts, accounts: accounts)
  end

  defp render_preview(preview) do
    %{
      year: preview.year,
      month: preview.month,
      revaluation_date: preview.revaluation_date,
      total_gains: preview.total_gains,
      total_losses: preview.total_losses,
      net_result: preview.net_result,
      fx_gains_account_id: preview.fx_gains_account_id,
      fx_losses_account_id: preview.fx_losses_account_id,
      lines: Enum.map(preview.lines, &render_preview_line/1)
    }
  end

  defp render_preview_line(line) do
    %{
      account_id: line.account_id,
      currency_id: line.currency_id,
      foreign_debit_balance: line.foreign_debit_balance,
      foreign_credit_balance: line.foreign_credit_balance,
      foreign_net_balance: line.foreign_net_balance,
      recorded_base_balance: line.recorded_base_balance,
      exchange_rate: line.exchange_rate,
      revalued_base_balance: line.revalued_base_balance,
      revaluation_difference: line.revaluation_difference,
      is_gain: line.is_gain
    }
  end

  defp render_revaluation(revaluation) do
    %{
      id: revaluation.id,
      year: revaluation.year,
      month: revaluation.month,
      status: revaluation.status,
      total_gains: revaluation.total_gains,
      total_losses: revaluation.total_losses,
      net_result: revaluation.net_result,
      journal_entry_id: revaluation.journal_entry_id
    }
  end
end
