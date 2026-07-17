package com.smartwallet.transactions.service;

// import com.azure.core.util.Context;
// import com.azure.storage.blob.BlobClient;
// import com.azure.storage.blob.BlobContainerClient;
// import com.azure.storage.blob.BlobServiceClientBuilder;
// import com.azure.storage.blob.models.BlobHttpHeaders;
// import com.azure.storage.blob.options.BlobParallelUploadOptions;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class ReceiptStorageService {

  private static final Logger log = LoggerFactory.getLogger(ReceiptStorageService.class);

  private final String storageProvider;
  private final Path uploadDir;
  private final S3Client s3Client;
  private final String s3Bucket;
  private final String s3Prefix;
  private final String s3Region;
  private final String supabaseUrl;
  private final String supabaseServiceRoleKey;
  private final String supabaseBucket;
  private final String supabasePrefix;
  // private final BlobContainerClient azureContainerClient;
  // private final String azurePrefix;

  public ReceiptStorageService(
      @Value("${smartwallet.receipts.storage-provider:local}") String storageProvider,
      @Value("${smartwallet.receipts.upload-dir:uploads/receipts}") String uploadDirPath,
      @Value("${smartwallet.receipts.s3.bucket:}") String s3Bucket,
      @Value("${smartwallet.receipts.s3.region:us-east-1}") String s3Region,
      @Value("${smartwallet.receipts.s3.prefix:receipts/}") String s3Prefix,
      @Value("${smartwallet.receipts.supabase.url:}") String supabaseUrl,
      @Value("${smartwallet.receipts.supabase.service-role-key:}") String supabaseServiceRoleKey,
      @Value("${smartwallet.receipts.supabase.bucket:receipts}") String supabaseBucket,
      @Value("${smartwallet.receipts.supabase.prefix:}") String supabasePrefix) {
    this.storageProvider = storageProvider != null ? storageProvider.strip().toLowerCase() : "local";
    this.uploadDir = Path.of(uploadDirPath).toAbsolutePath();
    this.s3Bucket = s3Bucket != null ? s3Bucket.strip() : "";
    this.s3Prefix = s3Prefix != null ? s3Prefix.strip() : "receipts/";
    this.s3Region = s3Region != null ? s3Region.strip() : "us-east-1";
    this.supabaseUrl = supabaseUrl != null ? supabaseUrl.strip().replaceAll("/$", "") : "";
    this.supabaseServiceRoleKey = supabaseServiceRoleKey != null ? supabaseServiceRoleKey.strip() : "";
    this.supabaseBucket = supabaseBucket != null ? supabaseBucket.strip() : "receipts";
    this.supabasePrefix = supabasePrefix != null ? supabasePrefix.strip() : "";
    // String azureConn = azureConnectionString != null ? azureConnectionString.strip() : "";
    // String azureCont = azureContainer != null ? azureContainer.strip() : "";
    // this.azurePrefix = normalizeBlobPrefix(azurePrefixRaw);

    if ("s3".equals(this.storageProvider) && this.s3Bucket.isEmpty()) {
      throw new IllegalStateException(
          "STORAGE_PROVIDER=s3 requires AWS_S3_BUCKET to be set");
    }
    if ("supabase".equals(this.storageProvider)) {
      if (this.supabaseUrl.isEmpty() || this.supabaseServiceRoleKey.isEmpty()) {
        throw new IllegalStateException(
            "STORAGE_PROVIDER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set");
      }
    }
    // if ("azure".equals(this.storageProvider)) {
    //   if (azureConn.isEmpty() || azureCont.isEmpty()) {
    //     throw new IllegalStateException(
    //         "STORAGE_PROVIDER=azure requires AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER");
    //   }
    // }

    S3Client client = null;
    if ("s3".equals(this.storageProvider)) {
      client = S3Client.builder()
          .region(Region.of(this.s3Region))
          .build();
    }
    this.s3Client = client;

    // if ("azure".equals(this.storageProvider)) {
    //   this.azureContainerClient = new BlobServiceClientBuilder()
    //       .connectionString(azureConn)
    //       .buildClient()
    //       .getBlobContainerClient(azureCont);
    // } else {
    //   this.azureContainerClient = null;
    // }

    if ("local".equals(this.storageProvider)) {
      try {
        Files.createDirectories(uploadDir);
      } catch (IOException e) {
        throw new IllegalStateException(
            "Could not create receipt upload directory: " + uploadDir, e);
      }
    }
  }

  /**
   * Saves the receipt image and returns the URL.
   * - Local: /api/transactions/receipts/{filename}
   * - S3: https://{bucket}.s3.{region}.amazonaws.com/{prefix}{filename}
   * - Azure: blob public URL (container should allow blob-level anonymous read for app previews)
   * - Supabase: https://{ref}.supabase.co/storage/v1/object/public/{bucket}/{path}
   */
  public String store(MultipartFile file) throws IOException {
    String ext = getExtension(file.getOriginalFilename());
    String filename = UUID.randomUUID() + ext;

    if ("s3".equals(storageProvider)) {
      String key = s3Prefix + filename;
      String contentType = file.getContentType();
      if (contentType == null || contentType.isBlank()) {
        contentType = "image/jpeg";
      }
      PutObjectRequest req = PutObjectRequest.builder()
          .bucket(s3Bucket)
          .key(key)
          .contentType(contentType)
          .build();
      s3Client.putObject(req, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
      return buildS3Url(key);
    }

    if ("supabase".equals(storageProvider)) {
      System.out.println("Storing receipt in Supabase: " + filename);
      return storeSupabase(file, filename);
    }

    // Azure storage is disabled for now; keep receipts on local storage.
    // if ("azure".equals(storageProvider)) {
    //   log.warn("Azure storage is disabled; saving receipt locally instead for {}", filename);
    //   return storeLocally(file, filename);
    // }

    return storeLocally(file, filename);
  }

  private String storeLocally(MultipartFile file, String filename) throws IOException {
    Files.createDirectories(uploadDir);
    Path target = uploadDir.resolve(filename);
    file.transferTo(target.toFile());
    return "/api/transactions/receipts/" + filename;
  }

  private String storeSupabase(MultipartFile file, String filename) throws IOException {
    String path = supabasePrefix.isEmpty() ? filename : supabasePrefix + "/" + filename;
    String url = supabaseUrl + "/storage/v1/object/" + supabaseBucket + "/" + path;

    String contentType = file.getContentType();
    if (contentType == null || contentType.isBlank()) {
      contentType = "image/jpeg";
    }

    byte[] bytes = file.getBytes();
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(url))
        .timeout(Duration.ofSeconds(30))
        .header("apikey", supabaseServiceRoleKey)
        .header("Authorization", "Bearer " + supabaseServiceRoleKey)
        .header("Content-Type", contentType)
        .header("x-upsert", "true")
        .POST(HttpRequest.BodyPublishers.ofByteArray(bytes))
        .build();

    try {
      HttpClient client = HttpClient.newBuilder()
          .connectTimeout(Duration.ofSeconds(10))
          .build();
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 400) {
        throw new IOException("Supabase upload failed: " + response.statusCode() + " " + response.body());
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IOException("Supabase upload interrupted", e);
    }

    return supabaseUrl + "/storage/v1/object/public/" + supabaseBucket + "/" + path;
  }

  // private String storeAzure(MultipartFile file, String filename) throws IOException {
  //   String blobName = azurePrefix + filename;
  //   String contentType = file.getContentType();
  //   if (contentType == null || contentType.isBlank()) {
  //     contentType = "image/jpeg";
  //   }
  //   byte[] bytes = file.getBytes();
  //   BlobClient blobClient = azureContainerClient.getBlobClient(blobName);
  //   BlobParallelUploadOptions options =
  //       new BlobParallelUploadOptions(com.azure.core.util.BinaryData.fromBytes(bytes))
  //           .setHeaders(new BlobHttpHeaders().setContentType(contentType));
  //   blobClient.uploadWithResponse(options, Duration.ofMinutes(2), Context.NONE);
  //   return blobClient.getBlobUrl();
  // }

  // private static String normalizeBlobPrefix(String raw) {
  //   if (raw == null || raw.isBlank()) {
  //     return "";
  //   }
  //   String p = raw.strip().replace('\\', '/');
  //   if (!p.endsWith("/")) {
  //     p = p + "/";
  //   }
  //   return p;
  // }

  /**
   * Resolve a local filename to Path. Only valid for local storage or legacy local receipts.
   */
  public Path resolve(String filename) {
    if (filename.contains("..") || filename.contains("/")) {
      throw new IllegalArgumentException("Invalid filename");
    }
    return uploadDir.resolve(filename);
  }

  /** True if storage is remote; resolve may not work for new receipts. */
  public boolean isRemote() {
    return "s3".equals(storageProvider)
        || "supabase".equals(storageProvider);
  }

  private String buildS3Url(String key) {
    return String.format("https://%s.s3.%s.amazonaws.com/%s",
        s3Bucket, s3Region, key);
  }

  private static String getExtension(String originalFilename) {
    if (originalFilename == null || !originalFilename.contains(".")) {
      return ".jpg";
    }
    return originalFilename.substring(originalFilename.lastIndexOf('.'));
  }
}
