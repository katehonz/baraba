package bg.baraba.scanner.service;

import bg.baraba.scanner.model.dto.RecognizedInvoice;
import com.azure.ai.formrecognizer.documentanalysis.DocumentAnalysisClient;
import com.azure.ai.formrecognizer.documentanalysis.DocumentAnalysisClientBuilder;
import com.azure.ai.formrecognizer.documentanalysis.models.*;
import com.azure.core.credential.AzureKeyCredential;
import com.azure.core.util.BinaryData;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@Slf4j
public class AzureDocumentService {

    @Value("${azure.document-intelligence.endpoint:}")
    private String endpoint;

    @Value("${azure.document-intelligence.api-key:}")
    private String apiKey;

    private DocumentAnalysisClient client;
    private boolean mockMode = false;

    @PostConstruct
    public void init() {
        if (endpoint != null && !endpoint.isEmpty() && apiKey != null && !apiKey.isEmpty()) {
            try {
                client = new DocumentAnalysisClientBuilder()
                    .endpoint(endpoint)
                    .credential(new AzureKeyCredential(apiKey))
                    .buildClient();
                log.info("Azure Document Intelligence client initialized successfully");
            } catch (Exception e) {
                log.error("Failed to initialize Azure client: {}", e.getMessage());
                mockMode = true;
            }
        } else {
            log.warn("Azure credentials not configured - using mock mode");
            mockMode = true;
        }
    }

    /**
     * Recognize invoices from PDF data
     * @param pdfData PDF file bytes
     * @param invoiceType PURCHASE or SALES
     * @return List of recognized invoices (one per page/document)
     */
    public List<RecognizedInvoice> recognizeInvoices(byte[] pdfData, String invoiceType) {
        if (mockMode || client == null) {
            log.info("Using mock data (Azure not configured)");
            return List.of(createMockInvoice(invoiceType));
        }

        log.info("Sending {} bytes to Azure Document Intelligence", pdfData.length);
        long startTime = System.currentTimeMillis();

        try {
            // Analyze document using prebuilt-invoice model
            AnalyzeResult result = client
                .beginAnalyzeDocument("prebuilt-invoice", BinaryData.fromBytes(pdfData))
                .getFinalResult();

            List<RecognizedInvoice> invoices = new ArrayList<>();

            for (AnalyzedDocument document : result.getDocuments()) {
                invoices.add(parseDocument(document, invoiceType));
            }

            long duration = System.currentTimeMillis() - startTime;
            log.info("Recognized {} invoices in {}ms", invoices.size(), duration);

            return invoices;

        } catch (Exception e) {
            log.error("Azure document analysis failed: {}", e.getMessage(), e);
            throw new RuntimeException("Document analysis failed: " + e.getMessage(), e);
        }
    }

    private RecognizedInvoice parseDocument(AnalyzedDocument doc, String invoiceType) {
        Map<String, DocumentField> fields = doc.getFields();

        // Extract fields
        String vendorName = getStringField(fields, "VendorName");
        String vendorVat = getStringField(fields, "VendorTaxId");
        String vendorAddress = getAddressField(fields, "VendorAddress");
        String customerName = getStringField(fields, "CustomerName");
        String customerVat = getStringField(fields, "CustomerTaxId");
        String customerAddress = getAddressField(fields, "CustomerAddress");
        String invoiceId = getStringField(fields, "InvoiceId");
        String invoiceDate = getDateField(fields, "InvoiceDate");
        String dueDate = getDateField(fields, "DueDate");
        BigDecimal subtotal = getCurrencyField(fields, "SubTotal");
        BigDecimal totalTax = getCurrencyField(fields, "TotalTax");
        BigDecimal invoiceTotal = getCurrencyField(fields, "InvoiceTotal");

        // Calculate missing values if possible
        if (subtotal == null && invoiceTotal != null && totalTax != null) {
            subtotal = invoiceTotal.subtract(totalTax);
        }
        if (totalTax == null && invoiceTotal != null && subtotal != null) {
            totalTax = invoiceTotal.subtract(subtotal);
        }

        // Determine direction
        String direction = "PURCHASE".equalsIgnoreCase(invoiceType) ? "PURCHASE" : "SALE";

        // Check if manual review is needed
        boolean needsReview = false;
        StringBuilder reviewReason = new StringBuilder();

        if (vendorName == null || vendorName.isEmpty()) {
            needsReview = true;
            reviewReason.append("Vendor name not recognized. ");
        }
        if (invoiceTotal == null || invoiceTotal.compareTo(BigDecimal.ZERO) <= 0) {
            needsReview = true;
            reviewReason.append("Invoice total not recognized. ");
        }
        if (invoiceDate == null) {
            needsReview = true;
            reviewReason.append("Invoice date not recognized. ");
        }

        // Calculate confidence
        BigDecimal confidence = BigDecimal.valueOf(doc.getConfidence());

        return RecognizedInvoice.builder()
            .vendorName(vendorName)
            .vendorVatNumber(vendorVat)
            .vendorAddress(vendorAddress)
            .customerName(customerName)
            .customerVatNumber(customerVat)
            .customerAddress(customerAddress)
            .invoiceId(invoiceId)
            .invoiceDate(invoiceDate)
            .dueDate(dueDate)
            .subtotal(subtotal)
            .totalTax(totalTax)
            .invoiceTotal(invoiceTotal)
            .direction(direction)
            .validationStatus("PENDING")
            .requiresManualReview(needsReview)
            .manualReviewReason(reviewReason.toString().trim())
            .confidence(confidence)
            .build();
    }

    private String getStringField(Map<String, DocumentField> fields, String name) {
        DocumentField field = fields.get(name);
        if (field == null) return null;
        try {
            return field.getValueAsString();
        } catch (Exception e) {
            return null;
        }
    }

    private String getAddressField(Map<String, DocumentField> fields, String name) {
        DocumentField field = fields.get(name);
        if (field == null) return null;
        try {
            AddressValue address = field.getValueAsAddress();
            if (address == null) return field.getContent();

            StringBuilder sb = new StringBuilder();
            if (address.getStreetAddress() != null) sb.append(address.getStreetAddress());
            if (address.getCity() != null) {
                if (sb.length() > 0) sb.append(", ");
                sb.append(address.getCity());
            }
            if (address.getPostalCode() != null) {
                if (sb.length() > 0) sb.append(" ");
                sb.append(address.getPostalCode());
            }
            if (address.getCountryRegion() != null) {
                if (sb.length() > 0) sb.append(", ");
                sb.append(address.getCountryRegion());
            }
            return sb.length() > 0 ? sb.toString() : field.getContent();
        } catch (Exception e) {
            return field.getContent();
        }
    }

    private String getDateField(Map<String, DocumentField> fields, String name) {
        DocumentField field = fields.get(name);
        if (field == null) return null;
        try {
            LocalDate date = field.getValueAsDate();
            return date != null ? date.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private BigDecimal getCurrencyField(Map<String, DocumentField> fields, String name) {
        DocumentField field = fields.get(name);
        if (field == null) return null;
        try {
            CurrencyValue currency = field.getValueAsCurrency();
            if (currency != null && Double.isFinite(currency.getAmount())) {
                return BigDecimal.valueOf(currency.getAmount());
            }
            // Try as double
            Double value = field.getValueAsDouble();
            return value != null ? BigDecimal.valueOf(value) : null;
        } catch (Exception e) {
            return null;
        }
    }

    private RecognizedInvoice createMockInvoice(String invoiceType) {
        return RecognizedInvoice.builder()
            .vendorName("Mock Доставчик ЕООД")
            .vendorVatNumber("BG123456789")
            .vendorAddress("София, бул. Витоша 100")
            .customerName("Mock Клиент ООД")
            .customerVatNumber("BG987654321")
            .customerAddress("Пловдив, ул. Главна 1")
            .invoiceId("INV-" + System.currentTimeMillis())
            .invoiceDate(LocalDate.now().toString())
            .dueDate(LocalDate.now().plusDays(30).toString())
            .subtotal(new BigDecimal("1000.00"))
            .totalTax(new BigDecimal("200.00"))
            .invoiceTotal(new BigDecimal("1200.00"))
            .direction("PURCHASE".equalsIgnoreCase(invoiceType) ? "PURCHASE" : "SALE")
            .validationStatus("PENDING")
            .requiresManualReview(false)
            .manualReviewReason("")
            .confidence(new BigDecimal("0.00")) // Mock indicator
            .build();
    }

    public boolean isMockMode() {
        return mockMode;
    }
}
