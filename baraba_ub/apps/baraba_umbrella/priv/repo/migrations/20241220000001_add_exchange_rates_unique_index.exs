defmodule BarabaUmbrella.Repo.Migrations.AddExchangeRatesUniqueIndex do
  use Ecto.Migration

  def change do
    create unique_index(:exchange_rates, [:from_currency_id, :to_currency_id, :valid_date],
      name: :exchange_rates_currency_pair_date_unique)
  end
end
