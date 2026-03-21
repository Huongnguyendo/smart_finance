import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useUser } from '../../src/contexts/UserContext';
import { theme } from '../../src/theme';
import { apiAuthJson, getApiUrl } from '../../src/lib/api';
import { getItem } from '../../src/lib/storage';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SectionCard } from '../../src/components/SectionCard';

type ReceiptParseResponse = { rawText: string; amount: number | null; receiptUrl?: string | null; merchant?: string | null };

export default function Add() {
  const { user } = useUser();
  const [receiptAsset, setReceiptAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [parsedAmount, setParsedAmount] = useState<string>('');
  const [ocrRawText, setOcrRawText] = useState<string>('');
  const [status, setStatus] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [parsedMerchant, setParsedMerchant] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestMessage, setSuggestMessage] = useState<string | null>(null);
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchSuggestion() {
    if (!user?.id) {
      setSuggestMessage('Please log in to get suggestions.');
      return;
    }
    const amt = Number(amount || parsedAmount) || 0;
    if (amt <= 0) {
      setSuggestMessage('Enter an amount first.');
      return;
    }
    setSuggestLoading(true);
    setSuggestedCategory(null);
    setSuggestMessage(null);
    try {
      const desc = notes || parsedMerchant || '';
      const receiptText = ocrRawText || '';
      const params = new URLSearchParams({
        amount: String(amt),
        description: desc,
      });
      if (receiptText) params.set('receiptText', receiptText);
      const res = await apiAuthJson<{ categoryName: string | null; confidence: number }>(
        `/api/transactions/suggest-category?${params.toString()}`
      );
      const suggested = res.categoryName && res.confidence >= 0.6 ? res.categoryName : null;
      setSuggestedCategory(suggested);
      if (suggested) {
        setSuggestMessage(null);
      } else {
        const hasContext = desc.trim().length >= 3 || receiptText.trim().length >= 10;
        setSuggestMessage(hasContext
          ? 'No suggestion – try adding more detail in Notes.'
          : 'Add a store name in Notes, or run OCR on a receipt for context-based suggestions.');
      }
    } catch (e) {
      setSuggestedCategory(null);
      setSuggestMessage(`Suggestion failed: ${(e as Error).message}`);
    } finally {
      setSuggestLoading(false);
    }
  }

  // Auto-fetch suggestion when amount/notes change (debounced)
  useEffect(() => {
    if (!user?.id) {
      setSuggestedCategory(null);
      return;
    }
    const amt = Number(amount || parsedAmount) || 0;
    if (amt <= 0) {
      setSuggestedCategory(null);
      return;
    }
    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
    suggestTimeoutRef.current = setTimeout(async () => {
      try {
        const desc = notes || parsedMerchant || '';
        const receiptText = ocrRawText || '';
        const params = new URLSearchParams({
          amount: String(amt),
          description: desc,
        });
        if (receiptText) params.set('receiptText', receiptText);
        const res = await apiAuthJson<{ categoryName: string | null; confidence: number }>(
          `/api/transactions/suggest-category?${params.toString()}`
        );
        setSuggestedCategory(res.categoryName && res.confidence >= 0.6 ? res.categoryName : null);
      } catch {
        setSuggestedCategory(null);
      }
      suggestTimeoutRef.current = null;
    }, 600);
    return () => {
      if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
    };
  }, [user?.id, amount, parsedAmount, notes, parsedMerchant, ocrRawText]);

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setReceiptAsset(result.assets[0]);
    }
  }

  async function captureCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setStatus('Camera permission is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setReceiptAsset(result.assets[0]);
    }
  }

  async function uploadReceipt() {
    if (!receiptAsset) {
      setStatus('Select a receipt image first.');
      return;
    }
    setStatus('Uploading receipt...');
    setOcrRawText('');
    setParsedAmount('');
    setParsedMerchant(null);

    const formData = new FormData();
    const webFile = (receiptAsset as ImagePicker.ImagePickerAsset & { file?: File })
      .file;

    if (Platform.OS === 'web') {
      // On web, expo-image-picker often doesn't provide .file. Fetch from blob/data URI.
      if (webFile) {
        formData.append('file', webFile);
      } else {
        try {
          const res = await fetch(receiptAsset.uri);
          const blob = await res.blob();
          const filename = receiptAsset.fileName ?? 'receipt.jpg';
          const mimeType = blob.type || receiptAsset.mimeType || 'image/jpeg';
          formData.append('file', new File([blob], filename, { type: mimeType }));
        } catch (e) {
          setStatus(`Failed to read image: ${(e as Error).message}`);
          return;
        }
      }
    } else {
      formData.append('file', {
        uri: receiptAsset.uri,
        name: receiptAsset.fileName ?? 'receipt.jpg',
        type: receiptAsset.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
    }

    const token = await getItem('smartwallet_token');
    const response = await fetch(`${getApiUrl()}/api/transactions/upload-receipt`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!response.ok) {
      const text = await response.text();
      setStatus(`Upload failed: ${text}`);
      return;
    }
    const data = (await response.json()) as ReceiptParseResponse;
    setOcrRawText(data.rawText ?? '');
    if (data.amount) {
      setAmount(String(data.amount));
      setParsedAmount(String(data.amount));
      setStatus('Receipt parsed.');
    } else {
      setStatus(
        data.rawText
          ? 'OCR ran but no amount found. Check text below and enter manually.'
          : 'OCR returned no text. Try a clearer image or enter amount manually.'
      );
    }
    if (data.receiptUrl) {
      setReceiptUrl(data.receiptUrl);
    }
    if (data.merchant) {
      setParsedMerchant(data.merchant);
      setNotes(data.merchant);
    }
  }

  async function saveTransaction() {
    if (!user?.id) {
      setStatus('Please log in to save transactions.');
      return;
    }
    const rawAmount = Number(amount || parsedAmount) || 0;
    if (rawAmount === 0) {
      setStatus('Please enter an amount. OCR may not have detected it.');
      return;
    }
    setStatus('Saving transaction...');
    try {
      // Receipt amounts are expenses (negative)
      const finalAmount = receiptUrl && rawAmount > 0 ? -rawAmount : rawAmount;

      await apiAuthJson('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id ?? 0,
          amount: finalAmount,
          categoryName: category || null,
          description: notes || parsedMerchant || null,
          date: new Date().toISOString(),
          receiptUrl: receiptUrl || null,
        }),
      });
      setStatus('Transaction saved.');
    } catch (error) {
      setStatus(`Save failed: ${(error as Error).message}`);
    }
  }

  return (
    <ScreenContainer>
      <SectionCard>
        <Text style={styles.sectionTitle}>Add Receipt / Transaction</Text>
        <View style={styles.buttonRow}>
          <Pressable style={styles.primaryButton} onPress={pickFromLibrary}>
            <Text style={styles.primaryButtonText}>Upload Receipt</Text>
          </Pressable>
          {Platform.OS !== 'web' && (
            <Pressable style={styles.secondaryButton} onPress={captureCamera}>
              <Text style={styles.secondaryButtonText}>Open Camera</Text>
            </Pressable>
          )}
        </View>

        {receiptAsset && (
          <Image source={{ uri: receiptAsset.uri }} style={styles.preview} />
        )}
        <Pressable style={styles.secondaryButton} onPress={uploadReceipt}>
          <Text style={styles.secondaryButtonText}>Run OCR</Text>
        </Pressable>
        {!!parsedAmount && (
          <Text style={styles.helper}>Detected amount: ${parsedAmount}</Text>
        )}
        {!!parsedMerchant && (
          <Text style={styles.helper}>Detected merchant: {parsedMerchant}</Text>
        )}
        {!!ocrRawText && (
          <Text style={[styles.helper, styles.ocrText]} numberOfLines={6}>
            OCR text: {ocrRawText}
          </Text>
        )}
      </SectionCard>

      <SectionCard style={styles.formSection}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          placeholder="$0.00"
          placeholderTextColor={theme.colors.textMuted}
          value={amount}
          onChangeText={setAmount}
        />
        <Text style={styles.label}>Notes / Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="e.g. Starbucks, Uber, Netflix"
          placeholderTextColor={theme.colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          <TextInput
            style={[styles.input, styles.categoryInput]}
            placeholder="e.g. Food, Transport"
            placeholderTextColor={theme.colors.textMuted}
            value={category}
            onChangeText={(t) => {
              setCategory(t);
              if (t) setSuggestedCategory(null);
            }}
          />
          <Pressable
            style={[
              styles.suggestButton,
              (Number(amount || parsedAmount) || 0) <= 0 && styles.suggestButtonDisabled,
            ]}
            onPress={fetchSuggestion}
            disabled={suggestLoading || (Number(amount || parsedAmount) || 0) <= 0}
          >
            <Text style={styles.suggestButtonText}>
              {suggestLoading ? '...' : 'Suggest'}
            </Text>
          </Pressable>
        </View>
        {suggestedCategory && !category && (
          <Pressable
            style={styles.suggestChip}
            onPress={() => {
              setCategory(suggestedCategory);
              setSuggestMessage(null);
            }}
          >
            <Text style={styles.suggestChipText}>Suggested: {suggestedCategory}</Text>
            <Text style={styles.suggestChipTap}>Tap to use</Text>
          </Pressable>
        )}
        {suggestMessage && (
          <Text style={styles.suggestMessage}>{suggestMessage}</Text>
        )}
        <Pressable style={styles.primaryButton} onPress={saveTransaction}>
          <Text style={styles.primaryButtonText}>Save Transaction</Text>
        </Pressable>
        {!!status && <Text style={styles.helper}>{status}</Text>}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  formSection: {
    marginTop: 24,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: theme.radii.md,
    marginTop: 12,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.bgInput,
    borderRadius: theme.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  helper: {
    color: theme.colors.textMuted,
    marginTop: 8,
    fontSize: 13,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryInput: {
    flex: 1,
  },
  suggestButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
  },
  suggestButtonDisabled: {
    opacity: 0.5,
  },
  suggestButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.bgInput,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderStyle: 'dashed',
  },
  suggestChipText: {
    color: theme.colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  suggestChipTap: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  suggestMessage: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  ocrText: {
    opacity: 0.9,
  },
});
