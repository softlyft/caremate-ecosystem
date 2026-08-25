/**
 * @deprecated Import from `./mailer.ts` instead.
 * Kept so existing Edge Functions keep working during the email-provider switch.
 */
export {
  DEFAULT_EMAIL_FROM as DEFAULT_SES_FROM_EMAIL,
  DEFAULT_EMAIL_FROM_NAME as DEFAULT_SES_FROM_NAME,
  isEmailConfigured as isSesConfigured,
  sendEmail as sendViaSes,
  type EmailSendInput as SesSendInput,
  type EmailSendResult as SesSendResult,
} from './mailer.ts';
