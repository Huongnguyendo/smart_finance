#!/usr/bin/env bash
# Seeds 25+ labeled transactions for ML categorization testing.
# Requires: curl, jq (for JSON parsing)
#
# Usage:
#   ./scripts/seed-ml-training-data.sh
#   API_URL=http://localhost:8080 EMAIL=test@example.com PASSWORD=test123 ./scripts/seed-ml-training-data.sh

set -e

API_URL="${API_URL:-http://localhost:8080}"
EMAIL="${EMAIL:-ml-test@example.com}"
PASSWORD="${PASSWORD:-test123}"

# Transaction data: description, amount, category, months_ago (for recurring detection)
# Format: "description|amount|category|months_ago" (months_ago = 0,1,2,3,4,5 for spread over 6 months)
# Recurring items (same desc+amount) get spread monthly; one-offs use 0
TRANSACTIONS=(
  "Starbucks coffee|5.99|Food|0"
  "McDonald's lunch|12.50|Food|0"
  "Whole Foods groceries|85.23|Food|0"
  "Uber ride to airport|45.00|Transport|0"
  "Shell gas station|52.00|Transport|0"
  "Lyft downtown|18.75|Transport|0"
  "Netflix subscription|15.99|Entertainment|0"
  "Netflix subscription|15.99|Entertainment|1"
  "Netflix subscription|15.99|Entertainment|2"
  "Spotify premium|9.99|Entertainment|0"
  "Spotify premium|9.99|Entertainment|1"
  "Spotify premium|9.99|Entertainment|2"
  "AMC movie tickets|24.00|Entertainment|0"
  "Amazon Prime|14.99|Shopping|0"
  "Amazon Prime|14.99|Shopping|1"
  "Target household items|67.45|Shopping|0"
  "Walmart groceries|92.30|Shopping|0"
  "Electric bill|125.00|Bills|0"
  "Electric bill|125.00|Bills|1"
  "Electric bill|125.00|Bills|2"
  "Internet Comcast|79.99|Bills|0"
  "Internet Comcast|79.99|Bills|1"
  "Rent payment|1200.00|Bills|0"
  "Rent payment|1200.00|Bills|1"
  "Rent payment|1200.00|Bills|2"
  "Starbucks latte|6.50|Food|1"
  "Chipotle dinner|14.25|Food|0"
  "Trader Joe's|42.18|Food|0"
  "Uber Eats delivery|28.90|Food|0"
  "Taxi ride|22.00|Transport|0"
  "Parking meter|8.00|Transport|0"
  "Bus pass monthly|65.00|Transport|0"
  "Bus pass monthly|65.00|Transport|1"
  "Hulu subscription|11.99|Entertainment|0"
  "Hulu subscription|11.99|Entertainment|1"
  "Steam game purchase|29.99|Entertainment|0"
  "Coffee shop|4.75|Food|0"
  "Pizza Hut|23.50|Food|0"
  "Grocery store|58.00|Food|0"
)

echo "=== ML Training Data Seeder ==="
echo "API: $API_URL"
echo ""

# Register or login
echo "Authenticating..."
AUTH_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"displayName\":\"ML Test User\"}" \
  2>/dev/null || true)

if echo "$AUTH_RESPONSE" | jq -e '.token' >/dev/null 2>&1; then
  echo "Registered new user."
else
  echo "User may exist, trying login..."
  AUTH_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
    2>/dev/null)
fi

TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token')
USER_ID=$(echo "$AUTH_RESPONSE" | jq -r '.user.id')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "ERROR: Failed to get auth token. Response: $AUTH_RESPONSE"
  exit 1
fi

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
  echo "ERROR: Failed to get user ID. Response: $AUTH_RESPONSE"
  exit 1
fi

echo "User ID: $USER_ID"
echo ""

# Create transactions
COUNT=0
for entry in "${TRANSACTIONS[@]}"; do
  IFS='|' read -r desc amount category months_ago <<< "$entry"
  # Date: months_ago months back (30 days each) for recurring detection
  if [ -n "$months_ago" ] && [ "$months_ago" -gt 0 ] 2>/dev/null; then
    DAYS=$((months_ago * 30))
    DATE=$(date -u -v-${DAYS}d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "-${DAYS} days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")
  else
    DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  fi

  # Escape double quotes in description for JSON
  DESC_ESC=${desc//\"/\\\"}
  BODY=$(cat <<EOF
{
  "userId": $USER_ID,
  "amount": $amount,
  "description": "$DESC_ESC",
  "categoryName": "$category",
  "date": "$DATE"
}
EOF
)

  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/transactions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$BODY")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    COUNT=$((COUNT + 1))
    echo "  [$COUNT] $desc | \$$amount | $category"
  else
    echo "  FAILED: $desc (HTTP $HTTP_CODE)"
  fi
done

echo ""
echo "=== Done: $COUNT transactions created ==="
echo "Test ML suggest: curl \"$API_URL/api/transactions/suggest-category?userId=$USER_ID&amount=6.00&description=Starbucks\" -H \"Authorization: Bearer $TOKEN\""
