package com.baraba.jasper.service;

import com.baraba.jasper.model.ReportRequest;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.export.HtmlExporter;
import net.sf.jasperreports.engine.export.JRCsvExporter;
import net.sf.jasperreports.engine.export.ooxml.JRXlsxExporter;
import net.sf.jasperreports.export.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.sql.Connection;
import java.util.HashMap;
import java.util.Map;

@Service
public class ReportService {

    @Autowired
    private DataSource dataSource;

    public byte[] generateReport(ReportRequest request) throws Exception {
        String reportName = request.getReportName();
        InputStream reportStream = null;
        JasperReport jasperReport = null;

        // 1. Try to load .jrxml from file system (for hot reloading)
        File fsFile = new File("reports/" + reportName + ".jrxml");
        if (fsFile.exists()) {
            try {
                reportStream = new java.io.FileInputStream(fsFile);
                jasperReport = JasperCompileManager.compileReport(reportStream);
            } catch (Exception e) {
                // Log and ignore, fall back to classpath
                System.err.println("Failed to load/compile report from file system: " + e.getMessage());
            }
        }

        // 2. If not found or failed, try classpath
        if (jasperReport == null) {
            String reportPath = "reports/" + reportName + ".jasper";
            try {
                reportStream = new ClassPathResource(reportPath).getInputStream();
                jasperReport = (JasperReport) net.sf.jasperreports.engine.util.JRLoader.loadObject(reportStream);
            } catch (Exception e) {
                // Try .jrxml if .jasper not found
                String jrxmlPath = "reports/" + reportName + ".jrxml";
                reportStream = new ClassPathResource(jrxmlPath).getInputStream();
                jasperReport = JasperCompileManager.compileReport(reportStream);
            }
        }

        Map<String, Object> parameters = request.getParameters() != null
            ? request.getParameters()
            : new HashMap<>();

        // Fix parameter types - convert numeric types for JasperReports compatibility
        for (Map.Entry<String, Object> entry : parameters.entrySet()) {
            Object val = entry.getValue();
            // Convert Integer to Long (JSON deserializes small numbers as Integer)
            if (val instanceof Integer) {
                entry.setValue(((Integer) val).longValue());
            }
            // Convert String numbers/dates (but not UUIDs)
            else if (val instanceof String) {
                String strVal = (String) val;
                // Check if it's a UUID (format: 8-4-4-4-12 hex chars)
                boolean isUuid = strVal.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
                if (isUuid) {
                    // Keep UUIDs as strings
                }
                // Convert numeric strings to Long
                else if (strVal.matches("-?\\d+")) {
                    try {
                        entry.setValue(Long.valueOf(strVal));
                    } catch (NumberFormatException ignored) {}
                }
                // Convert date strings to java.sql.Date
                else if (strVal.matches("\\d{4}-\\d{2}-\\d{2}")) {
                    try {
                        entry.setValue(java.sql.Date.valueOf(strVal));
                    } catch (IllegalArgumentException ignored) {}
                }
            }
        }

        JasperPrint jasperPrint;

        // Log parameters for debugging
        System.out.println("Report parameters: " + parameters);
        for (Map.Entry<String, Object> entry : parameters.entrySet()) {
            System.out.println("  " + entry.getKey() + " = " + entry.getValue() +
                " (type: " + (entry.getValue() != null ? entry.getValue().getClass().getName() : "null") + ")");
        }

        try (Connection connection = dataSource.getConnection()) {
            jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, connection);
        } catch (Exception e) {
            System.err.println("SQL Error: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error executing SQL statement for: " + request.getReportName() + ". Details: " + e.getMessage(), e);
        }

        return exportReport(jasperPrint, request.getFormat());
    }

    public byte[] generateReportFromTemplate(String templateName, Map<String, Object> parameters, String format) throws Exception {
        ReportRequest request = new ReportRequest();
        request.setReportName(templateName);
        request.setParameters(parameters);
        request.setFormat(format);
        return generateReport(request);
    }

    private byte[] exportReport(JasperPrint jasperPrint, String format) throws Exception {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        switch (format.toLowerCase()) {
            case "pdf":
                JasperExportManager.exportReportToPdfStream(jasperPrint, outputStream);
                break;

            case "xlsx":
            case "excel":
                JRXlsxExporter xlsxExporter = new JRXlsxExporter();
                xlsxExporter.setExporterInput(new SimpleExporterInput(jasperPrint));
                xlsxExporter.setExporterOutput(new SimpleOutputStreamExporterOutput(outputStream));

                SimpleXlsxReportConfiguration xlsxConfig = new SimpleXlsxReportConfiguration();
                xlsxConfig.setOnePagePerSheet(false);
                xlsxConfig.setRemoveEmptySpaceBetweenRows(true);
                xlsxConfig.setDetectCellType(true);
                xlsxExporter.setConfiguration(xlsxConfig);

                xlsxExporter.exportReport();
                break;

            case "html":
                HtmlExporter htmlExporter = new HtmlExporter();
                htmlExporter.setExporterInput(new SimpleExporterInput(jasperPrint));
                htmlExporter.setExporterOutput(new SimpleHtmlExporterOutput(outputStream));
                htmlExporter.exportReport();
                break;

            case "csv":
                JRCsvExporter csvExporter = new JRCsvExporter();
                csvExporter.setExporterInput(new SimpleExporterInput(jasperPrint));
                csvExporter.setExporterOutput(new SimpleWriterExporterOutput(outputStream));
                csvExporter.exportReport();
                break;

            default:
                throw new IllegalArgumentException("Unsupported format: " + format);
        }

        return outputStream.toByteArray();
    }

    public String getContentType(String format) {
        return switch (format.toLowerCase()) {
            case "pdf" -> "application/pdf";
            case "xlsx", "excel" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "html" -> "text/html";
            case "csv" -> "text/csv";
            default -> "application/octet-stream";
        };
    }

    public String getFileExtension(String format) {
        return switch (format.toLowerCase()) {
            case "pdf" -> ".pdf";
            case "xlsx", "excel" -> ".xlsx";
            case "html" -> ".html";
            case "csv" -> ".csv";
            default -> "";
        };
    }
}
