package com.smartwallet.transactions.ocr;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import org.springframework.web.multipart.MultipartFile;

/** Fallback implementation; reads file as UTF-8 text. Use TesseractReceiptOcrService for images. */
public class RegexReceiptOcrService implements ReceiptOcrService {
  @Override
  public String extractText(MultipartFile file) {
    try {
      return new String(file.getBytes(), StandardCharsets.UTF_8);
    } catch (Exception ex) {
      return "";
    }
  }

  @Override
  public String extractText(File file) {
    try {
      return Files.readString(file.toPath(), StandardCharsets.UTF_8);
    } catch (Exception ex) {
      return "";
    }
  }
}
