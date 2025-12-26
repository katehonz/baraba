defmodule BarabaUmbrellaWeb.Plugs.Authenticate do
  @moduledoc """
  JWT Authentication Plug for Phoenix API.

  Verifies JWT tokens from identity_service and adds user claims to conn.assigns.

  The token should be in the Authorization header as "Bearer <token>".
  """

  import Plug.Conn
  import Phoenix.Controller
  require Logger

  def init(opts), do: opts

  def call(conn, _opts) do
    token = get_auth_token(conn)

    case verify_token(token) do
      {:ok, claims} ->
        user_id = parse_user_id(claims["sub"])
        group_id = parse_group_id(claims["group_id"])

        conn
        |> assign(:user_id, user_id)
        |> assign(:username, claims["username"])
        |> assign(:group_id, group_id)
        |> assign(:is_superadmin, group_id == 1)
        |> assign(:authenticated, true)

      {:error, reason} ->
        Logger.warning("JWT verification failed: #{inspect(reason)}")

        conn
        |> put_status(:unauthorized)
        |> put_resp_content_type("application/json")
        |> json(%{error: "Invalid or missing authentication token", reason: "#{reason}"})
        |> halt()
    end
  end

  defp get_auth_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> token
      _ -> nil
    end
  end

  defp verify_token(nil), do: {:error, "No token provided"}

  defp verify_token(token) when is_binary(token) do
    secret = get_jwt_secret()

    # Use the simple Joken.verify/2 API
    signer = Joken.Signer.create("HS256", secret)

    try do
      # Decode and verify signature
      case Joken.verify(token, signer) do
        {:ok, claims} ->
          # Verify expiration manually
          exp = claims["exp"]

          if exp && exp > Joken.current_time() do
            {:ok, claims}
          else
            {:error, "Token expired"}
          end

        {:error, reason} ->
          {:error, reason}
      end
    rescue
      e ->
        Logger.error("JWT verification error: #{inspect(e)}")
        {:error, "Invalid token"}
    end
  end

  defp parse_user_id(sub) when is_binary(sub) do
    case Integer.parse(sub) do
      {id, ""} -> id
      _ -> nil
    end
  end

  defp parse_user_id(_), do: nil

  defp parse_group_id(group_id) when is_binary(group_id) do
    case Integer.parse(group_id) do
      {id, ""} -> id
      _ -> nil
    end
  end

  defp parse_group_id(_), do: nil

  defp get_jwt_secret do
    Application.get_env(:baraba_umbrella_web, :jwt_secret) ||
      raise "JWT_SECRET not configured"
  end
end
