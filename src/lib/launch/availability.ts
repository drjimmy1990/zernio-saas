/** Launch scope is enforced independently of plan configuration. */
export function unavailablePublicFeature(path: string[]): string | null {
  const root = path[0], child = path[1];
  if (['workflows', 'sequences', 'business-agent'].includes(root) ||
      (root === 'inbox' && child === 'automations') || (root === 'voice' && child === 'ai-agent')) return 'Automations are coming soon.';
  if (root === 'billing' || root === 'checkout' || (root === 'wallet' && child === 'topup')) return 'Payments and wallet top-ups are coming soon.';
  if (['ads', 'conversions', 'commerce', 'blogs', 'google-business', 'lead-gen', 'tracking-tags', 'rcs', 'branded-calling', 'verify'].includes(root)) return 'This feature is outside the current release.';
  if ((root === 'inbox' && ['reviews', 'mentions'].includes(child)) || (root === 'analytics' && ['best-times', 'content-decay'].includes(child))) return 'This report is not available in the current release.';
  if ((root === 'account-settings' && child === 'telegram-commands') || (root === 'accounts' && path[2] === 'telegram-commands')) return 'This channel is outside the current release.';
  return null;
}

export function unavailableServiceAction(service: string, action: string): string | null {
  if (action === 'topup_wallet') return 'Payments and wallet top-ups are coming soon.';
  if (['create_automation', 'configure_ai_voice', 'configure_voice_agent', 'onboard_whatsapp_ai_agent', 'ask_diagnostic'].includes(action)) return 'Automations are coming soon.';
  if (['ads', 'commerce_local'].includes(service)) return 'This feature is outside the current release.';
  if (['simulate_incoming_sms', 'initiate_call', 'send_sms', 'mint_webrtc_session'].includes(action)) return 'Use the verified phone services in the Phone workspace.';
  return null;
}
