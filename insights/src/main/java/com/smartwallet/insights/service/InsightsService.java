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
}
