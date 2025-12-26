defmodule BarabaUmbrellaWeb.JournalEntryController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Accounting

  def index(conn, %{"company_id" => company_id} = params) do
    filters = Map.take(params, ["posted_only", "document_type", "date_from", "date_to"])
    entries = Accounting.list_journal_entries(company_id, filters)
    render(conn, :index, journal_entries: entries)
  end

  def create_unified(conn, %{"company_id" => company_id, "transaction" => transaction_params}) do
    transaction_params = Map.put(transaction_params, "company_id", company_id)

    case Accounting.create_transaction_with_vat(transaction_params) do
      {:ok, journal_entry} ->
        conn
        |> put_status(:created)
        |> render(:show, journal_entry: journal_entry)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: inspect(reason)})
    end
  end

  def create(conn, %{"company_id" => company_id, "journal_entry" => entry_params}) do
    entry_params = Map.put(entry_params, "company_id", company_id)

    case Accounting.create_journal_entry(entry_params) do
      {:ok, {:ok, journal_entry}} ->
        conn
        |> put_status(:created)
        |> put_resp_header(
          "location",
          ~p"/api/companies/#{company_id}/journal-entries/#{journal_entry}"
        )
        |> render(:show, journal_entry: journal_entry)

      {:ok, {:error, reason}} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, error: reason)

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, error: reason)
    end
  end

  def show(conn, %{"company_id" => company_id, "id" => id}) do
    journal_entry = Accounting.get_journal_entry!(id)

    if journal_entry.company_id == company_id do
      render(conn, :show, journal_entry: journal_entry)
    else
      send_resp(conn, :not_found, "")
    end
  end

  def update(conn, %{"company_id" => company_id, "id" => id, "journal_entry" => entry_params}) do
    journal_entry = Accounting.get_journal_entry!(id)

    if journal_entry.company_id == company_id do
      # Track who modified the entry
      user_id = conn.assigns[:current_user_id] || "00000000-0000-0000-0000-000000000000"
      entry_params = Map.put(entry_params, "last_modified_by_id", user_id)

      case Accounting.update_journal_entry(journal_entry, entry_params) do
        {:ok, {:ok, updated_entry}} ->
          render(conn, :show, journal_entry: updated_entry)

        {:ok, {:error, reason}} ->
          conn
          |> put_status(:unprocessable_entity)
          |> render(:error, error: reason)

        {:error, reason} ->
          conn
          |> put_status(:unprocessable_entity)
          |> render(:error, error: reason)
      end
    else
      send_resp(conn, :not_found, "")
    end
  end

  def delete(conn, %{"company_id" => company_id, "id" => id}) do
    journal_entry = Accounting.get_journal_entry!(id)

    if journal_entry.company_id == company_id do
      case Accounting.delete_journal_entry(journal_entry) do
        {:ok, _} ->
          send_resp(conn, :no_content, "")

        {:error, reason} ->
          conn
          |> put_status(:unprocessable_entity)
          |> render(:error, error: reason)
      end
    else
      send_resp(conn, :not_found, "")
    end
  end

  def post(conn, %{"company_id" => company_id, "id" => id}) do
    journal_entry = Accounting.get_journal_entry!(id)

    if journal_entry.company_id == company_id do
      # In a real app, user_id would come from auth context
      user_id = conn.assigns[:current_user_id] || "00000000-0000-0000-0000-000000000000"

      case Accounting.post_journal_entry(journal_entry, user_id) do
        {:ok, posted_entry} ->
          render(conn, :show, journal_entry: posted_entry)

        {:error, %Ecto.Changeset{} = changeset} ->
          conn
          |> put_status(:unprocessable_entity)
          |> render(:error, changeset: changeset)

        {:error, reason} when is_binary(reason) ->
          conn
          |> put_status(:unprocessable_entity)
          |> render(:error, error: reason)
      end
    else
      send_resp(conn, :not_found, "")
    end
  end

  def unpost(conn, %{"company_id" => company_id, "id" => id}) do
    journal_entry = Accounting.get_journal_entry!(id)

    if journal_entry.company_id == company_id do
      case Accounting.unpost_journal_entry(journal_entry) do
        {:ok, unposted_entry} ->
          render(conn, :show, journal_entry: unposted_entry)

        {:error, %Ecto.Changeset{} = changeset} ->
          conn
          |> put_status(:unprocessable_entity)
          |> render(:error, changeset: changeset)
      end
    else
      send_resp(conn, :not_found, "")
    end
  end

  def validate_balance(conn, %{"company_id" => company_id, "id" => id}) do
    journal_entry = Accounting.get_journal_entry!(id)

    if journal_entry.company_id == company_id do
      case Accounting.validate_journal_entry_balance(journal_entry) do
        {:ok, :balanced} ->
          json(conn, %{valid: true, message: "Journal entry is balanced"})

        {:error, reason} ->
          json(conn, %{valid: false, error: reason})
      end
    else
      send_resp(conn, :not_found, "")
    end
  end
end
