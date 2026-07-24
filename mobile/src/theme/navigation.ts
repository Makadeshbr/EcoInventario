import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { motion } from './tokens';

/**
 * Opções padrão dos Stacks do app. Centralizado para que a transição entre
 * telas seja a mesma em toda a navegação — antes cada layout repetia só
 * `headerShown: false` e as telas trocavam sem animação nenhuma.
 *
 * `slide_from_right` dá a noção de profundidade (avança/volta na hierarquia) e
 * é o gesto nativo que o usuário de Android/iOS já espera.
 */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  animationDuration: motion.duration.base,
  gestureEnabled: true,
};

/**
 * Para fluxos que substituem o contexto inteiro (welcome → login → app), em vez
 * de empilhar detalhe. O fade evita a sensação de "voltar" numa troca de raiz.
 */
export const rootStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'fade',
  animationDuration: motion.duration.slow,
};
