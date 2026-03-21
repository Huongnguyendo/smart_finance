package com.smartwallet.ml.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartwallet.core.domain.Transaction;
import com.smartwallet.core.service.CategorySuggestionService;
import com.smartwallet.transactions.TransactionRepository;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import smile.classification.KNN;

@Service
public class MlCategorySuggestionService implements CategorySuggestionService {

  private static final Logger log = LoggerFactory.getLogger(MlCategorySuggestionService.class);
  private static final int MIN_TRAINING_SAMPLES = 20;
  private static final double CONFIDENCE_THRESHOLD = 0.6;
  private static final int HASH_FEATURES = 50;
  private static final int K_NEIGHBORS = 5;
  private static final Pattern WORD = Pattern.compile("[a-zA-Z0-9]+");
  private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
  private static final Set<String> VALID_GROQ_CATEGORIES =
      Set.of("Food", "Grocery", "Transport", "Entertainment", "Shopping", "Bills", "Other");

  // Store/merchant keywords
  private static final Map<String, String> STORE_KEYWORDS = Map.ofEntries(
      Map.entry("starbucks", "Food"),
      Map.entry("mcdonald", "Food"),
      Map.entry("chipotle", "Food"),
      Map.entry("whole foods", "Grocery"),
      Map.entry("trader joe", "Grocery"),
      Map.entry("pizza", "Food"),
      Map.entry("grocery", "Grocery"),
      Map.entry("supermarket", "Grocery"),
      Map.entry("restaurant", "Food"),
      Map.entry("cafe", "Food"),
      Map.entry("coffee", "Food"),
      Map.entry("uber eats", "Food"),
      Map.entry("doordash", "Food"),
      Map.entry("safeway", "Grocery"),
      Map.entry("kroger", "Grocery"),
      Map.entry("costco", "Shopping"),
      Map.entry("cvs", "Shopping"),
      Map.entry("walgreens", "Shopping"),
      Map.entry("uber", "Transport"),
      Map.entry("lyft", "Transport"),
      Map.entry("taxi", "Transport"),
      Map.entry("gas station", "Transport"),
      Map.entry("shell gas", "Transport"),
      Map.entry("netflix", "Entertainment"),
      Map.entry("spotify", "Entertainment"),
      Map.entry("hulu", "Entertainment"),
      Map.entry("electric", "Bills"),
      Map.entry("gas company", "Bills"),
      Map.entry("water bill", "Bills"),
      Map.entry("utility", "Bills"),
      Map.entry("comcast", "Bills"),
      Map.entry("verizon", "Bills"),
      Map.entry("at&t", "Bills"),
      Map.entry("insurance", "Bills"),
      Map.entry("amazon", "Shopping"),
      Map.entry("target", "Shopping"),
      Map.entry("walmart", "Shopping")
  );

  // Item/content keywords: infer category from what was bought (works for any store name)
  private static final Map<String, String> ITEM_KEYWORDS = Map.ofEntries(
      Map.entry("egg", "Grocery"),
      Map.entry("milk", "Grocery"),
      Map.entry("bread", "Grocery"),
      Map.entry("cheese", "Grocery"),
      Map.entry("produce", "Grocery"),
      Map.entry("organic", "Grocery"),
      Map.entry("dairy", "Grocery"),
      Map.entry("meat", "Grocery"),
      Map.entry("fruit", "Grocery"),
      Map.entry("vegetable", "Grocery"),
      Map.entry("grocery", "Grocery"),
      Map.entry("snack", "Food"),
      Map.entry("sbux", "Food"),
      Map.entry("french roast", "Food"),
      Map.entry("whole bean", "Food"),
      Map.entry("free range", "Food"),
      Map.entry("flatscreen", "Shopping"),
      Map.entry("flat screen", "Shopping"),
      Map.entry("tv", "Shopping"),
      Map.entry("television", "Shopping"),
      Map.entry("laptop", "Shopping"),
      Map.entry("computer", "Shopping"),
      Map.entry("hdmi", "Shopping"),
      Map.entry("homi", "Shopping"),
      Map.entry("cable", "Shopping"),
      Map.entry("sony", "Shopping"),
      Map.entry("electronics", "Shopping"),
      Map.entry("discount goods", "Shopping"),
      Map.entry("warehouse", "Shopping")
  );

  private final TransactionRepository transactionRepository;
  private final int minSamples;
  private final String groqApiKey;
  private final ObjectMapper objectMapper = new ObjectMapper();

  private final Map<Long, ModelState> modelCache = new HashMap<>();

  public MlCategorySuggestionService(
      TransactionRepository transactionRepository,
      @Value("${ml.categorization.min-samples:" + MIN_TRAINING_SAMPLES + "}") int minSamples,
      @Value("${GROQ_API_KEY:}") String groqApiKey) {
    this.transactionRepository = transactionRepository;
    this.minSamples = minSamples;
    this.groqApiKey = groqApiKey != null ? groqApiKey.trim() : "";
  }

  @Override
  public Optional<CategorySuggestion> suggest(Long userId, String description, BigDecimal amount, Instant occurredAt, String receiptText) {
    // 0. Groq LLM when receipt text is available (best context for OCR)
    if (receiptText != null && !receiptText.isBlank() && !groqApiKey.isEmpty()) {
      Optional<CategorySuggestion> groq = suggestFromGroq(receiptText);
      if (groq.isPresent()) {
        return groq;
      }
    }

    String context = combineContext(description, receiptText);
    String lower = context != null ? context.toLowerCase() : "";

    // 1. Item/content keywords first: infer from what was bought (egg, milk, etc.) - works for any store
    if (!lower.isBlank()) {
      for (var e : ITEM_KEYWORDS.entrySet()) {
        if (lower.contains(e.getKey())) {
          return Optional.of(new CategorySuggestion(e.getValue(), 0.92));
        }
      }
    }

    // 2. Store/merchant keywords
    if (!lower.isBlank()) {
      for (var e : STORE_KEYWORDS.entrySet()) {
        if (lower.contains(e.getKey())) {
          return Optional.of(new CategorySuggestion(e.getValue(), 0.95));
        }
      }
    }

    // 3. Skip ML when context is empty or too short: model tends to guess from amount alone
    if (context == null || context.isBlank() || context.trim().length() < 3) {
      return Optional.empty();
    }

    // 4. Fall back to ML
    ModelState state = getOrTrainModel(userId);
    if (state == null) {
      return Optional.empty();
    }
    double[] features = extractFeatures(context, amount, occurredAt, state);
    int predictedClass = state.model.predict(features);
    double confidence = 0.75;
    if (confidence < CONFIDENCE_THRESHOLD) {
      return Optional.empty();
    }
    String categoryName = state.classIndexToName.get(predictedClass);
    return Optional.of(new CategorySuggestion(categoryName, confidence));
  }

  private String combineContext(String description, String receiptText) {
    boolean hasDesc = description != null && !description.isBlank();
    boolean hasReceipt = receiptText != null && !receiptText.isBlank();
    if (hasDesc && hasReceipt) return description + " " + receiptText;
    if (hasReceipt) return receiptText;
    return description;
  }

  private Optional<CategorySuggestion> suggestFromGroq(String receiptText) {
    try {
      String prompt = String.format(
          "Given this receipt text, suggest ONE category: Food, Grocery, Transport, Entertainment, Shopping, Bills, or Other. Reply with only the category name, nothing else.\n\nReceipt:\n%s",
          receiptText.length() > 2000 ? receiptText.substring(0, 2000) + "..." : receiptText
      );
      String systemPrompt =
          "You categorize receipts. Use these rules:\n"
              + "- Food = dining out: restaurants, cafes, takeout, delivery, fast food\n"
              + "- Grocery = groceries from supermarkets, grocery stores, ingredients for home cooking\n"
              + "Reply with exactly one word: Food, Grocery, Transport, Entertainment, Shopping, Bills, or Other.";
      Map<String, Object> payload = Map.of(
          "model", "llama-3.3-70b-versatile",
          "messages", List.of(
              Map.of("role", "system", "content", systemPrompt),
              Map.of("role", "user", "content", prompt)
          )
      );
      String body = objectMapper.writeValueAsString(payload);

      HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(GROQ_URL))
          .header("Authorization", "Bearer " + groqApiKey)
          .header("Content-Type", "application/json")
          .timeout(Duration.ofSeconds(15))
          .POST(HttpRequest.BodyPublishers.ofString(body))
          .build();

      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() != 200) {
        log.warn("Groq API error {}: {}", response.statusCode(), response.body());
        return Optional.empty();
      }

      JsonNode root = objectMapper.readTree(response.body());
      JsonNode choices = root.get("choices");
      if (choices == null || !choices.isArray() || choices.isEmpty()) {
        return Optional.empty();
      }
      JsonNode content = choices.get(0).get("message").get("content");
      if (content == null) {
        return Optional.empty();
      }
      String raw = content.asText().trim();
      String category = parseGroqCategory(raw);
      if (category != null) {
        return Optional.of(new CategorySuggestion(category, 0.9));
      }
      return Optional.empty();
    } catch (Exception e) {
      log.debug("Groq category suggestion failed: {}", e.getMessage());
      return Optional.empty();
    }
  }

  private String parseGroqCategory(String raw) {
    if (raw == null || raw.isBlank()) return null;
    String trimmed = raw.trim();
    if (VALID_GROQ_CATEGORIES.contains(trimmed)) return trimmed;
    // Handle "Food." or "The category is Food" etc.
    for (String cat : VALID_GROQ_CATEGORIES) {
      if (trimmed.equalsIgnoreCase(cat) || trimmed.toLowerCase().startsWith(cat.toLowerCase())) {
        return cat;
      }
    }
    String firstWord = trimmed.split("[\\s.,;:!?]+")[0];
    if (firstWord != null && VALID_GROQ_CATEGORIES.contains(firstWord)) return firstWord;
    return null;
  }

  private ModelState getOrTrainModel(Long userId) {
    synchronized (modelCache) {
      ModelState cached = modelCache.get(userId);
      if (cached != null) {
        return cached;
      }
    }
    List<Transaction> labeled = transactionRepository.findByUserIdAndCategoryIsNotNullOrderByCreatedAtDesc(userId);
    if (labeled.size() < minSamples) {
      log.debug("User {} has {} labeled transactions, need {} for ML categorization", userId, labeled.size(), minSamples);
      return null;
    }
    ModelState state = trainModel(labeled);
    if (state == null) {
      return null;
    }
    synchronized (modelCache) {
      modelCache.put(userId, state);
    }
    log.info("Trained ML categorization for user {} with {} samples, {} categories", userId, labeled.size(), state.classIndexToName.size());
    return state;
  }

  /** Invalidates the cached model for a user so it will be retrained with new data. */
  public void invalidateCache(Long userId) {
    synchronized (modelCache) {
      modelCache.remove(userId);
    }
  }

  private ModelState trainModel(List<Transaction> labeled) {
    Map<String, Integer> nameToIndex = new HashMap<>();
    for (Transaction t : labeled) {
      String name = t.getCategory().getName();
      nameToIndex.putIfAbsent(name, nameToIndex.size());
    }
    if (nameToIndex.size() < 2) {
      return null;
    }
    List<String> names = new ArrayList<>(nameToIndex.keySet());
    Map<Integer, String> indexToName = new HashMap<>();
    for (int i = 0; i < names.size(); i++) {
      indexToName.put(i, names.get(i));
    }

    double amountMax = 0;
    double lenMax = 0;
    for (Transaction t : labeled) {
      double a = t.getAmount().doubleValue();
      if (a > amountMax) amountMax = a;
      int len = t.getDescription() != null ? t.getDescription().length() : 0;
      if (len > lenMax) lenMax = len;
    }
    amountMax = Math.max(amountMax, 1);
    lenMax = Math.max(lenMax, 1);

    int n = labeled.size();
    double[][] X = new double[n][];
    int[] y = new int[n];
    for (int i = 0; i < n; i++) {
      Transaction t = labeled.get(i);
      X[i] = extractFeatures(t.getDescription(), t.getAmount(), t.getOccurredAt(), amountMax, lenMax);
      y[i] = nameToIndex.get(t.getCategory().getName());
    }

    try {
      KNN<double[]> model = KNN.fit(X, y, K_NEIGHBORS);
      return new ModelState(model, indexToName, amountMax, lenMax);
    } catch (Exception e) {
      log.warn("Failed to train ML categorization model: {}", e.getMessage());
      return null;
    }
  }

  private double[] extractFeatures(String description, BigDecimal amount, Instant occurredAt, ModelState state) {
    return extractFeatures(description, amount, occurredAt, state.amountMax, state.lenMax);
  }

  private double[] extractFeatures(String description, BigDecimal amount, Instant occurredAt, double amountMax, double lenMax) {
    double a = amount != null ? amount.doubleValue() : 0;
    double amountNorm = Math.log1p(Math.abs(a)) / (Math.log1p(amountMax) + 1e-6);
    int dow = occurredAt != null ? occurredAt.atZone(ZoneOffset.UTC).getDayOfWeek().getValue() % 7 : 0;
    int dom = occurredAt != null ? occurredAt.atZone(ZoneOffset.UTC).getDayOfMonth() : 1;
    int len = description != null ? Math.min(description.length(), 500) : 0;
    double lenNorm = len / (lenMax + 1);

    double[] hashFeat = new double[HASH_FEATURES];
    if (description != null && !description.isBlank()) {
      var matcher = WORD.matcher(description.toLowerCase());
      while (matcher.find()) {
        String w = matcher.group();
        if (w.length() >= 2) {
          int idx = Math.abs(w.hashCode() % HASH_FEATURES);
          hashFeat[idx] += 1;
        }
      }
      double sum = 0;
      for (double v : hashFeat) sum += v;
      if (sum > 0) {
        for (int i = 0; i < hashFeat.length; i++) {
          hashFeat[i] /= sum;
        }
      }
    }

    double[] features = new double[4 + HASH_FEATURES];
    features[0] = amountNorm;
    features[1] = dow / 7.0;
    features[2] = dom / 31.0;
    features[3] = lenNorm;
    System.arraycopy(hashFeat, 0, features, 4, HASH_FEATURES);
    return features;
  }

  private record ModelState(
      KNN<double[]> model,
      Map<Integer, String> classIndexToName,
      double amountMax,
      double lenMax) {}
}
