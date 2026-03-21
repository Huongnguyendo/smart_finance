package com.smartwallet.transactions.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.smartwallet.transactions.ocr.ReceiptOcrService;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.multipart.MultipartFile;

class ReceiptParseServiceTest {
  @Test
  void extractsAmountFromReceiptText() {
    ReceiptOcrService ocrService = Mockito.mock(ReceiptOcrService.class);
    ReceiptParseService parseService = new ReceiptParseService(ocrService);

    Mockito.when(ocrService.extractText(Mockito.any(MultipartFile.class)))
        .thenReturn("Total: 12.50");

    ReceiptParseResult result = parseService.parse(Mockito.mock(MultipartFile.class));

    assertNotNull(result.getAmount());
    assertEquals(new BigDecimal("12.50"), result.getAmount());
  }
}
