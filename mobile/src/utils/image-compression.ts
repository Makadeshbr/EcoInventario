import * as ImageManipulator from 'expo-image-manipulator';
import { MAX_IMAGE_DIMENSION, JPEG_QUALITY } from '@/constants/config';

export async function compressImage(uri: string) {
  return ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
}
