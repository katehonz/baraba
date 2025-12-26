defmodule BarabaUmbrellaWeb.OpeningBalanceJSON do
  alias BarabaUmbrella.Accounting.OpeningBalance

  @doc """
  Renders a list of opening balances.
  """
  def index(%{opening_balances: opening_balances}) do
    %{data: for(opening_balance <- opening_balances, do: data(opening_balance))}
  end

  @doc """
  Renders a single opening balance.
  """
  def show(%{opening_balance: opening_balance}) do
    %{data: data(opening_balance)}
  end

  @doc """
  Renders error changeset.
  """
  def error(%{changeset: changeset}) do
    %{errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)}
  end

  defp data(%OpeningBalance{} = opening_balance) do
    account = opening_balance.account

    %{
      id: opening_balance.id,
      date: opening_balance.date,
      debit: opening_balance.debit,
      credit: opening_balance.credit,
      account_id: opening_balance.account_id,
      account_code: account && account.code,
      account_name: account && account.name,
      company_id: opening_balance.company_id,
      accounting_period_id: opening_balance.accounting_period_id,
      inserted_at: opening_balance.inserted_at,
      updated_at: opening_balance.updated_at
    }
  end

  defp translate_error({msg, opts}) do
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", fn _ -> to_string(value) end)
    end)
  end
end
