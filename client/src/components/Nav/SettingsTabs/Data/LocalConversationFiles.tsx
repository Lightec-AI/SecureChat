import React, { useCallback, useEffect, useState } from 'react';
import { Button, Label, Switch, useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { detectLocalConversationPlatform } from '~/utils/localConversation/persistConversation';
import {
  DEFAULT_MOBILE_RELATIVE_DIR,
  getMobileRelativeDir,
  setMobileRelativeDir,
} from '~/utils/localConversation/mobileStorage';
import {
  clearWebSyncFolder,
  getWebLocalEncryptPreference,
  hasWebSyncFolder,
  pickWebSyncFolder,
  setWebLocalEncryptPreference,
  supportsWebDirectoryPicker,
} from '~/utils/localConversation/webStorage';

export default function LocalConversationFiles() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [platform] = useState(() => detectLocalConversationPlatform());
  const [desktopRoot, setDesktopRoot] = useState<string | null>(null);
  const [mobilePath, setMobilePath] = useState(DEFAULT_MOBILE_RELATIVE_DIR);
  const [webEncrypt, setWebEncrypt] = useState(getWebLocalEncryptPreference);
  const [fsaLinked, setFsaLinked] = useState(false);

  const refreshDesktop = useCallback(async () => {
    const api = window.secureChatDesktop?.workspace;
    if (!api) {
      return;
    }
    setDesktopRoot(await api.get());
  }, []);

  const refreshWebFsa = useCallback(async () => {
    setFsaLinked(await hasWebSyncFolder());
  }, []);

  useEffect(() => {
    if (platform === 'desktop') {
      void refreshDesktop();
    }
    if (platform === 'mobile') {
      void getMobileRelativeDir().then(setMobilePath);
    }
    if (platform === 'web') {
      void refreshWebFsa();
    }
  }, [platform, refreshDesktop, refreshWebFsa]);

  const onDesktopChoose = async () => {
    const api = window.secureChatDesktop?.workspace;
    if (!api) {
      return;
    }
    const chosen = await api.choose();
    setDesktopRoot(chosen);
    showToast({
      message: chosen
        ? localize('com_local_conv_desktop_folder_set')
        : localize('com_local_conv_desktop_folder_cleared'),
      status: chosen ? 'success' : 'info',
    });
  };

  const onWebPickFolder = async () => {
    try {
      const ok = await pickWebSyncFolder();
      await refreshWebFsa();
      showToast({
        message: ok
          ? localize('com_local_conv_web_folder_linked')
          : localize('com_local_conv_web_folder_unsupported'),
        status: ok ? 'success' : 'warning',
      });
    } catch {
      showToast({ message: localize('com_local_conv_web_folder_error'), status: 'error' });
    }
  };

  const onWebClearFolder = async () => {
    await clearWebSyncFolder();
    await refreshWebFsa();
    showToast({ message: localize('com_local_conv_web_folder_cleared'), status: 'info' });
  };

  const onMobileSavePath = async () => {
    await setMobileRelativeDir(mobilePath);
    showToast({ message: localize('com_local_conv_mobile_path_saved'), status: 'success' });
  };

  return (
    <div className="flex flex-col gap-3 border-b border-border-medium pb-4">
      <div className="text-sm font-medium text-text-primary">
        {localize('com_local_conv_heading')}
      </div>
      <p className="text-xs text-text-secondary">{localize('com_local_conv_intro')}</p>

      {platform === 'desktop' && (
        <div className="flex flex-col gap-2">
          <Label className="text-text-secondary">{localize('com_local_conv_desktop_label')}</Label>
          <code className="break-all rounded-md bg-surface-secondary px-2 py-1 text-xs">
            {desktopRoot
              ? `${desktopRoot}/conversations/<conversationId>.md`
              : localize('com_local_conv_desktop_none')}
          </code>
          <p className="text-xs text-text-secondary">
            {localize('com_local_conv_desktop_sync_hint')}
          </p>
          <Button type="button" variant="submit" onClick={onDesktopChoose}>
            {localize('com_local_conv_desktop_choose')}
          </Button>
        </div>
      )}

      {platform === 'web' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-secondary">{localize('com_local_conv_web_opfs')}</p>
          {supportsWebDirectoryPicker() && (
            <div className="flex flex-col gap-2">
              <Label className="text-text-secondary">
                {localize('com_local_conv_web_sync_folder')}
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="submit" onClick={() => void onWebPickFolder()}>
                  {localize('com_local_conv_web_pick_folder')}
                </Button>
                {fsaLinked && (
                  <Button type="button" variant="outline" onClick={() => void onWebClearFolder()}>
                    {localize('com_local_conv_web_clear_folder')}
                  </Button>
                )}
              </div>
              <p className="text-xs text-text-secondary">
                {fsaLinked
                  ? localize('com_local_conv_web_linked_hint')
                  : localize('com_local_conv_web_opfs_hint')}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="local-conv-encrypt" className="text-text-secondary">
              {localize('com_local_conv_web_encrypt')}
            </Label>
            <Switch
              id="local-conv-encrypt"
              aria-labelledby="local-conv-encrypt"
              checked={webEncrypt}
              onCheckedChange={(v) => {
                setWebEncrypt(Boolean(v));
                setWebLocalEncryptPreference(Boolean(v));
              }}
            />
          </div>
          <p className="text-xs text-text-secondary">
            {localize('com_local_conv_web_encrypt_note')}
          </p>
        </div>
      )}

      {platform === 'mobile' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="mobile-conv-path" className="text-text-secondary">
            {localize('com_local_conv_mobile_path_label')}
          </Label>
          <input
            id="mobile-conv-path"
            className="border-token-border-medium rounded-md border bg-surface-primary px-2 py-1.5 text-sm"
            value={mobilePath}
            onChange={(e) => setMobilePath(e.target.value)}
          />
          <p className="text-xs text-text-secondary">
            {localize('com_local_conv_mobile_path_hint')}
          </p>
          <Button type="button" variant="submit" onClick={() => void onMobileSavePath()}>
            {localize('com_local_conv_mobile_save')}
          </Button>
        </div>
      )}
    </div>
  );
}
