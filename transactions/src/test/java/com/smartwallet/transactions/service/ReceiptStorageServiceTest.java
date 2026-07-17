package com.smartwallet.transactions.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class ReceiptStorageServiceTest {

  @Test
  void localUploadStoresReceipt() throws Exception {
    Path tempDir = Files.createTempDirectory("receipt-storage-test");
    ReceiptStorageService service = new ReceiptStorageService(
        "local",
        tempDir.toString(),
        "",
        "us-east-1",
        "receipts/",
        "",
        "",
        "receipts",
        ""
    );

    MockMultipartFile file = new MockMultipartFile(
        "file",
        "receipt.jpg",
        "image/jpeg",
        "fake-image-data".getBytes(StandardCharsets.UTF_8));

    String url = service.store(file);

    assertThat(url).startsWith("/api/transactions/receipts/");
    assertThat(tempDir.toFile().listFiles()).isNotEmpty();
  }

  @Test
  void rejectsRemovedAzureProviderAtStartup() {
    assertThatThrownBy(() -> new ReceiptStorageService(
        "azure",
        "uploads/receipts",
        "",
        "us-east-1",
        "receipts/",
        "",
        "",
        "receipts",
        ""))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Unsupported STORAGE_PROVIDER='azure'");
  }
}
