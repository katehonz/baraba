defmodule BarabaUmbrella.Repo.Migrations.CreateCurrencies do
  use Ecto.Migration

  def change do
    create table(:currencies, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :code, :string, null: false
      add :name, :string, null: false
      add :name_bg, :string
      add :symbol, :string
      add :decimal_places, :integer, default: 2
      add :is_active, :boolean, default: true
      add :is_base_currency, :boolean, default: false
      add :bnb_code, :string

      timestamps()
    end

    create unique_index(:currencies, [:code])

    create table(:exchange_rates, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :rate, :decimal, precision: 15, scale: 6, null: false
      add :reverse_rate, :decimal, precision: 15, scale: 6
      add :valid_date, :date, null: false
      add :rate_source, :string, default: "MANUAL"
      add :bnb_rate_id, :string
      add :is_active, :boolean, default: true
      add :notes, :text
      add :from_currency_id, references(:currencies, type: :binary_id, on_delete: :delete_all), null: false
      add :to_currency_id, references(:currencies, type: :binary_id, on_delete: :delete_all), null: false
      add :created_by_id, references(:users, type: :binary_id, on_delete: :nilify_all)

      timestamps()
    end

    create index(:exchange_rates, [:from_currency_id])
    create index(:exchange_rates, [:to_currency_id])
    create index(:exchange_rates, [:valid_date])
  end
end
