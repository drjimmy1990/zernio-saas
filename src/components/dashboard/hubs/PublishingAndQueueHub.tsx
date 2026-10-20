'use client';

import React from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { ProviderPublishingWorkspace } from '../ProviderPublishingWorkspace';

interface PublishingAndQueueHubProps { workspace: unknown; policy: unknown; onRefreshWorkspace?: () => void }
export function PublishingAndQueueHub({ onRefreshWorkspace }: PublishingAndQueueHubProps) {
  const { dir } = useThemeAndLocale();
  return <ProviderPublishingWorkspace isRTL={dir === 'rtl'} onPublished={onRefreshWorkspace} />;
}
