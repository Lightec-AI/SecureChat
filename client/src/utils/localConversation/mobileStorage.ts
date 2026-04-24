import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const PREF_KEY = 'securechat_mobile_conv_relative_dir';
export const DEFAULT_MOBILE_RELATIVE_DIR = 'LightecSecureChat/conversations';

export async function getMobileRelativeDir(): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    return DEFAULT_MOBILE_RELATIVE_DIR;
  }
  const { value } = await Preferences.get({ key: PREF_KEY });
  return (value && value.length > 0 ? value : DEFAULT_MOBILE_RELATIVE_DIR).replace(/^\/+/, '');
}

export async function setMobileRelativeDir(path: string): Promise<void> {
  const trimmed = path.replace(/^\/+/, '').replace(/\/+$/, '');
  await Preferences.set({
    key: PREF_KEY,
    value: trimmed.length > 0 ? trimmed : DEFAULT_MOBILE_RELATIVE_DIR,
  });
}

export async function writeMobileConversationMarkdown(
  _conversationId: string,
  markdown: string,
  safeName: string,
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  const base = await getMobileRelativeDir();
  const path = `${base}/${safeName}.md`;
  await Filesystem.writeFile({
    path,
    data: markdown,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  return true;
}
