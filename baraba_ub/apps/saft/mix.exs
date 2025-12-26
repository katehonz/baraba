defmodule Saft.MixProject do
  use Mix.Project

  def project do
    [
      app: :saft,
      version: "0.1.0",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      elixir: "~> 1.14",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      extra_applications: [:logger],
      mod: {Saft.Application, []}
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:baraba_umbrella, in_umbrella: true},
      {:plug_cowboy, "~> 2.6"},
      {:erlsom, "~> 1.5"}
    ]
  end
end
