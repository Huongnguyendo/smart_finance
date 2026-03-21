package com.smartwallet.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RateLimitFilter extends OncePerRequestFilter {

  private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

  @Value("${rate-limit.enabled:true}")
  private boolean enabled;

  @Value("${rate-limit.capacity:100}")
  private int capacity;

  @Value("${rate-limit.refill-minutes:1}")
  private int refillMinutes;

  @Value("${rate-limit.exclude-paths:/health,/actuator/health,/actuator/info}")
  private String excludePathsStr;

  private List<String> getExcludePaths() {
    if (excludePathsStr == null || excludePathsStr.isBlank()) return List.of();
    return Arrays.stream(excludePathsStr.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
  }

  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    if (!enabled) return true;
    String path = request.getRequestURI();
    return getExcludePaths().stream().anyMatch(path::startsWith);
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {
    String key = resolveKey(request);
    Bucket bucket = buckets.computeIfAbsent(key, k -> createBucket());

    if (bucket.tryConsume(1)) {
      filterChain.doFilter(request, response);
    } else {
      log.warn("Rate limit exceeded for key: {}", maskKey(key));
      response.setStatus(429); // Too Many Requests
      response.setContentType("application/json");
      response.getWriter().write("{\"error\":\"Too many requests. Please try again later.\"}");
    }
  }

  private String resolveKey(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      return forwarded.split(",")[0].trim();
    }
    String realIp = request.getHeader("X-Real-IP");
    if (realIp != null && !realIp.isBlank()) {
      return realIp;
    }
    return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
  }

  private Bucket createBucket() {
    Bandwidth limit = Bandwidth.classic(
        capacity,
        Refill.greedy(capacity, Duration.ofMinutes(refillMinutes)));
    return Bucket.builder().addLimit(limit).build();
  }

  private static String maskKey(String key) {
    if (key == null || key.length() < 8) return "***";
    return key.substring(0, Math.min(4, key.length())) + "***";
  }
}
