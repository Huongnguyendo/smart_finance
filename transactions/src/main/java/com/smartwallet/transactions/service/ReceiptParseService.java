package com.smartwallet.transactions.service;

import com.smartwallet.transactions.ocr.ReceiptOcrService;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ReceiptParseService {

  // Primary: total/amount/balance/due/parking/visa followed by optional $ and digits
  private static final Pattern KEYWORD_PATTERN =
      Pattern.compile(
          "(?:total|amount|balance|due|sum|grand\\s*total|parking|visa|charge)[^0-9$]*\\$?\\s*([0-9]+[.,][0-9]{2})",
          Pattern.CASE_INSENSITIVE);

  // Fallback: any $X.XX or X.XX (take last occurrence - often the total)
  private static final Pattern ANY_AMOUNT_PATTERN =
      Pattern.compile("\\$?\\s*([0-9]+[.,][0-9]{2})");

  // Last resort: whole-dollar amounts like $150 (parking, round totals)
  private static final Pattern WHOLE_DOLLAR_PATTERN =
      Pattern.compile("\\$?\\s*([0-9]{2,})\\b(?!\\.[0-9])");

  private final ReceiptOcrService ocrService;

  public ReceiptParseService(ReceiptOcrService ocrService) {
    this.ocrService = ocrService;
  }

  public ReceiptParseResult parse(MultipartFile file) {
    String text = ocrService.extractText(file);
    Optional<BigDecimal> amount = extractAmount(text);
    String merchant = extractMerchant(text);
    return new ReceiptParseResult(text, amount.orElse(null), merchant);
  }

  /** Parse from stored file (use after store to avoid MultipartFile stream consumption). */
  public ReceiptParseResult parse(Path path) {
    String text = ocrService.extractText(path.toFile());
    Optional<BigDecimal> amount = extractAmount(text);
    String merchant = extractMerchant(text);
    return new ReceiptParseResult(text, amount.orElse(null), merchant);
  }

  private static final Pattern ADDRESS_STREET =
      Pattern.compile("\\b(Pkwy|Pkwy\\.|St\\.?|Ave\\.?|Blvd|Rd\\.?|Dr\\.?|Ln\\.?|Way|Ct\\.?|Hwy|Cir\\.?)\\b", Pattern.CASE_INSENSITIVE);
  private static final Pattern STARTS_WITH_NUMBER = Pattern.compile("^\\d+\\s");
  private static final Pattern STORE_KEYWORD =
      Pattern.compile(
          "\\b(PARKING\\s*GARAGE|SUPERMARKET|GROCERY|MARKET|FOOD|STORE|RITE AID|CVS|WALGREENS|TARGET|WALMART|COSTCO|TRADER JOE|WHOLE FOODS|SAFEWAY|KROGER)\\b",
          Pattern.CASE_INSENSITIVE);

  /** Extract merchant/store name from receipt—prefer store names over addresses. */
  private String extractMerchant(String text) {
    if (text == null || text.isBlank()) return null;
    // First: search full text for known store types (PARKING GARAGE, SUPERMARKET, etc.)
    Matcher storeMatcher = STORE_KEYWORD.matcher(text);
    if (storeMatcher.find()) return storeMatcher.group(1);
    // Second: scan lines, skip addresses, prefer store-like lines
    String[] lines = text.split("\\r?\\n");
    String fallback = null;
    for (String line : lines) {
      String trimmed = line.trim();
      if (trimmed.isEmpty()) continue;
      if (trimmed.matches(".*\\d{5}(-\\d{4})?.*")
          || trimmed.matches("\\d{1,2}/\\d{1,2}/\\d{2,4}.*")
          || trimmed.matches(".*\\d{3,}.*\\d{3,}.*")
          || trimmed.matches("(?i)(total|subtotal|amount|tax|tip|balance|due|sum|grand\\s*total).*")
          || trimmed.length() < 3 || trimmed.length() > 60) continue;
      if (ADDRESS_STREET.matcher(trimmed).find() || STARTS_WITH_NUMBER.matcher(trimmed).find()) continue;
      if (fallback == null) fallback = trimmed;
    }
    return fallback;
  }

  private Optional<BigDecimal> extractAmount(String text) {
    if (text == null || text.isBlank()) {
      return Optional.empty();
    }
    // Try keyword-based match first (more reliable)
    Matcher keywordMatcher = KEYWORD_PATTERN.matcher(text);
    BigDecimal lastKeywordMatch = null;
    while (keywordMatcher.find()) {
      lastKeywordMatch = parseAmountGroup(keywordMatcher.group(1));
    }
    if (lastKeywordMatch != null) {
      return Optional.of(lastKeywordMatch);
    }
    // Fallback: take the last dollar amount (often the total on receipts)
    Matcher anyMatcher = ANY_AMOUNT_PATTERN.matcher(text);
    BigDecimal lastMatch = null;
    while (anyMatcher.find()) {
      lastMatch = parseAmountGroup(anyMatcher.group(1));
    }
    if (lastMatch != null) {
      return Optional.of(lastMatch);
    }
    // Last resort: whole-dollar amounts (e.g. $150 on parking receipts)
    Matcher wholeMatcher = WHOLE_DOLLAR_PATTERN.matcher(text);
    BigDecimal lastWhole = null;
    while (wholeMatcher.find()) {
      lastWhole = new BigDecimal(wholeMatcher.group(1));
    }
    return Optional.ofNullable(lastWhole);
  }

  private static BigDecimal parseAmountGroup(String group) {
    if (group == null) return null;
    String normalized = group.replace(',', '.');
    return new BigDecimal(normalized);
  }
}
