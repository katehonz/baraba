package bg.baraba.scanner.service;

import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;

@Service
@Slf4j
public class ViesService {

    private static final String VIES_REST_URL =
        "https://ec.europa.eu/taxation_customs/vies/rest-api/ms/%s/vat/%s";

    private static final String VIES_SOAP_URL =
        "https://ec.europa.eu/taxation_customs/vies/services/checkVatService";

    private final RestTemplate restTemplate;

    public ViesService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Validate EU VAT number via VIES service
     * @param vatNumber Full VAT number including country code (e.g., "BG123456789")
     * @return Validation result with company info if valid
     */
    public ViesResult validateVat(String vatNumber) {
        if (vatNumber == null || vatNumber.length() < 3) {
            return ViesResult.builder()
                .valid(false)
                .message("Invalid VAT number format")
                .build();
        }

        // Normalize: remove spaces, uppercase
        String normalized = vatNumber.replaceAll("\\s+", "").toUpperCase();

        // Extract country code (first 2 characters)
        String countryCode = normalized.substring(0, 2);
        String number = normalized.substring(2);

        // Check if valid EU country code
        if (!isEuCountryCode(countryCode)) {
            return ViesResult.builder()
                .valid(false)
                .notApplicable(true)
                .message("Non-EU VAT number - VIES validation not applicable")
                .countryCode(countryCode)
                .build();
        }

        log.info("Validating VAT: {} (country: {})", number, countryCode);

        // Try REST API first
        ViesResult result = tryRestApi(countryCode, number);

        // Fall back to SOAP if REST fails
        if (result.isError()) {
            log.info("REST API failed, trying SOAP fallback");
            result = trySoapApi(countryCode, number);
        }

        return result;
    }

    private ViesResult tryRestApi(String countryCode, String number) {
        try {
            String url = String.format(VIES_REST_URL, countryCode, number);

            ResponseEntity<ViesRestResponse> response = restTemplate.getForEntity(
                url, ViesRestResponse.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                ViesRestResponse body = response.getBody();

                if (body.isValid()) {
                    return ViesResult.builder()
                        .valid(true)
                        .companyName(body.getName())
                        .companyAddress(body.getAddress())
                        .countryCode(countryCode)
                        .vatNumber(number)
                        .validatedAt(Instant.now())
                        .source("REST")
                        .build();
                } else {
                    return ViesResult.builder()
                        .valid(false)
                        .message("VAT number not found in VIES registry")
                        .countryCode(countryCode)
                        .vatNumber(number)
                        .validatedAt(Instant.now())
                        .source("REST")
                        .build();
                }
            }

            return ViesResult.builder()
                .valid(false)
                .error(true)
                .message("VIES REST API returned empty response")
                .build();

        } catch (Exception e) {
            log.warn("VIES REST API error for {}{}: {}", countryCode, number, e.getMessage());
            return ViesResult.builder()
                .valid(false)
                .error(true)
                .message("VIES REST API error: " + e.getMessage())
                .build();
        }
    }

    private ViesResult trySoapApi(String countryCode, String number) {
        try {
            // Build SOAP request
            String soapRequest = buildSoapRequest(countryCode, number);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_XML);
            headers.set("SOAPAction", "");

            HttpEntity<String> entity = new HttpEntity<>(soapRequest, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                VIES_SOAP_URL, HttpMethod.POST, entity, String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return parseSoapResponse(response.getBody(), countryCode, number);
            }

            return ViesResult.builder()
                .valid(false)
                .error(true)
                .message("VIES SOAP API returned empty response")
                .build();

        } catch (Exception e) {
            log.error("VIES SOAP API error for {}{}: {}", countryCode, number, e.getMessage());
            return ViesResult.builder()
                .valid(false)
                .error(true)
                .message("VIES service unavailable: " + e.getMessage())
                .build();
        }
    }

    private String buildSoapRequest(String countryCode, String vatNumber) {
        return """
            <?xml version="1.0" encoding="UTF-8"?>
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                              xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
               <soapenv:Header/>
               <soapenv:Body>
                  <urn:checkVat>
                     <urn:countryCode>%s</urn:countryCode>
                     <urn:vatNumber>%s</urn:vatNumber>
                  </urn:checkVat>
               </soapenv:Body>
            </soapenv:Envelope>
            """.formatted(countryCode, vatNumber);
    }

    private ViesResult parseSoapResponse(String xml, String countryCode, String number) {
        // Simple XML parsing (can be improved with proper XML parser)
        boolean valid = xml.contains("<valid>true</valid>");

        String name = extractXmlValue(xml, "name");
        String address = extractXmlValue(xml, "address");

        if (valid) {
            return ViesResult.builder()
                .valid(true)
                .companyName(name)
                .companyAddress(address)
                .countryCode(countryCode)
                .vatNumber(number)
                .validatedAt(Instant.now())
                .source("SOAP")
                .build();
        } else {
            return ViesResult.builder()
                .valid(false)
                .message("VAT number not found in VIES registry")
                .countryCode(countryCode)
                .vatNumber(number)
                .validatedAt(Instant.now())
                .source("SOAP")
                .build();
        }
    }

    private String extractXmlValue(String xml, String tag) {
        String startTag = "<" + tag + ">";
        String endTag = "</" + tag + ">";
        int start = xml.indexOf(startTag);
        int end = xml.indexOf(endTag);
        if (start >= 0 && end > start) {
            return xml.substring(start + startTag.length(), end).trim();
        }
        return null;
    }

    private boolean isEuCountryCode(String code) {
        return switch (code) {
            case "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
                 "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
                 "NL", "PL", "PT", "RO", "SE", "SI", "SK" -> true;
            default -> false;
        };
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ViesResult {
        private boolean valid;
        private boolean error;
        private boolean notApplicable;
        private String message;
        private String companyName;
        private String companyAddress;
        private String countryCode;
        private String vatNumber;
        private Instant validatedAt;
        private String source;
    }

    @Data
    private static class ViesRestResponse {
        private boolean valid;
        private String name;
        private String address;
        private String countryCode;
        private String vatNumber;
    }
}
