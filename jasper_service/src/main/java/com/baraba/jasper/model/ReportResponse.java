package com.baraba.jasper.model;

public class ReportResponse {
    private boolean success;
    private String message;
    private String filename;
    private String contentType;

    public ReportResponse() {}

    public ReportResponse(boolean success, String message, String filename, String contentType) {
        this.success = success;
        this.message = message;
        this.filename = filename;
        this.contentType = contentType;
    }

    // Getters
    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public String getFilename() {
        return filename;
    }

    public String getContentType() {
        return contentType;
    }

    // Setters
    public void setSuccess(boolean success) {
        this.success = success;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }
}
