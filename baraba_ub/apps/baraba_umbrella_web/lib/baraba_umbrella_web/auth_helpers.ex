defmodule BarabaUmbrellaWeb.AuthHelpers do
  @moduledoc """
  Helper functions for authentication and authorization.

  Provides functions to check user permissions from identity_service.
  """

  import Plug.Conn
  require Logger

  @identity_service_url Application.compile_env(
                          :baraba_umbrella_web,
                          :identity_service_url,
                          "http://localhost:5002"
                        )

  @doc """
  Check if user has a specific permission.

  Permissions:
  - can_create_companies
  - can_edit_companies
  - can_delete_companies
  - can_manage_users
  - can_view_reports
  - can_post_entries
  """
  def check_permission(conn, permission) when is_binary(permission) do
    user_id = conn.assigns[:user_id]
    token = get_auth_token(conn)

    if user_id && token do
      check_permission_api(token, permission)
    else
      false
    end
  end

  def check_permission(_, _), do: false

  @doc """
  Get user permissions from identity_service.
  Returns a map with all permissions.
  """
  def get_user_permissions(conn) do
    user_id = conn.assigns[:user_id]
    token = get_auth_token(conn)

    if user_id && token do
      get_permissions_api(token)
    else
      %{}
    end
  end

  @doc """
  Check if user is superadmin.
  """
  def is_superadmin?(conn) do
    conn.assigns[:is_superadmin] == true
  end

  @doc """
  Check if user has access to a company.

  Superadmin has access to all companies.
  Regular users have access only to companies assigned to them.
  """
  def has_company_access?(conn, company_id) when is_binary(company_id) do
    if is_superadmin?(conn) do
      true
    else
      user_id = conn.assigns[:user_id]
      token = get_auth_token(conn)

      if user_id && token do
        check_company_access_api(token, company_id)
      else
        false
      end
    end
  end

  def has_company_access?(_, _), do: false

  @doc """
  Get all companies the user has access to.
  """
  def get_user_companies(conn) do
    token = get_auth_token(conn)

    if token do
      get_companies_api(token)
    else
      []
    end
  end

  # API helpers

  defp check_permission_api(token, permission) do
    url = "#{@identity_service_url}/api/auth/check-permission"

    headers = [
      {"Content-Type", "application/json"},
      {"Authorization", "Bearer #{token}"}
    ]

    body = Jason.encode!(%{permission: permission})

    case HTTPoison.post(url, body, headers, recv_timeout: 5000) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"allowed" => allowed}} -> allowed
          _ -> false
        end

      _ ->
        Logger.error("Failed to check permission #{permission}")
        false
    end
  end

  defp get_permissions_api(token) do
    url = "#{@identity_service_url}/api/auth/me"

    headers = [
      {"Authorization", "Bearer #{token}"}
    ]

    case HTTPoison.get(url, headers, recv_timeout: 5000) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"permissions" => permissions}} -> permissions
          _ -> %{}
        end

      _ ->
        Logger.error("Failed to get user permissions")
        %{}
    end
  end

  defp check_company_access_api(token, company_id) do
    url = "#{@identity_service_url}/api/auth/me"

    headers = [
      {"Authorization", "Bearer #{token}"}
    ]

    case HTTPoison.get(url, headers, recv_timeout: 5000) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"companies" => companies}} when is_list(companies) ->
            Enum.any?(companies, fn company ->
              company["companyId"] == company_id
            end)

          _ ->
            false
        end

      _ ->
        Logger.error("Failed to check company access")
        false
    end
  end

  defp get_companies_api(token) do
    url = "#{@identity_service_url}/api/auth/me"

    headers = [
      {"Authorization", "Bearer #{token}"}
    ]

    case HTTPoison.get(url, headers, recv_timeout: 5000) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"companies" => companies}} when is_list(companies) -> companies
          _ -> []
        end

      _ ->
        Logger.error("Failed to get user companies")
        []
    end
  end

  defp get_auth_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> token
      _ -> nil
    end
  end
end
