import * as SecureStore from 'expo-secure-store';

const KEY = 'three-minutes.installation-id.v1';

export async function getInstallationId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY);
  if (existing) return existing;
  const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
  await SecureStore.setItemAsync(KEY, id);
  return id;
}
