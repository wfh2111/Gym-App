import { useRef, useState } from 'react';
import { View, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
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

export default function LogPhotoScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mealType, setMealType] = useState<MealType>(defaultMealTypeForNow());
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NutritionLogDTO | null>(null);

  async function handleCapture() {
    const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.6 });
    if (photo?.base64) setPhotoBase64(photo.base64);
  }

  async function handleSubmit() {
    if (!photoBase64) return;
    setLoading(true);
    setError(null);
    try {
      const log = await api.post<NutritionLogDTO>('/api/nutrition/logs', {
        mealType,
        source: 'PHOTO',
        photoBase64,
        photoMediaType: 'image/jpeg',
      });
      setResult(log);
      queryClient.invalidateQueries({ queryKey: ['nutrition-summary'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log that meal. Try again.');
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
          <Text style={{ textAlign: 'center' }}>Gym App needs camera access to log meals by photo.</Text>
          <Button label="Allow camera access" onPress={requestPermission} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ padding: theme.spacing.l24, gap: theme.spacing.m16 }}>
        <Text variant="display">Log by photo</Text>
        <MealTypePicker value={mealType} onChange={setMealType} />
      </View>

      {photoBase64 ? (
        <View style={{ flex: 1, paddingHorizontal: theme.spacing.l24, gap: theme.spacing.m16 }}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${photoBase64}` }}
            style={{ flex: 1, borderRadius: theme.radius.lg20, backgroundColor: theme.colors.surfaceMuted }}
            resizeMode="cover"
          />
          {error && <Text color="danger">{error}</Text>}
          <View style={{ gap: theme.spacing.s8, paddingBottom: theme.spacing.l24 }}>
            <Button label="Estimate & log" onPress={handleSubmit} loading={loading} />
            <Button label="Retake" variant="ghost" onPress={() => setPhotoBase64(null)} />
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: theme.spacing.l24, gap: theme.spacing.m16 }}>
          <View style={{ flex: 1, borderRadius: theme.radius.lg20, overflow: 'hidden' }}>
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
          </View>
          <View style={{ paddingBottom: theme.spacing.l24 }}>
            <Button label="Capture" onPress={handleCapture} />
          </View>
        </View>
      )}
    </Screen>
  );
}
