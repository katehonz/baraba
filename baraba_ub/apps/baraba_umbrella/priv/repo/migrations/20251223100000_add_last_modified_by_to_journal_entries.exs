defmodule BarabaUmbrella.Repo.Migrations.AddLastModifiedByToJournalEntries do
  use Ecto.Migration

  def change do
    alter table(:journal_entries) do
      add :last_modified_by_id, references(:users, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:journal_entries, [:last_modified_by_id])
  end
end
