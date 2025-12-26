defmodule BarabaUmbrellaWeb.CurrencyRevaluationJSON do
  alias BarabaUmbrella.Accounting.CurrencyRevaluation
  alias BarabaUmbrella.Accounting.CurrencyRevaluationLine

  def index(%{revaluations: revaluations}) do
    %{data: for(r <- revaluations, do: data(r))}
  end

  def show(%{revaluation: revaluation}) do
    %{data: data_with_lines(revaluation)}
  end

  def accounts(%{accounts: accounts}) do
    %{data: for(a <- accounts, do: account_data(a))}
  end

  def errors(%{changeset: changeset}) do
    %{errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)}
  end

  defp data(%CurrencyRevaluation{} = r) do
    %{
      id: r.id,
      year: r.year,
      month: r.month,
      revaluation_date: r.revaluation_date,
      status: r.status,
      total_gains: r.total_gains,
      total_losses: r.total_losses,
      net_result: r.net_result,
      notes: r.notes,
      journal_entry_id: r.journal_entry_id,
      posted_at: r.posted_at,
      inserted_at: r.inserted_at,
      updated_at: r.updated_at
    }
  end

  defp data_with_lines(%CurrencyRevaluation{} = r) do
    data(r)
    |> Map.put(:lines, for(l <- r.lines || [], do: line_data(l)))
  end

  defp line_data(%CurrencyRevaluationLine{} = l) do
    %{
      id: l.id,
      account_id: l.account_id,
      account_code: l.account && l.account.code,
      account_name: l.account && l.account.name,
      currency_id: l.currency_id,
      currency_code: l.currency && l.currency.code,
      foreign_debit_balance: l.foreign_debit_balance,
      foreign_credit_balance: l.foreign_credit_balance,
      foreign_net_balance: l.foreign_net_balance,
      recorded_base_balance: l.recorded_base_balance,
      exchange_rate: l.exchange_rate,
      revalued_base_balance: l.revalued_base_balance,
      revaluation_difference: l.revaluation_difference,
      is_gain: l.is_gain
    }
  end

  defp account_data(account) do
    %{
      id: account.id,
      code: account.code,
      name: account.name,
      is_revaluable: account.is_revaluable,
      is_multi_currency: account.is_multi_currency,
      default_currency_id: account.default_currency_id,
      default_currency_code: account.default_currency && account.default_currency.code
    }
  end

  defp translate_error({msg, opts}) do
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", fn _ -> to_string(value) end)
    end)
  end
end
