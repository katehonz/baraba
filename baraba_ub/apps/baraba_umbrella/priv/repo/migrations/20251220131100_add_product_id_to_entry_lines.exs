defmodule BarabaUmbrella.Repo.Migrations.AddProductIdToEntryLines do
  use Ecto.Migration

  def change do
    alter table(:entry_lines) do
      add :product_id, references(:products, on_delete: :nilify_all, type: :binary_id)
    end

    create index(:entry_lines, [:product_id])
  end
end
