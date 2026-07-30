import { useState } from 'react';
import { View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { MealType, NutritionLogDTO } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { MealTypePicker } from '@/components/MealTypePicker';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';
import { defaultMealTypeForNow } from '@/lib/mealTime';

export default function LogBarcodeScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [mealType, setMealType] = useState<MealType>(defaultMealTypeForNow());
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NutritionLogDTO | null>(null);

  async function handleScan(scan: BarcodeScanningResult) {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    setError(null);
    try {
      const log = await api.post<NutritionLogDTO>('/api/nutrition/logs', {
        mealType,
        source: 'BARCODE',
        barcode: scan.data,
      });
      setResult(log);
      queryClient.invalidateQueries({ queryKey: ['nutrition-summary'] });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not look up that barcode. Try again or log it from the text option instead.',
      );
      setScanned(false);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.l24 }}>
          <Text variant="heading">Logged!</Text>
          <Text variant="bodyMedium">{result.description}</Text>
          <Text color="inkMuted">
            {result.calories} kcal · {result.proteinG}g protein · {result.carbsG}g carbs · {result.fatG}g fat
          </Text>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.l24 }}>
          <Text style={{ textAlign: 'center' }}>Gym App needs camera access to scan barcodes.</Text>
          <Button label="Allow camera access" onPress={requestPermission} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ padding: theme.spacing.l24, gap: theme.spacing.m16 }}>
        <Text variant="display">Scan a barcode</Text>
        <MealTypePicker value={mealType} onChange={setMealType} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: theme.spacing.l24, gap: theme.spacing.m16 }}>
        <View style={{ flex: 1, borderRadius: theme.radius.lg20, overflow: 'hidden' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={scanned ? undefined : handleScan}
          />
        </View>
        <View style={{ paddingBottom: theme.spacing.l24, gap: theme.spacing.s8 }}>
          {loading && (
            <Text color="inkMuted" style={{ textAlign: 'center' }}>
              Looking that up...
            </Text>
          )}
          {error && (
            <>
              <Text color="danger" style={{ textAlign: 'center' }}>
                {error}
              </Text>
              <Button label="Try again" variant="secondary" onPress={() => setError(null)} />
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}
