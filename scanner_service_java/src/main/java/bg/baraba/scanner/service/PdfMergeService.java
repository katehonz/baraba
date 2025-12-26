package bg.baraba.scanner.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Service
@Slf4j
public class PdfMergeService {

    /**
     * Merge multiple PDF byte arrays into one PDF
     */
    public byte[] mergePdfs(List<byte[]> pdfPages) {
        if (pdfPages == null || pdfPages.isEmpty()) {
            throw new IllegalArgumentException("No PDF pages to merge");
        }

        if (pdfPages.size() == 1) {
            return pdfPages.get(0);
        }

        log.info("Merging {} PDF pages into one document", pdfPages.size());

        try (PDDocument mergedDoc = new PDDocument()) {
            for (byte[] pdfData : pdfPages) {
                try (PDDocument doc = Loader.loadPDF(pdfData)) {
                    for (PDPage page : doc.getPages()) {
                        mergedDoc.addPage(page);
                    }
                }
            }

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            mergedDoc.save(outputStream);
            byte[] result = outputStream.toByteArray();
            
            log.info("Merged PDF size: {} bytes", result.length);
            return result;

        } catch (IOException e) {
            log.error("Failed to merge PDFs", e);
            throw new RuntimeException("PDF merge failed: " + e.getMessage(), e);
        }
    }

    /**
     * Merge PDF files from file paths
     */
    public byte[] mergePdfFiles(List<String> filePaths) {
        log.info("Merging {} PDF files", filePaths.size());

        try (PDDocument mergedDoc = new PDDocument()) {
            for (String filePath : filePaths) {
                Path path = Path.of(filePath);
                if (Files.exists(path)) {
                    byte[] data = Files.readAllBytes(path);

                    try (PDDocument doc = Loader.loadPDF(data)) {
                        for (PDPage page : doc.getPages()) {
                            mergedDoc.addPage(page);
                        }
                    }
                } else {
                    log.warn("File not found: {}", filePath);
                }
            }

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            mergedDoc.save(outputStream);
            return outputStream.toByteArray();

        } catch (IOException e) {
            log.error("Failed to merge PDF files", e);
            throw new RuntimeException("PDF merge failed: " + e.getMessage(), e);
        }
    }

    /**
     * Convert image bytes to PDF
     */
    public byte[] imageToPdf(byte[] imageData, String fileName) {
        log.debug("Converting image to PDF: {}", fileName);

        try (PDDocument document = new PDDocument()) {
            // Read image
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageData));
            if (image == null) {
                throw new RuntimeException("Failed to read image: " + fileName);
            }

            // Create page with image dimensions (or A4 if too large)
            float imageWidth = image.getWidth();
            float imageHeight = image.getHeight();

            // Scale to fit A4 if needed
            float maxWidth = PDRectangle.A4.getWidth();
            float maxHeight = PDRectangle.A4.getHeight();

            float scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
            if (scale > 1) scale = 1; // Don't upscale

            float scaledWidth = imageWidth * scale;
            float scaledHeight = imageHeight * scale;

            PDPage page = new PDPage(new PDRectangle(scaledWidth, scaledHeight));
            document.addPage(page);

            // Create image XObject
            PDImageXObject pdImage = PDImageXObject.createFromByteArray(
                document, imageData, fileName
            );

            // Draw image on page
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                contentStream.drawImage(pdImage, 0, 0, scaledWidth, scaledHeight);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();

        } catch (IOException e) {
            log.error("Failed to convert image to PDF: {}", fileName, e);
            throw new RuntimeException("Image to PDF conversion failed", e);
        }
    }

    /**
     * Check if file is an image based on extension
     */
    private boolean isImage(String filePath) {
        String lower = filePath.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") ||
               lower.endsWith(".png") || lower.endsWith(".gif") ||
               lower.endsWith(".bmp") || lower.endsWith(".tiff");
    }

    /**
     * Get page count from PDF
     */
    public int getPageCount(byte[] pdfData) {
        try (PDDocument document = Loader.loadPDF(pdfData)) {
            return document.getNumberOfPages();
        } catch (IOException e) {
            log.error("Failed to count PDF pages", e);
            return 1;
        }
    }
}
