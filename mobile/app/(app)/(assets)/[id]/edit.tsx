// TODO: Sem teste — scaffolding
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function EditarAssetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Editar Asset — {id}</Text>
    </View>
  );
}
