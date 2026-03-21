package com.smartwallet.transactions.ocr;

import java.io.File;
import org.springframework.web.multipart.MultipartFile;

public interface ReceiptOcrService {
  String extractText(MultipartFile file);

  /** Extract text from a file on disk (avoids MultipartFile stream consumption when used after store). */
  String extractText(File file);
}
