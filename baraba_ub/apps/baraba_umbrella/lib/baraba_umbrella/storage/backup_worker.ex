defmodule BarabaUmbrella.Storage.BackupWorker do
  @moduledoc """
  GenServer for scheduled database backups to S3.
  Supports both automatic scheduled backups and manual triggers.
  """

  use GenServer
  require Logger

  alias BarabaUmbrella.Accounting
  alias BarabaUmbrella.Storage.S3Client

  @backup_interval :timer.hours(24)

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Trigger a manual backup for a specific company.
  """
  def backup_now(company) do
    GenServer.call(__MODULE__, {:backup_now, company}, :timer.minutes(10))
  end

  @impl true
  def init(_opts) do
    # Schedule first backup check
    schedule_backup()
    {:ok, %{}}
  end

  @impl true
  def handle_call({:backup_now, company}, _from, state) do
    result = do_backup(company)
    {:reply, result, state}
  end

  @impl true
  def handle_info(:scheduled_backup, state) do
    # Get all companies with S3 enabled
    companies = Accounting.list_companies()

    for company <- companies, company.s3_enabled do
      case do_backup(company) do
        {:ok, key} ->
          Logger.info("Scheduled backup completed for company #{company.name}: #{key}")
        {:error, reason} ->
          Logger.error("Scheduled backup failed for company #{company.name}: #{reason}")
      end
    end

    schedule_backup()
    {:noreply, state}
  end

  defp schedule_backup do
    Process.send_after(self(), :scheduled_backup, @backup_interval)
  end

  defp do_backup(company) do
    with {:ok, dump_path} <- create_db_dump(company),
         {:ok, key} <- upload_dump(company, dump_path) do
      # Cleanup local file
      File.rm(dump_path)
      {:ok, key}
    else
      {:error, reason} ->
        Logger.error("Backup failed for company #{company.id}: #{inspect(reason)}")
        {:error, inspect(reason)}
    end
  end

  defp create_db_dump(company) do
    # Get database config from repo
    config = BarabaUmbrella.Repo.config()

    timestamp = DateTime.utc_now() |> DateTime.to_iso8601(:basic) |> String.replace(~r/[:\-]/, "")
    filename = "backup_#{company.eik}_#{timestamp}.sql.gz"
    dump_path = Path.join(System.tmp_dir!(), filename)

    # Build pg_dump command
    env = [
      {"PGPASSWORD", config[:password] || ""}
    ]

    args = [
      "-h", config[:hostname] || "localhost",
      "-p", to_string(config[:port] || 5432),
      "-U", config[:username] || "postgres",
      "-d", config[:database],
      "-F", "c",  # custom format (compressed)
      "-f", dump_path
    ]

    case System.cmd("pg_dump", args, env: env, stderr_to_stdout: true) do
      {_output, 0} ->
        {:ok, dump_path}
      {output, exit_code} ->
        {:error, "pg_dump failed (exit #{exit_code}): #{output}"}
    end
  end

  defp upload_dump(company, dump_path) do
    timestamp = DateTime.utc_now() |> DateTime.to_iso8601(:basic) |> String.replace(~r/[:\-]/, "")
    key = "backups/#{company.eik}/#{timestamp}.dump"

    case File.read(dump_path) do
      {:ok, content} ->
        case S3Client.upload_file(company, key, content, content_type: "application/octet-stream") do
          {:ok, full_key} -> {:ok, full_key}
          {:error, reason} -> {:error, reason}
        end
      {:error, reason} ->
        {:error, "Failed to read dump file: #{reason}"}
    end
  end
end
