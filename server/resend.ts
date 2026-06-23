import { Resend } from 'resend';

let connectionSettings: any;

export function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY?.trim() ?? "";
  return key.startsWith("re_") && key.length > 20;
}

/** Store email OTP is off unless explicitly enabled (safe default for VPS deploy). */
export function isStore2FAEnabled(): boolean {
  return process.env.STORE_REQUIRE_2FA === "true" && isResendConfigured();
}

async function getCredentials() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) {
    return {
      apiKey,
      fromEmail: process.env.RESEND_FROM_EMAIL || "JewelPOS <noreply@resend.dev>",
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error(
      'RESEND_API_KEY is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL to .env on the server.',
    );
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken,
      },
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

export async function sendVerificationEmail(toEmail: string, code: string) {
  const { client, fromEmail } = await getUncachableResendClient();

  const result = await client.emails.send({
    from: fromEmail || 'JewelPOS <noreply@resend.dev>',
    to: toEmail,
    subject: 'JewelPOS - Your Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #d97706; font-size: 24px; margin: 0;">JewelPOS</h1>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Secure Login Verification</p>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">Your verification code is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #d97706; padding: 16px; background: white; border-radius: 8px; border: 2px dashed #d97706;">
            ${code}
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">This code expires in 10 minutes.</p>
        </div>
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 24px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(result.error.message || "Resend rejected the email");
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type StoreWelcomeEmailParams = {
  to: string;
  ownerName: string;
  businessName: string;
  username: string;
  password: string;
  loginUrl: string;
};

/** Sends store login username and temporary password after signup payment. */
export async function sendStoreWelcomeEmail(params: StoreWelcomeEmailParams): Promise<void> {
  if (!isResendConfigured()) {
    throw new Error(
      "RESEND_API_KEY is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL to .env on the server.",
    );
  }

  const { client, fromEmail } = await getUncachableResendClient();
  const owner = escapeHtml(params.ownerName);
  const business = escapeHtml(params.businessName);
  const username = escapeHtml(params.username);
  const password = escapeHtml(params.password);
  const loginUrl = escapeHtml(params.loginUrl);

  const result = await client.emails.send({
    from: fromEmail || "IQ-POS <noreply@resend.dev>",
    to: params.to,
    subject: "IQ-POS — Your store login details | بيانات دخول متجرك",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #d97706; font-size: 22px; margin: 0;">IQ-POS</h1>
          <p style="color: #6b7280; font-size: 13px; margin: 8px 0 0;">Welcome / مرحباً</p>
        </div>

        <p style="font-size: 15px; line-height: 1.6;">Hi ${owner},</p>
        <p style="font-size: 15px; line-height: 1.6;">
          Your store <strong>${business}</strong> is ready and your subscription is active.
        </p>
        <p style="font-size: 15px; line-height: 1.6; direction: rtl; text-align: right;">
          مرحباً ${owner}، تم إنشاء متجر <strong>${business}</strong> وتفعيل اشتراكك.
        </p>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 12px; font-size: 13px; font-weight: bold; color: #374151; text-transform: uppercase; letter-spacing: 0.04em;">
            Login details / بيانات الدخول
          </p>
          <p style="margin: 0 0 10px; font-size: 14px;">
            <strong>Login URL:</strong><br />
            <a href="${loginUrl}" style="color: #d97706; word-break: break-all;">${loginUrl}</a>
          </p>
          <p style="margin: 0 0 10px; font-size: 14px;">
            <strong>Username / اسم المستخدم:</strong><br />
            <span style="font-family: Consolas, monospace; font-size: 16px; font-weight: bold;">${username}</span>
          </p>
          <p style="margin: 0; font-size: 14px;">
            <strong>Password / كلمة المرور:</strong><br />
            <span style="font-family: Consolas, monospace; font-size: 16px; font-weight: bold;">${password}</span>
          </p>
        </div>

        <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
          Please change your password after your first login.<br />
          <span style="direction: rtl; display: inline-block;">يُرجى تغيير كلمة المرور بعد أول تسجيل دخول.</span>
        </p>

        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 28px;">
          If you did not sign up for IQ-POS, please ignore this email.
        </p>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(result.error.message || "Resend rejected the welcome email");
  }
}
