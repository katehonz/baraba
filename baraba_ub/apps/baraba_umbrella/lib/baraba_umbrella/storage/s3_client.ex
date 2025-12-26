defmodule BarabaUmbrella.Storage.S3Client do
  @moduledoc """
  S3 client wrapper for Hetzner Object Storage.
  Provides functions for file upload, download, listing, and connection testing.
  """

  alias ExAws.S3

  @doc """
  Build ExAws config from company S3 settings.
  """
  def config(company) do
    [
      access_key_id: company.s3_access_key,
      secret_access_key: company.s3_secret_key,
      region: company.s3_region || "eu-central-1",
      host: extract_host(company.s3_endpoint),
      scheme: extract_scheme(company.s3_endpoint)
    ]
  end

  defp extract_host(nil), do: nil
  defp extract_host(endpoint) do
    endpoint
    |> String.replace(~r{^https?://}, "")
    |> String.trim_trailing("/")
  end

  defp extract_scheme(nil), do: "https://"
  defp extract_scheme(endpoint) do
    if String.starts_with?(endpoint, "http://"), do: "http://", else: "https://"
  end

  @doc """
  Test S3 connection by listing bucket contents.
  Returns {:ok, :connected} or {:error, reason}.
  """
  def test_connection(company) do
    case S3.list_objects(company.s3_bucket, max_keys: 1)
         |> ExAws.request(config(company)) do
      {:ok, _} -> {:ok, :connected}
      {:error, {:http_error, status, _}} -> {:error, "HTTP error: #{status}"}
      {:error, reason} -> {:error, inspect(reason)}
    end
  end

  @doc """
  Upload a file to S3.

  ## Parameters
    - company: Company struct with S3 config
    - key: The S3 object key (path)
    - content: Binary content to upload
    - opts: Optional keyword list with :content_type, :acl, etc.
  """
  def upload_file(company, key, content, opts \\ []) do
    full_key = build_key(company.s3_folder_prefix, key)
    content_type = Keyword.get(opts, :content_type, "application/octet-stream")

    S3.put_object(company.s3_bucket, full_key, content, content_type: content_type)
    |> ExAws.request(config(company))
    |> case do
      {:ok, _} -> {:ok, full_key}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Upload a file from disk to S3.
  """
  def upload_file_from_path(company, key, file_path, opts \\ []) do
    case File.read(file_path) do
      {:ok, content} ->
        content_type = Keyword.get(opts, :content_type, MIME.from_path(file_path))
        upload_file(company, key, content, Keyword.put(opts, :content_type, content_type))
      {:error, reason} ->
        {:error, "Failed to read file: #{reason}"}
    end
  end

  @doc """
  Download a file from S3.
  Returns {:ok, binary_content} or {:error, reason}.
  """
  def download_file(company, key) do
    full_key = build_key(company.s3_folder_prefix, key)

    S3.get_object(company.s3_bucket, full_key)
    |> ExAws.request(config(company))
    |> case do
      {:ok, %{body: body}} -> {:ok, body}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  List files in S3 bucket with optional prefix.
  Returns {:ok, list_of_objects} or {:error, reason}.
  """
  def list_files(company, prefix \\ nil) do
    full_prefix = build_key(company.s3_folder_prefix, prefix)

    opts = if full_prefix, do: [prefix: full_prefix], else: []

    S3.list_objects(company.s3_bucket, opts)
    |> ExAws.request(config(company))
    |> case do
      {:ok, %{body: %{contents: contents}}} ->
        files = Enum.map(contents, fn obj ->
          %{
            key: obj.key,
            size: String.to_integer(obj.size),
            last_modified: obj.last_modified,
            etag: obj.etag
          }
        end)
        {:ok, files}
      {:ok, %{body: _}} ->
        {:ok, []}
      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  Delete a file from S3.
  """
  def delete_file(company, key) do
    full_key = build_key(company.s3_folder_prefix, key)

    S3.delete_object(company.s3_bucket, full_key)
    |> ExAws.request(config(company))
    |> case do
      {:ok, _} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Generate a presigned URL for downloading a file.
  """
  def presigned_url(company, key, opts \\ []) do
    full_key = build_key(company.s3_folder_prefix, key)
    expires_in = Keyword.get(opts, :expires_in, 3600)

    config = config(company)

    ExAws.S3.presigned_url(config, :get, company.s3_bucket, full_key, expires_in: expires_in)
  end

  # Build full key with optional prefix
  defp build_key(nil, key), do: key
  defp build_key("", key), do: key
  defp build_key(prefix, nil), do: String.trim_trailing(prefix, "/")
  defp build_key(prefix, key) do
    prefix = String.trim_trailing(prefix, "/")
    key = String.trim_leading(key, "/")
    "#{prefix}/#{key}"
  end
end
