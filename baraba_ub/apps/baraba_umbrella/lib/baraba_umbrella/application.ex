defmodule BarabaUmbrella.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      BarabaUmbrella.Repo,
      {DNSCluster, query: Application.get_env(:baraba_umbrella, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: BarabaUmbrella.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: BarabaUmbrella.Finch},
      # Start the S3 backup worker
      BarabaUmbrella.Storage.BackupWorker
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: BarabaUmbrella.Supervisor)
  end
end
