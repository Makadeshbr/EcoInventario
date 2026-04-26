// TODO: Sem teste — scaffolding
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function CriarManejoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Criar Manejo — Asset {id}</Text>
    </View>
  );
}
