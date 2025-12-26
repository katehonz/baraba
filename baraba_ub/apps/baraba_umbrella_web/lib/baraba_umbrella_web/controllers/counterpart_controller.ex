defmodule BarabaUmbrellaWeb.CounterpartController do
  use BarabaUmbrellaWeb, :controller
  
  alias BarabaUmbrella.Accounting
  
  def index(conn, params) do
    company_id = Map.get(params, "company_id")
    filters = Map.take(params, ["customers_only", "suppliers_only", "vat_registered"])
    
    counterparts = 
      if company_id do
        Accounting.list_counterparts(company_id, filters)
      else
        # If no company_id specified, return all counterparts (admin view)
        []
      end
    
    render(conn, :index, counterparts: counterparts)
  end
  
  def create(conn, %{"company_id" => company_id, "counterpart" => counterpart_params}) do
    counterpart_params = Map.put(counterpart_params, "company_id", company_id)
    
    case Accounting.create_counterpart(counterpart_params) do
      {:ok, counterpart} ->
        conn
        |> put_status(:created)
        |> put_resp_header("location", ~p"/api/companies/#{company_id}/counterparts/#{counterpart}")
        |> render(:show, counterpart: counterpart)
      
      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end
  
  def show(conn, %{"company_id" => company_id, "id" => id}) do
    counterpart = Accounting.get_counterpart!(id)
    
    if counterpart.company_id == company_id do
      render(conn, :show, counterpart: counterpart)
    else
      send_resp(conn, :not_found, "")
    end
  end
  
  def update(conn, %{"company_id" => company_id, "id" => id, "counterpart" => counterpart_params}) do
    counterpart = Accounting.get_counterpart!(id)
    
    if counterpart.company_id == company_id do
      case Accounting.update_counterpart(counterpart, counterpart_params) do
        {:ok, counterpart} ->
          render(conn, :show, counterpart: counterpart)
        
        {:error, %Ecto.Changeset{} = changeset} ->
          conn
          |> put_status(:unprocessable_entity)
          |> render(:error, changeset: changeset)
      end
    else
      send_resp(conn, :not_found, "")
    end
  end
  
  def delete(conn, %{"company_id" => company_id, "id" => id}) do
    counterpart = Accounting.get_counterpart!(id)
    
    if counterpart.company_id == company_id do
      with {:ok, _counterpart} <- Accounting.delete_counterpart(counterpart) do
        send_resp(conn, :no_content, "")
      end
    else
      send_resp(conn, :not_found, "")
    end
  end
  
  def search(conn, %{"company_id" => company_id, "term" => search_term}) do
    # This would be expanded in a real implementation
    counterparts = Accounting.list_counterparts(company_id)
    filtered = Enum.filter(counterparts, fn cp ->
      String.contains?(String.downcase(cp.name), String.downcase(search_term)) or
      String.contains?(cp.vat_number || "", search_term) or
      String.contains?(cp.eik || "", search_term)
    end)
    
    render(conn, :index, counterparts: filtered)
  end
  
  def validate_vat(conn, %{"company_id" => company_id, "vat_number" => vat_number}) do
    # Check local DB first
    local_result =
      case Accounting.get_counterpart_by_vat_number(vat_number) do
        nil -> %{exists: false}
        counterpart ->
          if counterpart.company_id == company_id do
            %{exists: true, counterpart_id: counterpart.id, name: counterpart.name}
          else
            %{exists: false} # Exists but for another company (or strictly segregated)
          end
      end

    # Check VIES Service
    vies_result =
      case BarabaUmbrella.ViesService.validate_vat(vat_number) do
        {:ok, data} ->
          %{
            valid: data["valid"],
            name: data["name"],
            address: data["longAddress"]
          }
        {:error, _} ->
          %{valid: false, error: "Service unavailable"}
      end

    json(conn, %{data: Map.merge(local_result, vies_result)})
  end

  def turnover(conn, %{"company_id" => company_id, "start_date" => start_date, "end_date" => end_date}) do
    case {Date.from_iso8601(start_date), Date.from_iso8601(end_date)} do
      {{:ok, s_date}, {:ok, e_date}} ->
        turnover_data = Accounting.get_counterpart_turnover(company_id, s_date, e_date)
        json(conn, turnover_data)
        
      _ ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Invalid date format. Use YYYY-MM-DD"})
    end
  end
end