import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { getApiErrorMessage, getApiUrl } from '../src/lib/api';
import { getItem } from '../src/lib/storage';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { SectionCard } from '../src/components/SectionCard';

type ReceiptParseResponse = { rawText: string; amount: number | null };

export default function ReceiptUpload() {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  async function pickReceipt() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setAsset(result.assets[0]);
    }
  }

  async function uploadReceipt() {
    if (!asset) {
      setStatus('Select a receipt image first.');
      return;
    }
    setStatus('Uploading receipt...');
    const formData = new FormData();
    const webFile = (asset as ImagePicker.ImagePickerAsset & { file?: File }).file;
    if (Platform.OS === 'web') {
      if (webFile) {
        formData.append('file', webFile);
      } else {
        try {
          const res = await fetch(asset.uri);
          const blob = await res.blob();
          formData.append('file', blob, asset.fileName ?? 'receipt.jpg');
        } catch (e) {
          setStatus(`Failed to read image: ${(e as Error).message}`);
          return;
        }
      }
    } else {
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? 'receipt.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
    }
    const token = await getItem('smartwallet_token');
    const response = await fetch(`${getApiUrl()}/api/transactions/upload-receipt`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!response.ok) {
      setStatus(`Upload failed: ${await getApiErrorMessage(response)}`);
      return;
    }
    const data = (await response.json()) as ReceiptParseResponse;
    if (data.amount) {
      setAmount(String(data.amount));
    }
    setStatus('Receipt parsed.');
  }

  return (
    <ScreenContainer>
      <SectionCard>
        <Text style={styles.title}>Receipt Upload</Text>
        <Pressable style={styles.primaryButton} onPress={pickReceipt}>
          <Text style={styles.primaryButtonText}>Select Receipt</Text>
        </Pressable>
        {asset && <Image source={{ uri: asset.uri }} style={styles.preview} />}
        <Pressable style={styles.secondaryButton} onPress={uploadReceipt}>
          <Text style={styles.secondaryButtonText}>Run OCR</Text>
        </Pressable>
        {!!status && <Text style={styles.helper}>{status}</Text>}
      </SectionCard>

      <SectionCard>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          placeholder="Amount"
          placeholderTextColor="#94a3b8"
          value={amount}
          onChangeText={setAmount}
        />
        <Text style={styles.label}>Merchant</Text>
        <TextInput
          style={styles.input}
          placeholder="Merchant"
          placeholderTextColor="#94a3b8"
          value={merchant}
          onChangeText={setMerchant}
        />
        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          placeholder="Category"
          placeholderTextColor="#94a3b8"
          value={category}
          onChangeText={setCategory}
        />
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginTop: 12,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#e2e8f0',
  },
  helper: {
    color: '#cbd5f5',
    marginTop: 8,
    fontSize: 12,
  },
});
