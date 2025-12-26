defmodule BarabaUmbrellaWeb.Router do
  use BarabaUmbrellaWeb, :router

  pipeline :api do
    plug(:accepts, ["json"])
    plug(BarabaUmbrellaWeb.Plugs.Authenticate)
  end

  scope "/api", BarabaUmbrellaWeb do
    pipe_through(:api)

    # Currencies
    resources("/currencies", CurrencyController, except: [:new, :edit])
    patch("/currencies/:id/toggle-active", CurrencyController, :toggle_active)

    # Exchange Rates
    get("/exchange-rates", ExchangeRateController, :index)
    post("/exchange-rates/fetch-latest", ExchangeRateController, :fetch_latest)
    post("/exchange-rates/fetch-date", ExchangeRateController, :fetch_date)
    post("/exchange-rates/fetch-month", ExchangeRateController, :fetch_month)

    # Companies
    resources "/companies", CompanyController, except: [:new, :edit] do
      # Internal API for scanner service
      get("/azure-credentials", CompanyController, :azure_credentials)

      # S3 Storage
      post("/s3/test", S3Controller, :test_connection)
      get("/s3/files", S3Controller, :list_files)
      post("/s3/upload", S3Controller, :upload)
      get("/s3/download", S3Controller, :download)
      delete("/s3/files", S3Controller, :delete_file)
      post("/s3/backup-now", S3Controller, :backup_now)

      resources("/accounts", AccountController, except: [:new, :edit])
      resources("/fixed-assets", FixedAssetController, except: [:new, :edit])
      resources("/fixed-asset-categories", FixedAssetCategoryController, except: [:new, :edit])

      post("/fixed-assets/calculate-depreciation", FixedAssetController, :calculate_depreciation)
      post("/fixed-assets/post-depreciation", FixedAssetController, :post_depreciation)
      get("/depreciation-journal", FixedAssetController, :depreciation_journal)
      get("/calculated-periods", FixedAssetController, :calculated_periods)

      resources("/products", ProductController, except: [:new, :edit])

      resources("/accounting-periods", AccountingPeriodController, except: [:new, :edit])
      post("/accounting-periods/:year/:month/close", AccountingPeriodController, :close)
      post("/accounting-periods/:year/:month/reopen", AccountingPeriodController, :reopen)
      post("/accounting-periods/initialize/:year", AccountingPeriodController, :initialize_year)

      resources("/opening-balances", OpeningBalanceController, except: [:new, :edit])

      resources "/bank-accounts", BankAccountController, except: [:new, :edit] do
        resources "/transactions", BankTransactionController, except: [:new, :edit] do
          post("/import", BankTransactionController, :import)
        end
      end

      # Currency Revaluations
      post("/currency-revaluations/preview", CurrencyRevaluationController, :preview)

      get(
        "/currency-revaluations/revaluable-accounts",
        CurrencyRevaluationController,
        :revaluable_accounts
      )

      resources "/currency-revaluations", CurrencyRevaluationController,
        except: [:new, :edit, :update] do
        post("/post", CurrencyRevaluationController, :post_revaluation)
        post("/reverse", CurrencyRevaluationController, :reverse)
      end

      resources "/vat-returns", VatReturnController, except: [:new, :edit] do
        post("/generate", VatReturnController, :generate)
      end

      resources "/journal-entries", JournalEntryController, except: [:new, :edit] do
        post("/unified-create", JournalEntryController, :create_unified)
        post("/post", JournalEntryController, :post)
        post("/unpost", JournalEntryController, :unpost)
        post("/validate-balance", JournalEntryController, :validate_balance)
      end

      resources("/scanned-invoices", ScannedInvoiceController, except: [:new, :edit])
      get("/scanned-invoices/next-pending", ScannedInvoiceController, :next_pending)
      post("/scanned-invoices/:id/approve", ScannedInvoiceController, :approve)
      get("/scanned-invoices/:id/download-pdf", ScannedInvoiceController, :download_pdf)
    end

    # Counterparts - both nested under companies and standalone
    get("/companies/:company_id/counterparts/turnover", CounterpartController, :turnover)
    post("/companies/:company_id/counterparts/validate-vat", CounterpartController, :validate_vat)
    get("/companies/:company_id/counterparts/search/:term", CounterpartController, :search)

    resources "/companies/:company_id/counterparts", CounterpartController, except: [:new, :edit]

    resources "/counterparts", CounterpartController, except: [:new, :edit], singleton: true

    # VAT Rates - moved to Nim vat_service (port 5004)
    # See: vat_service/src/vat_service.nim

    # Reports
    post("/reports/generate", ReportController, :generate)
    get("/reports/templates", ReportController, :templates)
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:baraba_umbrella_web, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through([:fetch_session, :protect_from_forgery])

      live_dashboard("/dashboard", metrics: BarabaUmbrellaWeb.Telemetry)
      forward("/mailbox", Plug.Swoosh.MailboxPreview)
    end
  end
end
