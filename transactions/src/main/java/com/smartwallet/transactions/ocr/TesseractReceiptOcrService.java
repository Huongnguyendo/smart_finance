package com.smartwallet.transactions.ocr;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@Primary
public class TesseractReceiptOcrService implements ReceiptOcrService {

  private static final Logger log = LoggerFactory.getLogger(TesseractReceiptOcrService.class);

  /** Tessdata paths: Homebrew (Intel/Apple Silicon), Alpine/Docker (/usr/share) */
  private static final String[] TESSDATA_PATHS = {
      "/usr/local/share/tessdata",
      "/opt/homebrew/share/tessdata",
      "/usr/share/tessdata",
      "/usr/share",
  };

  private final Tesseract tesseract;

  public TesseractReceiptOcrService() {
    configureJnaLibraryPath();
    this.tesseract = new Tesseract();
    tesseract.setLanguage("eng");
    configureTessdataPath();
  }

  /** Tess4J needs tessdata dir (eng.traineddata etc). Homebrew: /usr/local/share/tessdata or /opt/homebrew/share/tessdata */
  private void configureTessdataPath() {
    for (String path : TESSDATA_PATHS) {
      if (Files.isDirectory(Path.of(path))) {
        tesseract.setDatapath(path);
        log.info("Tesseract tessdata path: {}", path);
        return;
      }
    }
    log.warn("No tessdata directory found. Tried: {}", String.join(", ", TESSDATA_PATHS));
  }

  /** Tess4J/JNA needs to find libtesseract. Homebrew: /usr/local/lib or /opt/homebrew/lib. Alpine/Docker: /usr/lib. */
  private void configureJnaLibraryPath() {
    String existing = System.getProperty("jna.library.path", "");
    String paths = "/usr/local/lib:/opt/homebrew/lib:/usr/lib";
    if (!existing.isEmpty()) {
      paths = paths + ":" + existing;
    }
    System.setProperty("jna.library.path", paths);
  }

  @Override
  public String extractText(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      return "";
    }
    try (InputStream is = file.getInputStream()) {
      BufferedImage image = ImageIO.read(is);
      if (image == null) {
        log.debug("Could not decode as image: {}", file.getOriginalFilename());
        return "";
      }
      return tesseract.doOCR(image);
    } catch (IOException e) {
      log.warn("Failed to read receipt image: {}", e.getMessage());
      return "";
    } catch (TesseractException e) {
      log.warn("Tesseract OCR failed: {}", e.getMessage());
      if (e.getMessage() != null && (e.getMessage().contains("Unable to load") || e.getMessage().contains("not found"))) {
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
            "Tesseract OCR is not installed. Run: brew install tesseract (macOS) or apt install tesseract-ocr (Linux)");
      }
      return "";
    } catch (UnsatisfiedLinkError e) {
      log.error("Tesseract native library not found: {}", e.getMessage());
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "Tesseract OCR is not installed. Run: brew install tesseract (macOS) or apt install tesseract-ocr (Linux)");
    }
  }

  @Override
  public String extractText(File file) {
    if (file == null || !file.exists()) {
      return "";
    }
    try {
      return tesseract.doOCR(file);
    } catch (Exception e) {
      log.warn("Tesseract OCR failed for file {}: {}", file.getName(), e.getMessage());
      return "";
    }
  }
}
