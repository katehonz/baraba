defmodule BarabaUmbrellaWeb.S3Controller do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Accounting
  alias BarabaUmbrella.Storage.S3Client

  @doc """
  Test S3 connection with company's configured credentials.
  POST /api/companies/:company_id/s3/test
  """
  def test_connection(conn, %{"company_id" => company_id}) do
    company = Accounting.get_company!(company_id)

    if company.s3_enabled do
      case S3Client.test_connection(company) do
        {:ok, :connected} ->
          json(conn, %{success: true, message: "Successfully connected to S3"})

        {:error, reason} ->
          conn
          |> put_status(:bad_request)
          |> json(%{success: false, error: reason})
      end
    else
      conn
      |> put_status(:bad_request)
      |> json(%{success: false, error: "S3 is not enabled for this company"})
    end
  end

  @doc """
  List files in S3 bucket.
  GET /api/companies/:company_id/s3/files
  """
  def list_files(conn, %{"company_id" => company_id} = params) do
    company = Accounting.get_company!(company_id)
    prefix = Map.get(params, "prefix")

    if company.s3_enabled do
      case S3Client.list_files(company, prefix) do
        {:ok, files} ->
          json(conn, %{data: files})

        {:error, reason} ->
          conn
          |> put_status(:bad_request)
          |> json(%{error: inspect(reason)})
      end
    else
      conn
      |> put_status(:bad_request)
      |> json(%{error: "S3 is not enabled for this company"})
    end
  end

  @doc """
  Upload a file to S3.
  POST /api/companies/:company_id/s3/upload
  """
  def upload(conn, %{"company_id" => company_id, "file" => upload, "key" => key}) do
    company = Accounting.get_company!(company_id)

    if company.s3_enabled do
      content = File.read!(upload.path)
      content_type = upload.content_type || "application/octet-stream"

      case S3Client.upload_file(company, key, content, content_type: content_type) do
        {:ok, full_key} ->
          json(conn, %{success: true, key: full_key})

        {:error, reason} ->
          conn
          |> put_status(:bad_request)
          |> json(%{success: false, error: inspect(reason)})
      end
    else
      conn
      |> put_status(:bad_request)
      |> json(%{success: false, error: "S3 is not enabled for this company"})
    end
  end

  @doc """
  Download a file from S3.
  GET /api/companies/:company_id/s3/download
  """
  def download(conn, %{"company_id" => company_id, "key" => key}) do
    company = Accounting.get_company!(company_id)

    if company.s3_enabled do
      case S3Client.download_file(company, key) do
        {:ok, content} ->
          filename = Path.basename(key)
          content_type = MIME.from_path(filename)

          conn
          |> put_resp_content_type(content_type)
          |> put_resp_header("content-disposition", "attachment; filename=\"#{filename}\"")
          |> send_resp(200, content)

        {:error, reason} ->
          conn
          |> put_status(:not_found)
          |> json(%{error: inspect(reason)})
      end
    else
      conn
      |> put_status(:bad_request)
      |> json(%{error: "S3 is not enabled for this company"})
    end
  end

  @doc """
  Delete a file from S3.
  DELETE /api/companies/:company_id/s3/files
  """
  def delete_file(conn, %{"company_id" => company_id, "key" => key}) do
    company = Accounting.get_company!(company_id)

    if company.s3_enabled do
      case S3Client.delete_file(company, key) do
        :ok ->
          json(conn, %{success: true})

        {:error, reason} ->
          conn
          |> put_status(:bad_request)
          |> json(%{success: false, error: inspect(reason)})
      end
    else
      conn
      |> put_status(:bad_request)
      |> json(%{success: false, error: "S3 is not enabled for this company"})
    end
  end

  @doc """
  Trigger manual database backup.
  POST /api/companies/:company_id/s3/backup-now
  """
  def backup_now(conn, %{"company_id" => company_id}) do
    company = Accounting.get_company!(company_id)

    if company.s3_enabled do
      case BarabaUmbrella.Storage.BackupWorker.backup_now(company) do
        {:ok, key} ->
          json(conn, %{success: true, key: key, message: "Backup completed successfully"})

        {:error, reason} ->
          conn
          |> put_status(:bad_request)
          |> json(%{success: false, error: reason})
      end
    else
      conn
      |> put_status(:bad_request)
      |> json(%{success: false, error: "S3 is not enabled for this company"})
    end
  end
end
