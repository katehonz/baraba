defmodule BarabaUmbrellaWeb.BankAccountJSON do
  alias BarabaUmbrella.Bank.BankAccount

  @doc """
  Renders a list of bank_accounts.
  """
  def index(%{bank_accounts: bank_accounts}) do
    %{data: for(bank_account <- bank_accounts, do: data(bank_account))}
  end

  @doc """
  Renders a single bank_account.
  """
  def show(%{bank_account: bank_account}) do
    %{data: data(bank_account)}
  end

  defp data(%BankAccount{} = bank_account) do
    %{
      id: bank_account.id,
      name: bank_account.name,
      iban: bank_account.iban,
      currency: bank_account.currency,
      import_type: bank_account.import_type,
      saltedge_connection_id: bank_account.saltedge_connection_id,
      account_id: bank_account.account_id,
      account_code: if(Ecto.assoc_loaded?(bank_account.account) && bank_account.account, do: bank_account.account.code, else: nil),
      company_id: bank_account.company_id
    }
  end
end
