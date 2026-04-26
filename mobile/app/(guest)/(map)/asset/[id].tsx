// TODO: Sem teste — scaffolding
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function AssetPublicoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Ficha Pública do Asset — {id}</Text>
    </View>
  );
}
