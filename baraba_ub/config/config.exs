# This file is responsible for configuring your umbrella
# and **all applications** and their dependencies with the
# help of the Config module.
#
# Note that all applications in your umbrella share the
# same configuration and dependencies, which is why they
# all use the same configuration file. If you want different
# configurations or dependencies per app, it is best to
# move said applications out of the umbrella.
import Config

# Configure Mix tasks and generators
config :baraba_umbrella,
  ecto_repos: [BarabaUmbrella.Repo]

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :baraba_umbrella, BarabaUmbrella.Mailer, adapter: Swoosh.Adapters.Local

config :baraba_umbrella_web,
  ecto_repos: [BarabaUmbrella.Repo],
  generators: [context_app: :baraba_umbrella]

# Configures the endpoint
config :baraba_umbrella_web, BarabaUmbrellaWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: BarabaUmbrellaWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: BarabaUmbrella.PubSub,
  live_view: [signing_salt: "EqhUlOun"]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Configure Jasper Service URL (default for dev/test)
config :baraba_umbrella, :jasper_service_url, "http://localhost:5005"
config :baraba_umbrella, :vies_service_url, "http://localhost:5003"
config :baraba_umbrella, :vat_service_url, "http://localhost:5004"

# Identity Service URL for auth checks
config :baraba_umbrella_web,
       :identity_service_url,
       System.get_env("IDENTITY_SERVICE_URL", "http://localhost:5002")

# JWT Configuration - shared with identity_service
config :baraba_umbrella_web,
       :jwt_secret,
       System.get_env("JWT_SECRET", "changeme-set-JWT_SECRET-env-var")

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
