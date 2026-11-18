// Maps backend system task type constants to i18n source keys. Unknown/future
// types fall back to their raw identifier so the panel never shows blank.
export const SYSTEM_TASK_TYPE_LABEL: Record<string, string> = {
  log_cleanup: 'Log cleanup',
  channel_test: 'Batch channel test',
  channel_balance: 'Batch balance update',
  model_update: 'Batch upstream model update',
  midjourney_poll: 'Drawing task polling',
  async_task_poll: 'Async task polling',
  system_task_cleanup: 'Task history cleanup',
  sync_options: 'Settings sync',
  sync_channels: 'Channel sync',
  sync_authz: 'Permission sync',
  sync_plugins: 'Plugin sync',
  sync_oauth_providers: 'Login provider sync',
  sync_models: 'Model sync',
  sync_subscription_plans: 'Subscription plan sync',
}
