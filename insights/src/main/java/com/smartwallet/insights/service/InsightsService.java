package com.smartwallet.insights.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class InsightsService {

  private static final Logger log = LoggerFactory.getLogger(InsightsService.class);
  private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
  private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
  private static final String HF_URL = "https://router.huggingface.co/v1/chat/completions";
  private static final String DEFAULT_OLLAMA_URL = "http://localhost:11434";
  private static final String NO_AI_MSG = "AI insights unavailable. Add GROQ_API_KEY (free at console.groq.com) or HF_TOKEN (huggingface.co/settings/tokens) for AI features.";

  private final String openaiKey;
  private final String groqKey;
  private final String hfToken;
  private final String ollamaUrl;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public InsightsService(
      @Value("${OPENAI_API_KEY:}") String apiKey,
      @Value("${GROQ_API_KEY:}") String groqKey,
      @Value("${HF_TOKEN:}") String hfToken,
      @Value("${OLLAMA_URL:}") String ollamaUrl) {
    this.openaiKey = trimEnv(apiKey, "OPENAI_API_KEY");
    this.groqKey = trimEnv(groqKey, "GROQ_API_KEY");
    this.hfToken = trimEnv(hfToken, "HF_TOKEN");

    String url = ollamaUrl != null ? ollamaUrl.trim() : "";
    if (url.isEmpty()) {
      String env = System.getenv("OLLAMA_URL");
      url = env != null ? env.trim() : "";
    }
    this.ollamaUrl = url.isEmpty() ? DEFAULT_OLLAMA_URL : url;

    if (!this.openaiKey.isEmpty()) {
      log.info("AI insights: OpenAI configured");
    } else if (!this.groqKey.isEmpty()) {
      log.info("AI insights: Groq configured (free tier), Hugging Face fallback");
    } else if (!this.hfToken.isEmpty()) {
      log.info("AI insights: Hugging Face configured");
    } else {
      log.info("AI insights: no cloud API key; will try Ollama for local dev");
    }
  }

  private static String trimEnv(String val, String envKey) {
    String s = val != null ? val.trim() : "";
    if (s.isEmpty()) {
      String e = System.getenv(envKey);
      s = e != null ? e.trim() : "";
    }
    return s != null ? s : "";
  }

  public boolean isConfigured() {
    return true;
  }

  public String getTransactionSuggestions(String description, double amount, String category) {
    String prompt = String.format(
        "Transaction: \"%s\" | $%.2f | Category: %s. "
            + "Give 2-3 short suggestions. Use the description to infer the merchant/type—don't hedge with 'if it was X.' "
            + "Do one of: (1) suggest category from the description, (2) do the math (e.g. weekly cost × 4 = monthly), (3) suggest a concrete swap (e.g. 'coffee maker pays for itself in 3 weeks'). "
            + "Never say: 'use a tracker,' 'look for loyalty programs,' 'review your budget.' Be specific. No preamble.",
        description != null ? description : "Unknown",
        amount,
        category != null ? category : "Uncategorized"
    );
    return callLLM(prompt);
  }

  public String getOptimizationTips(List<TransactionSummary> transactions) {
    if (transactions.isEmpty()) {
      return "Add transactions to get personalized optimization tips.";
    }
    StringBuilder sb = new StringBuilder();
    double total = 0;
    for (TransactionSummary t : transactions) {
      sb.append(String.format("- %s: $%.2f (%s)\n", t.description(), t.amount(), t.category() != null ? t.category() : "?"));
      total += t.amount();
    }
    String prompt = String.format(
        "Spending (total $%.2f):\n%s\n"
            + "Give 2-3 short optimization tips. Use ONLY the merchants/descriptions listed—do NOT guess or speculate what they might be. "
            + "If it says 'Starbucks', it's Starbucks. If it says 'Unknown', skip that one or give a general tip. "
            + "No generic advice like 'negotiate' or 'allocate to savings.' Be concrete. No preamble.",
        total,
        sb.toString()
    );
    return callLLM(prompt);
  }

  public String chat(String userMessage, Long userId, List<TransactionSummary> transactions) {
    String context = "";
    if (transactions != null && !transactions.isEmpty()) {
      StringBuilder sb = new StringBuilder();
      double total = 0;
      for (TransactionSummary t : transactions) {
        sb.append(String.format("- %s: $%.2f (%s)\n", t.description(), t.amount(), t.category() != null ? t.category() : "?"));
        total += t.amount();
      }
      context = String.format("\n\nUser's recent transactions (total $%.2f):\n%s", total, sb);
    }
    String prompt = String.format(
        "You are a personal finance assistant. The user asks: %s%s\n\nAnswer concisely (2-4 sentences). Be specific. No generic advice.",
        userMessage,
        context
    );
    return callLLM(prompt);
  }

  public String getOverviewInsights(Long userId, List<TransactionSummary> transactions) {
    if (transactions == null || transactions.isEmpty()) {
      return "Add transactions to get personalized AI insights.";
    }
    StringBuilder sb = new StringBuilder();
    double total = 0;
    for (TransactionSummary t : transactions) {
      sb.append(String.format("- %s: $%.2f (%s)\n", t.description(), t.amount(), t.category() != null ? t.category() : "?"));
      total += t.amount();
    }
    String prompt = String.format(
        "Recent transactions (total $%.2f):\n%s\n"
            + "Give 2-3 short insights. Use ONLY the merchants/descriptions listed—do NOT guess what they might be (no 'could be Netflix' or 'possibly a late fee'). "
            + "If the description says 'Starbucks', it's Starbucks. Do the math or suggest one concrete swap. No preamble.",
        total,
        sb.toString()
    );
    return callLLM(prompt);
  }

  public List<InsightCard> getOverviewInsightCards(Long userId, List<TransactionSummary> transactions) {
    if (transactions == null || transactions.isEmpty()) {
      return List.of(
          new InsightCard("Spending Summary", "No data yet", "Add a few transactions to unlock personalized spending patterns.", "neutral"),
          new InsightCard("Budget Warning", "Waiting", "Set monthly or category budgets to get automatic risk alerts.", "neutral"),
          new InsightCard("Unusual Activity", "None found", "There is not enough history yet to compare your spending behavior.", "neutral"),
          new InsightCard("Next Step", "Start small", "Upload a receipt or add your latest purchase to make insights useful.", "positive")
      );
    }

    StringBuilder txList = new StringBuilder();
    double total = 0;
    Map<String, Double> byCategory = new java.util.HashMap<>();
    TransactionSummary largest = null;
    for (TransactionSummary t : transactions) {
      double amount = Math.abs(t.amount());
      String category = t.category() != null && !t.category().isBlank() ? t.category() : "Other";
      txList.append(String.format("- %s: $%.2f (%s)\n", t.description(), amount, category));
      total += amount;
      byCategory.merge(category, amount, Double::sum);
      if (largest == null || amount > Math.abs(largest.amount())) {
        largest = t;
      }
    }

    String topCategory = byCategory.entrySet().stream()
        .max(Map.Entry.comparingByValue())
        .map(Map.Entry::getKey)
        .orElse("Other");
    double topAmount = byCategory.getOrDefault(topCategory, 0.0);

    String prompt = String.format(
        "Recent transactions total $%.2f. Top category: %s $%.2f. Transactions:\n%s\n"
            + "Return ONLY valid JSON as an array of exactly 4 objects. "
            + "Objects must have keys: title, label, body, tone. "
            + "Use these titles exactly: Spending Summary, Budget Warning, Unusual Activity, Next Step. "
            + "Tone must be one of: neutral, positive, warning, danger. "
            + "Body must be one short useful sentence based only on the listed data. Do not speculate.",
        total,
        topCategory,
        topAmount,
        txList
    );

    String raw = callLLM(prompt);
    List<InsightCard> aiCards = parseInsightCards(raw);
    return aiCards.isEmpty() ? fallbackInsightCards(transactions, total, topCategory, topAmount, largest) : aiCards;
  }

  private List<InsightCard> parseInsightCards(String raw) {
    if (raw == null || raw.isBlank() || raw.equals(NO_AI_MSG)) {
      return List.of();
    }
    try {
      String json = raw.trim();
      int start = json.indexOf('[');
      int end = json.lastIndexOf(']');
      if (start >= 0 && end > start) {
        json = json.substring(start, end + 1);
      }
      JsonNode root = objectMapper.readTree(json);
      if (!root.isArray()) {
        return List.of();
      }
      List<InsightCard> cards = new java.util.ArrayList<>();
      for (JsonNode node : root) {
        String title = node.path("title").asText("").trim();
        String label = node.path("label").asText("").trim();
        String body = node.path("body").asText("").trim();
        String tone = normalizeTone(node.path("tone").asText("neutral"));
        if (!title.isEmpty() && !body.isEmpty()) {
          cards.add(new InsightCard(title, label.isEmpty() ? "Insight" : label, body, tone));
        }
      }
      return cards.size() == 4 ? cards : List.of();
    } catch (Exception e) {
      log.debug("Could not parse structured insight cards: {}", e.getMessage());
      return List.of();
    }
  }

  private List<InsightCard> fallbackInsightCards(
      List<TransactionSummary> transactions,
      double total,
      String topCategory,
      double topAmount,
      TransactionSummary largest) {
    double avg = transactions.isEmpty() ? 0 : total / transactions.size();
    String largestDescription = largest != null ? largest.description() : "your largest transaction";
    double largestAmount = largest != null ? Math.abs(largest.amount()) : 0;
    String budgetTone = topAmount >= total * 0.6 ? "warning" : "neutral";
    String unusualTone = largestAmount > avg * 2 && transactions.size() >= 3 ? "warning" : "neutral";

    return List.of(
        new InsightCard(
            "Spending Summary",
            String.format("$%.2f tracked", round(total)),
            String.format("%s is your biggest category at $%.2f.", topCategory, round(topAmount)),
            "neutral"),
        new InsightCard(
            "Budget Warning",
            topAmount >= total * 0.6 ? "Concentrated" : "On watch",
            topAmount >= total * 0.6
                ? String.format("%s makes up most of this recent spending.", topCategory)
                : "No single category dominates your recent spending.",
            budgetTone),
        new InsightCard(
            "Unusual Activity",
            largestAmount > avg * 2 && transactions.size() >= 3 ? "Large item" : "Normal range",
            largestAmount > avg * 2 && transactions.size() >= 3
                ? String.format("%s at $%.2f is much higher than your average transaction.", largestDescription, round(largestAmount))
                : "Recent transactions look fairly even so far.",
            unusualTone),
        new InsightCard(
            "Next Step",
            "Action",
            String.format("Review %s first if you want the fastest spending improvement.", topCategory),
            "positive")
    );
  }

  private static double round(double value) {
    return Math.round(value * 100) / 100.0;
  }

  private static String normalizeTone(String tone) {
    return switch (tone == null ? "" : tone.trim().toLowerCase()) {
      case "positive", "warning", "danger" -> tone.trim().toLowerCase();
      default -> "neutral";
    };
  }

  private String callLLM(String userMessage) {
    // if (!openaiKey.isEmpty()) {
    //   String r = callOpenAICompatible(OPENAI_URL, openaiKey, "gpt-4o-mini", userMessage);
    //   if (r != null) return r;
    // }
    if (!groqKey.isEmpty()) {
      String r = callOpenAICompatible(GROQ_URL, groqKey, "llama-3.3-70b-versatile", userMessage);
      if (r != null) return r;
    }
    if (!hfToken.isEmpty()) {
      String r = callOpenAICompatible(HF_URL, hfToken, "Qwen/Qwen2.5-7B-Instruct-1M:fastest", userMessage);
      if (r != null) return r;
    }
    String r = callOllama(userMessage);
    return r != null ? r : NO_AI_MSG;
  }

  private String callOpenAICompatible(String url, String apiKey, String model, String userMessage) {
    try {
      Map<String, Object> payload = Map.of(
          "model", model,
          "messages", List.of(
              Map.of("role", "system", "content", "Personal finance assistant. Only analyze what's in the transaction list. Do not guess or speculate. Use merchant names as given. 1-2 sentences per point."),
              Map.of("role", "user", "content", userMessage)
          )
      );
      String body = objectMapper.writeValueAsString(payload);

      HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(url))
          .header("Authorization", "Bearer " + apiKey)
          .header("Content-Type", "application/json")
          .timeout(Duration.ofSeconds(30))
          .POST(HttpRequest.BodyPublishers.ofString(body))
          .build();

      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() != 200) {
        log.warn("API error {} {}: {}", url, response.statusCode(), response.body());
        return null;
      }

      JsonNode root = objectMapper.readTree(response.body());
      JsonNode choices = root.get("choices");
      if (choices != null && choices.isArray() && choices.size() > 0) {
        JsonNode content = choices.get(0).get("message").get("content");
        return content != null ? content.asText().trim() : "No response.";
      }
      return "No response from AI.";
    } catch (Exception e) {
      log.error("API call failed: {}", url, e);
      return null;
    }
  }

  private String callOllama(String userMessage) {
    try {
      Map<String, Object> payload = Map.of(
          "model", "llama3.2",
          "messages", List.of(
              Map.of("role", "system", "content", "Personal finance assistant. Only analyze what's in the transaction list. Do not guess or speculate. Use merchant names as given. 1-2 sentences per point."),
              Map.of("role", "user", "content", userMessage)
          ),
          "stream", false
      );
      String body = objectMapper.writeValueAsString(payload);

      String url = ollamaUrl.replaceAll("/$", "") + "/api/chat";
      HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(url))
          .header("Content-Type", "application/json")
          .timeout(Duration.ofSeconds(60))
          .POST(HttpRequest.BodyPublishers.ofString(body))
          .build();

      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() != 200) {
        log.warn("Ollama error: {} {}", response.statusCode(), response.body());
        return null;
      }

      JsonNode root = objectMapper.readTree(response.body());
      JsonNode message = root.get("message");
      if (message != null) {
        JsonNode content = message.get("content");
        return content != null ? content.asText().trim() : "No response.";
      }
      return "No response from AI.";
    } catch (Exception e) {
      log.debug("Ollama unavailable (expected in production): {}", e.getMessage());
      return null;
    }
  }

  public record TransactionSummary(String description, double amount, String category) {}
  public record InsightCard(String title, String label, String body, String tone) {}
}
