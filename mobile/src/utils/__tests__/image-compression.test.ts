jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'file://compressed/photo.jpg', width: 1920, height: 1080 }),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('@/constants/config', () => ({
  MAX_IMAGE_DIMENSION: 1920,
  JPEG_QUALITY: 0.8,
}));

import * as ImageManipulator from 'expo-image-manipulator';
import { compressImage } from '../image-compression';

describe('compressImage', () => {
  test('chama manipulateAsync com resize para MAX_IMAGE_DIMENSION', async () => {
    await compressImage('file://local/photo.jpg');
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      'file://local/photo.jpg',
      [{ resize: { width: 1920 } }],
      { compress: 0.8, format: 'jpeg' },
    );
  });

  test('retorna o resultado de manipulateAsync', async () => {
    const result = await compressImage('file://local/photo.jpg');
    expect(result).toEqual({ uri: 'file://compressed/photo.jpg', width: 1920, height: 1080 });
  });
});
