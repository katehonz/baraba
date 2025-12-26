defmodule BarabaUmbrellaWeb.CurrencyController do
  use BarabaUmbrellaWeb, :controller

  alias BarabaUmbrella.Accounting

  def index(conn, _params) do
    currencies = Accounting.list_currencies()
    render(conn, :index, currencies: currencies)
  end

  def show(conn, %{"id" => id}) do
    currency = Accounting.get_currency!(id)
    render(conn, :show, currency: currency)
  end

  def create(conn, %{"currency" => currency_params}) do
    case Accounting.create_currency(currency_params) do
      {:ok, currency} ->
        conn
        |> put_status(:created)
        |> render(:show, currency: currency)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def update(conn, %{"id" => id, "currency" => currency_params}) do
    currency = Accounting.get_currency!(id)

    case Accounting.update_currency(currency, currency_params) do
      {:ok, currency} ->
        render(conn, :show, currency: currency)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    currency = Accounting.get_currency!(id)

    case Accounting.delete_currency(currency) do
      {:ok, _currency} ->
        send_resp(conn, :no_content, "")

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def toggle_active(conn, %{"id" => id}) do
    currency = Accounting.get_currency!(id)

    case Accounting.toggle_currency_active(currency) do
      {:ok, currency} ->
        render(conn, :show, currency: currency)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end
end
