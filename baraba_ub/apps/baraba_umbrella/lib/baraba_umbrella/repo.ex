defmodule BarabaUmbrella.Repo do
  use Ecto.Repo,
    otp_app: :baraba_umbrella,
    adapter: Ecto.Adapters.Postgres
end
