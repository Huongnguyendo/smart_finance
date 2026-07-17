package com.smartwallet.transactions.web;

import com.smartwallet.core.domain.Transaction;
import com.smartwallet.core.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.smartwallet.transactions.event.TransactionCreatedEvent;
import com.smartwallet.transactions.event.TransactionEventPublisher;
import com.smartwallet.transactions.service.ReceiptParseResult;
import com.smartwallet.transactions.service.ReceiptParseService;
import com.smartwallet.transactions.service.ReceiptStorageService;
import com.smartwallet.transactions.service.TransactionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import java.io.IOException;
import java.nio.file.Files;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
  private static final Logger log = LoggerFactory.getLogger(TransactionController.class);
  private final TransactionService transactionService;
  private final ReceiptParseService receiptParseService;
  private final ReceiptStorageService receiptStorageService;
  private final TransactionEventPublisher eventPublisher;

  public TransactionController(
      TransactionService transactionService,
      ReceiptParseService receiptParseService,
      ReceiptStorageService receiptStorageService,
      TransactionEventPublisher eventPublisher) {
    this.transactionService = transactionService;
    this.receiptParseService = receiptParseService;
    this.receiptStorageService = receiptStorageService;
    this.eventPublisher = eventPublisher;
  }

  @GetMapping
  public PagedResponse<TransactionResponse> list(
      @AuthenticationPrincipal User user,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String category,
      @RequestParam(defaultValue = "dateDesc") String sort) {
    size = Math.min(Math.max(size, 1), 100);
    Sort sortObj = parseSort(sort);
    Pageable pageable = PageRequest.of(page, size, sortObj);
    var pageResult = transactionService.listForUserWithFilters(user.getId(), search, category, pageable);
    return PagedResponse.of(pageResult.map(this::toResponse));
  }

  @GetMapping("/categories")
  public List<String> listCategories(@AuthenticationPrincipal User user) {
    return transactionService.listCategoryNamesForUser(user.getId());
  }

  private Sort parseSort(String sort) {
    return switch (sort != null ? sort : "dateDesc") {
      case "dateAsc" -> Sort.by(Sort.Direction.ASC, "occurredAt");
      case "amountDesc" -> Sort.by(Sort.Direction.DESC, "amount");
      case "amountAsc" -> Sort.by(Sort.Direction.ASC, "amount");
      default -> Sort.by(Sort.Direction.DESC, "occurredAt");
    };
  }

  @GetMapping("/suggest-category")
  public SuggestCategoryResponse suggestCategory(
      @AuthenticationPrincipal User user,
      @RequestParam(value = "description", required = false) String description,
      @RequestParam("amount") java.math.BigDecimal amount,
      @RequestParam(value = "date", required = false) String dateStr,
      @RequestParam(value = "receiptText", required = false) String receiptText) {
    java.time.Instant date = null;
    if (dateStr != null && !dateStr.isBlank()) {
      try {
        date = java.time.Instant.parse(dateStr);
      } catch (Exception ignored) {
        date = java.time.Instant.now();
      }
    }
    return transactionService.suggestCategory(user.getId(), description, amount, date, receiptText)
        .map(s -> new SuggestCategoryResponse(s.categoryName(), s.confidence()))
        .orElse(new SuggestCategoryResponse(null, 0));
  }

  @GetMapping("/{id:\\d+}")
  public TransactionResponse get(@AuthenticationPrincipal User user, @PathVariable("id") Long id) {
    Transaction tx = transactionService.get(id);
    if (!tx.getUser().getId().equals(user.getId())) {
      throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
    }
    return toResponse(tx);
  }

  @PostMapping
  public TransactionResponse create(@AuthenticationPrincipal User user, @Valid @RequestBody TransactionRequest request) {
    if (!request.getUserId().equals(user.getId())) {
      throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
    }
    Transaction tx = new Transaction();
    tx.setUser(user);
    tx.setAmount(request.getAmount());
    tx.setDescription(request.getDescription());
    tx.setOccurredAt(request.getDate());
    tx.setReceiptUrl(request.getReceiptUrl());
    Transaction saved = transactionService.create(tx, request.getCategoryName());
    eventPublisher.publishTransactionCreated(
        new TransactionCreatedEvent(saved.getId(), saved.getUser().getId()));
    return toResponse(saved);
  }

  @PutMapping("/{id:\\d+}")
  public TransactionResponse update(
      @AuthenticationPrincipal User user,
      @PathVariable("id") Long id,
      @Valid @RequestBody TransactionRequest request) {
    Transaction existing = transactionService.get(id);
    if (!existing.getUser().getId().equals(user.getId())) {
      throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
    }
    if (!request.getUserId().equals(user.getId())) {
      throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
    }
    Transaction tx = new Transaction();
    tx.setUser(user);
    tx.setAmount(request.getAmount());
    tx.setDescription(request.getDescription());
    tx.setOccurredAt(request.getDate());
    tx.setReceiptUrl(request.getReceiptUrl());
    Transaction saved = transactionService.update(id, tx, request.getCategoryName());
    return toResponse(saved);
  }

  @DeleteMapping("/{id:\\d+}")
  public void delete(@AuthenticationPrincipal User user, @PathVariable("id") Long id) {
    Transaction tx = transactionService.get(id);
    if (!tx.getUser().getId().equals(user.getId())) {
      throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
    }
    transactionService.delete(id);
  }

  @PostMapping(value = "/upload-receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ReceiptParseResponse uploadReceipt(
      @AuthenticationPrincipal User user,
      @RequestHeader(value = "Rndr-Id", required = false) String renderRequestId,
      @RequestPart("file") MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          "File is empty. Please upload a valid receipt image.");
    }
    ReceiptParseResult result = receiptParseService.parse(file);
    String receiptUrl;
    try {
      receiptUrl = receiptStorageService.store(file);
    } catch (IOException e) {
      String errorId = renderRequestId != null && !renderRequestId.isBlank()
          ? renderRequestId
          : java.util.UUID.randomUUID().toString();
      log.error("Receipt storage error: errorId={} userId={}", errorId, user.getId(), e);
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
          "Failed to store receipt image. Reference: " + errorId);
    }
    log.info("OCR receipt: textLen={} amount={}", result.getRawText() != null ? result.getRawText().length() : 0, result.getAmount());
    return new ReceiptParseResponse(result.getRawText(), result.getAmount(), receiptUrl, result.getMerchant());
  }

  @GetMapping("/receipts/{filename}")
  public ResponseEntity<Resource> getReceipt(
      @AuthenticationPrincipal User user,
      @PathVariable("filename") String filename) {
    if (!transactionService.isReceiptOwnedByUser(user.getId(), filename)) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
    }
    try {
      var path = receiptStorageService.resolve(filename);
      if (!Files.exists(path)) {
        throw new ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND, "Receipt not found");
      }
      Resource resource = new UrlResource(path.toUri());
      String contentType = Files.probeContentType(path);
      if (contentType == null) {
        contentType = "image/jpeg";
      }
      return ResponseEntity.ok()
          .contentType(MediaType.parseMediaType(contentType))
          .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
          .body(resource);
    } catch (IOException e) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.NOT_FOUND, "Receipt not found");
    }
  }

  private TransactionResponse toResponse(Transaction tx) {
    String category = tx.getCategory() == null ? null : tx.getCategory().getName();
    return new TransactionResponse(
        tx.getId(),
        tx.getUser().getId(),
        tx.getAmount(),
        tx.getDescription(),
        category,
        tx.getOccurredAt(),
        tx.getReceiptUrl(),
        tx.getCreatedAt(),
        tx.getUpdatedAt());
  }

}
