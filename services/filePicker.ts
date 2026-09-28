import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { READABLE_DOCUMENT_TYPES } from './documentService';

export interface PickedFile {
  base64: string;
  mimeType: string;
  filename: string;
}

export type PickResult = { ok: true; file: PickedFile } | { ok: false; message: string } | null;

/** Lets the user take a photo or choose a PDF/image, and reads it for upload.
 * Returns null when the user cancels. */
export async function pickReadableFile(source: 'camera' | 'file', filename = 'document'): Promise<PickResult> {
  let uri: string;
  let mimeType: string;
  let name: string;

  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, message: 'Geef FixJeZaak toegang tot je camera in je instellingen, of kies een bestand.' };
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) return null;
    uri = result.assets[0].uri;
    mimeType = result.assets[0].mimeType ?? 'image/jpeg';
    name = `${filename}.jpg`;
  } else {
    const result = await DocumentPicker.getDocumentAsync({ type: READABLE_DOCUMENT_TYPES, copyToCacheDirectory: true });
    if (result.canceled) return null;
    uri = result.assets[0].uri;
    mimeType = result.assets[0].mimeType ?? '';
    name = result.assets[0].name;
    if (!READABLE_DOCUMENT_TYPES.includes(mimeType)) {
      return { ok: false, message: 'Dit bestandstype kunnen we niet lezen. Kies een foto (JPG of PNG) of een PDF.' };
    }
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return { ok: true, file: { base64, mimeType, filename: name } };
  } catch {
    return { ok: false, message: 'Het bestand kon niet worden geopend. Probeer het opnieuw.' };
  }
}
