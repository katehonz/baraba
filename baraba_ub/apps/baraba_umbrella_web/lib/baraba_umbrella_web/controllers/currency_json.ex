defmodule BarabaUmbrellaWeb.CurrencyJSON do
  def index(%{currencies: currencies}) do
    %{data: for(currency <- currencies, do: data(currency))}
  end

  def show(%{currency: currency}) do
    %{data: data(currency)}
  end

  def error(%{changeset: changeset}) do
    %{errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)}
  end

  defp data(currency) do
    %{
      id: currency.id,
      code: currency.code,
      name: currency.name,
      name_bg: currency.name_bg,
      symbol: currency.symbol,
      decimal_places: currency.decimal_places,
      is_active: currency.is_active,
      is_base_currency: currency.is_base_currency,
      bnb_code: currency.bnb_code
    }
  end

  defp translate_error({msg, opts}) do
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", to_string(value))
    end)
  end
end
