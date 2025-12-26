defmodule BarabaUmbrella.Repo.Migrations.AddLongAddressToCounterparts do
  use Ecto.Migration

  def change do
    alter table(:counterparts) do
      add :long_address, :text
    end
  end
end
