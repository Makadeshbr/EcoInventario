import 'react-native-get-random-values'; // deve ser importado antes de uuid
import { v4 as uuidv4 } from 'uuid';

export const generateUUID = (): string => uuidv4();
