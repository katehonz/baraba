package bg.baraba.scanner.service;

import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.JPEGFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
@Slf4j
public class ImageCompressionService {

    private static final long MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB Azure limit
    private static final int MAX_DIMENSION = 4096; // Max pixels

    @Value("${scanner.temp-dir:/tmp/scanner-uploads}")
    private String tempDir;

    /**
     * Compress file if needed to meet Azure limits
     * @return compressed bytes or original if no compression needed
     */
    public byte[] compressIfNeeded(MultipartFile file) {
        try {
            byte[] data = file.getBytes();
            String fileName = file.getOriginalFilename();

            return compressIfNeeded(data, fileName);
        } catch (IOException e) {
            log.error("Failed to read file for compression", e);
            throw new RuntimeException("Compression failed", e);
        }
    }

    /**
     * Compress file from path if needed
     */
    public byte[] compressIfNeeded(String filePath) {
        try {
            Path path = Path.of(filePath);
            byte[] data = Files.readAllBytes(path);
            String fileName = path.getFileName().toString();

            return compressIfNeeded(data, fileName);
        } catch (IOException e) {
            log.error("Failed to read file for compression: {}", filePath, e);
            throw new RuntimeException("Compression failed", e);
        }
    }

    /**
     * Compress bytes if needed
     */
    public byte[] compressIfNeeded(byte[] data, String fileName) {
        if (data.length <= MAX_FILE_SIZE) {
            log.debug("File {} is within size limit ({} bytes)", fileName, data.length);
            return data;
        }

        log.info("Compressing file {} ({} bytes > {} limit)",
            fileName, data.length, MAX_FILE_SIZE);

        String lowerName = fileName.toLowerCase();

        if (lowerName.endsWith(".pdf")) {
            return compressPdf(data);
        } else if (isImage(lowerName)) {
            return compressImage(data, lowerName);
        } else {
            log.warn("Unknown file type, returning original: {}", fileName);
            return data;
        }
    }

    private byte[] compressImage(byte[] imageData, String fileName) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageData));
            if (image == null) {
                log.warn("Could not read image, returning original");
                return imageData;
            }

            // Check dimensions
            int width = image.getWidth();
            int height = image.getHeight();
            boolean needsResize = width > MAX_DIMENSION || height > MAX_DIMENSION;

            // Start with high quality and reduce until under limit
            float quality = 0.85f;
            byte[] compressed = imageData;

            while (compressed.length > MAX_FILE_SIZE && quality > 0.1f) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();

                var builder = Thumbnails.of(image)
                    .outputFormat("jpeg")
                    .outputQuality(quality);

                if (needsResize) {
                    builder.size(MAX_DIMENSION, MAX_DIMENSION);
                } else {
                    builder.scale(1.0);
                }

                builder.toOutputStream(out);
                compressed = out.toByteArray();

                log.debug("Compressed with quality {}: {} bytes", quality, compressed.length);
                quality -= 0.1f;
            }

            // If still too large, aggressively resize
            if (compressed.length > MAX_FILE_SIZE) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                Thumbnails.of(image)
                    .size(2048, 2048)
                    .outputFormat("jpeg")
                    .outputQuality(0.5f)
                    .toOutputStream(out);
                compressed = out.toByteArray();
                log.info("Aggressively compressed to {} bytes", compressed.length);
            }

            log.info("Image compressed from {} to {} bytes", imageData.length, compressed.length);
            return compressed;

        } catch (IOException e) {
            log.error("Image compression failed", e);
            return imageData;
        }
    }

    private byte[] compressPdf(byte[] pdfData) {
        try (PDDocument document = Loader.loadPDF(pdfData)) {
            PDFRenderer renderer = new PDFRenderer(document);
            PDDocument newDoc = new PDDocument();

            int dpi = 150; // Start with reasonable DPI
            float quality = 0.7f;

            for (int i = 0; i < document.getNumberOfPages(); i++) {
                // Render page as image
                BufferedImage image = renderer.renderImageWithDPI(i, dpi);

                // Create new page
                PDPage newPage = new PDPage(new PDRectangle(
                    image.getWidth(), image.getHeight()
                ));
                newDoc.addPage(newPage);

                // Add image to page
                PDImageXObject pdImage = JPEGFactory.createFromImage(newDoc, image, quality);
                try (PDPageContentStream cs = new PDPageContentStream(newDoc, newPage)) {
                    cs.drawImage(pdImage, 0, 0, image.getWidth(), image.getHeight());
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            newDoc.save(out);
            newDoc.close();

            byte[] compressed = out.toByteArray();

            // If still too large, reduce DPI
            if (compressed.length > MAX_FILE_SIZE) {
                return compressPdfAggressively(pdfData);
            }

            log.info("PDF compressed from {} to {} bytes", pdfData.length, compressed.length);
            return compressed;

        } catch (IOException e) {
            log.error("PDF compression failed", e);
            return pdfData;
        }
    }

    private byte[] compressPdfAggressively(byte[] pdfData) {
        try (PDDocument document = Loader.loadPDF(pdfData)) {
            PDFRenderer renderer = new PDFRenderer(document);
            PDDocument newDoc = new PDDocument();

            int dpi = 100;
            float quality = 0.5f;

            for (int i = 0; i < document.getNumberOfPages(); i++) {
                BufferedImage image = renderer.renderImageWithDPI(i, dpi);

                PDPage newPage = new PDPage(new PDRectangle(
                    image.getWidth(), image.getHeight()
                ));
                newDoc.addPage(newPage);

                PDImageXObject pdImage = JPEGFactory.createFromImage(newDoc, image, quality);
                try (PDPageContentStream cs = new PDPageContentStream(newDoc, newPage)) {
                    cs.drawImage(pdImage, 0, 0, image.getWidth(), image.getHeight());
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            newDoc.save(out);
            newDoc.close();

            return out.toByteArray();

        } catch (IOException e) {
            log.error("Aggressive PDF compression failed", e);
            return pdfData;
        }
    }

    private boolean isImage(String fileName) {
        return fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") ||
               fileName.endsWith(".png") || fileName.endsWith(".gif") ||
               fileName.endsWith(".bmp") || fileName.endsWith(".tiff");
    }
}
