defmodule BarabaUmbrellaWeb.AccountJSON do
  alias BarabaUmbrella.Accounting.Account
  
  @doc """
  Renders a list of accounts.
  """
  def index(%{accounts: accounts}) do
    %{data: for(account <- accounts, do: data(account))}
  end
  
  @doc """
  Renders a single account.
  """
  def show(%{account: account}) do
    %{data: data(account)}
  end
  
  @doc """
  Renders error for changeset.
  """
  def error(%{changeset: changeset}) do
    %{
      errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)
    }
  end
  
  defp data(%Account{} = account) do
    %{
      id: account.id,
      code: account.code,
      name: account.name,
      description: account.description,
      account_type: account.account_type,
      account_class: account.account_class,
      level: account.level,
      parent_id: account.parent_id,
      is_active: account.is_active,
      is_system: account.is_system,
      is_analytical: account.is_analytical,
      analytical_group: account.analytical_group,
      can_have_direct_entries: account.can_have_direct_entries,
      vat_applicable: account.vat_applicable,
      saft_account_code: account.saft_account_code,
      saft_account_type: account.saft_account_type,
      is_multi_currency: account.is_multi_currency,
      is_quantity_tracked: account.is_quantity_tracked,
      default_unit: account.default_unit,
      company_id: account.company_id,
      inserted_at: account.inserted_at,
      updated_at: account.updated_at
    }
  end
  
  # Define translate_error/1 function
  defp translate_error({msg, opts}) do
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", to_string(value))
    end)
  end
end