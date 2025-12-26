package com.baraba.jasper.model;

import java.util.Map;

public class ReportRequest {
    private String reportName;
    private String format; // pdf, xlsx, html, csv
    private Map<String, Object> parameters;
    private String sql; // Optional custom SQL query

    // Getters
    public String getReportName() {
        return reportName;
    }

    public String getFormat() {
        return format;
    }

    public Map<String, Object> getParameters() {
        return parameters;
    }

    public String getSql() {
        return sql;
    }

    // Setters
    public void setReportName(String reportName) {
        this.reportName = reportName;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public void setParameters(Map<String, Object> parameters) {
        this.parameters = parameters;
    }

    public void setSql(String sql) {
        this.sql = sql;
    }
}
