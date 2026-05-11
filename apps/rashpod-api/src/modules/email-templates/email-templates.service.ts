import { Injectable } from "@nestjs/common";

interface BrandConfig {
  storeName: string;
  storefrontUrl: string;
  dashboardUrl: string;
  supportEmail: string;
  logoUrl?: string | null;
  primaryColor: string;
  peachColor: string;
}

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailTemplatesService {
  brand(): BrandConfig {
    return {
      storeName: process.env.STORE_NAME || "RashPOD",
      storefrontUrl: process.env.WEB_URL || process.env.NEXT_PUBLIC_WEB_URL || "https://rashpod.uz",
      dashboardUrl: process.env.DASHBOARD_URL || process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://office.rashpod.uz",
      supportEmail: process.env.SUPPORT_EMAIL || "support@rashpod.uz",
      logoUrl: process.env.BRAND_LOGO_URL || null,
      primaryColor: process.env.BRAND_PRIMARY_COLOR || "#788AE0",
      peachColor: process.env.BRAND_PEACH_COLOR || "#F39E7C",
    };
  }

  /** Wraps content in the branded shell. Email-safe inline CSS, table-based layout. */
  private layout(content: string, preheader = ""): string {
    const b = this.brand();
    const logo = b.logoUrl
      ? `<img src="${b.logoUrl}" alt="${escapeHtml(b.storeName)}" height="36" style="display:block;height:36px;max-height:36px;border:0;outline:none;text-decoration:none;" />`
      : `<span style="font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:700;color:${b.primaryColor};letter-spacing:-0.3px;">${escapeHtml(b.storeName)}</span>`;

    return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(b.storeName)}</title>
<!--[if mso]><style type="text/css">body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F0F2FA;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;color:#1A1D2E;-webkit-font-smoothing:antialiased;">
<div style="display:none;font-size:1px;color:#F0F2FA;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F0F2FA;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
        <tr>
          <td align="left" style="padding:0 0 24px 0;">${logo}</td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:20px;box-shadow:0 8px 24px rgba(120,138,224,0.08);overflow:hidden;">
            <div style="height:6px;background:linear-gradient(90deg,${b.primaryColor},${b.peachColor});"></div>
            <div style="padding:36px 40px 28px 40px;">
              ${content}
            </div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 24px 8px 24px;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.6;color:#6B7280;">
            You received this email because you have an account at <a href="${b.storefrontUrl}" style="color:${b.primaryColor};text-decoration:none;">${escapeHtml(stripScheme(b.storefrontUrl))}</a>.<br/>
            Questions? Reach us at <a href="mailto:${b.supportEmail}" style="color:${b.primaryColor};text-decoration:none;">${escapeHtml(b.supportEmail)}</a>.
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:4px 24px 16px 24px;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-size:11px;color:#9CA3AF;">
            © ${new Date().getFullYear()} ${escapeHtml(b.storeName)}. Tashkent, Uzbekistan.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
  }

  private button(href: string, label: string, color = this.brand().primaryColor): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr><td style="border-radius:999px;background:${color};">
    <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
  }

  private h1(text: string): string {
    return `<h1 style="margin:0 0 12px 0;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-size:26px;line-height:1.25;font-weight:700;color:#1A1D2E;letter-spacing:-0.3px;">${escapeHtml(text)}</h1>`;
  }

  private p(html: string): string {
    return `<p style="margin:0 0 14px 0;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;">${html}</p>`;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Templates
  // ──────────────────────────────────────────────────────────────────────

  welcomeDesigner(params: { name: string }): RenderedEmail {
    const b = this.brand();
    const safeName = escapeHtml(firstName(params.name));
    const steps = [
      { n: "1", title: "Complete your designer profile", desc: "Add your bio, links, and payout details so customers can find you and we can pay royalties." },
      { n: "2", title: "Upload your first design", desc: "Submit a print-ready file. Our moderators review within 24 hours." },
      { n: "3", title: "Generate mockups", desc: "Use the mockup studio to preview your work on t-shirts, hoodies, mugs and more." },
      { n: "4", title: "Publish and earn", desc: "Once approved, your design goes live on the storefront. You earn royalties on every sale." },
    ];
    const stepsHtml = steps
      .map(
        (s) => `<tr>
  <td valign="top" width="44" style="padding:0 0 18px 0;">
    <div style="width:36px;height:36px;border-radius:50%;background:${b.peachColor};color:#ffffff;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:14px;text-align:center;line-height:36px;">${s.n}</div>
  </td>
  <td valign="top" style="padding:0 0 18px 0;">
    <div style="font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;color:#1A1D2E;margin-bottom:4px;">${escapeHtml(s.title)}</div>
    <div style="font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.6;color:#6B7280;">${escapeHtml(s.desc)}</div>
  </td>
</tr>`,
      )
      .join("");

    const content = `
${this.h1(`Welcome to ${b.storeName}, ${safeName} 👋`)}
${this.p(`We're excited to have you on board. ${b.storeName} is a print-on-demand platform built for Uzbek creators — upload designs, set commercial rights, and earn royalties on every sale.`)}
${this.p(`Here's how to get started:`)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 4px 0;">${stepsHtml}</table>
${this.button(`${b.dashboardUrl}/dashboard/designer`, "Open your designer dashboard")}
${this.p(`<strong>Need help?</strong> Reply to this email or write to <a href="mailto:${b.supportEmail}" style="color:${b.primaryColor};">${escapeHtml(b.supportEmail)}</a>. We answer fast.`)}
${this.p(`Happy designing,<br/>The ${b.storeName} team`)}
`;
    return {
      subject: `Welcome to ${b.storeName}, ${firstName(params.name)} 🎉`,
      html: this.layout(content, `Your designer account is ready. Here's how to upload your first design and start earning royalties.`),
      text: `Welcome to ${b.storeName}, ${params.name}!\n\nWe're excited to have you on board. Here's how to get started:\n\n1. Complete your designer profile\n2. Upload your first design\n3. Generate mockups\n4. Publish and earn royalties\n\nOpen your dashboard: ${b.dashboardUrl}/dashboard/designer\n\nNeed help? Email ${b.supportEmail}\n\n— The ${b.storeName} team`,
    };
  }

  welcomeCustomer(params: { name: string }): RenderedEmail {
    const b = this.brand();
    const safeName = escapeHtml(firstName(params.name));
    const content = `
${this.h1(`Welcome to ${b.storeName}, ${safeName}!`)}
${this.p(`Thanks for creating an account. You can now shop one-of-a-kind designs by Uzbek creators — printed on demand, shipped fast.`)}
${this.button(`${b.storefrontUrl}/shop`, "Start shopping")}
${this.p(`<strong>What's next?</strong>`)}
<ul style="margin:0 0 14px 18px;padding:0;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.7;color:#374151;">
  <li>Browse the <a href="${b.storefrontUrl}/shop" style="color:${b.primaryColor};">shop</a> or follow your favourite <a href="${b.storefrontUrl}/designers" style="color:${b.primaryColor};">designers</a>.</li>
  <li>Save items to your favourites for later.</li>
  <li>Track your orders from your <a href="${b.storefrontUrl}/account" style="color:${b.primaryColor};">account page</a>.</li>
</ul>
${this.p(`If you ever need a hand, write to <a href="mailto:${b.supportEmail}" style="color:${b.primaryColor};">${escapeHtml(b.supportEmail)}</a>.`)}
${this.p(`See you on the shop,<br/>The ${b.storeName} team`)}
`;
    return {
      subject: `Welcome to ${b.storeName} 🎁`,
      html: this.layout(content, `Your account is ready. Discover designs by Uzbek creators, printed on demand.`),
      text: `Welcome to ${b.storeName}, ${params.name}!\n\nThanks for creating an account. Start shopping: ${b.storefrontUrl}/shop\n\nNeed help? ${b.supportEmail}\n\n— The ${b.storeName} team`,
    };
  }

  emailOtp(params: { name: string; code: string; ttlMinutes: number; purpose?: "signup" | "signin" | "verify" }): RenderedEmail {
    const b = this.brand();
    const safeName = escapeHtml(firstName(params.name || ""));
    const purposeLabel =
      params.purpose === "signin" ? "sign in" : params.purpose === "signup" ? "complete sign-up" : "verify your email";

    const codeBoxes = params.code
      .split("")
      .map(
        (d) =>
          `<td style="padding:0 4px;"><div style="width:48px;height:60px;border-radius:12px;background:#F0F2FA;border:1px solid #E8EAFB;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;font-size:28px;font-weight:700;color:${b.primaryColor};text-align:center;line-height:60px;letter-spacing:1px;">${escapeHtml(d)}</div></td>`,
      )
      .join("");

    const content = `
${this.h1(`Your verification code`)}
${this.p(`${safeName ? `Hi ${safeName}, ` : ""}use the code below to ${purposeLabel}. It expires in <strong>${params.ttlMinutes} minutes</strong>.`)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px auto 22px auto;"><tr>${codeBoxes}</tr></table>
${this.p(`Or copy this code: <strong style="font-family:Menlo,Consolas,monospace;font-size:18px;letter-spacing:2px;color:${b.primaryColor};">${escapeHtml(params.code)}</strong>`)}
${this.p(`If you didn't request this, you can safely ignore this email — no changes will be made to your account.`)}
${this.p(`— The ${b.storeName} team`)}
`;
    return {
      subject: `${params.code} is your ${b.storeName} verification code`,
      html: this.layout(content, `Your one-time verification code is ${params.code}. Expires in ${params.ttlMinutes} minutes.`),
      text: `Your ${b.storeName} verification code is: ${params.code}\n\nIt expires in ${params.ttlMinutes} minutes. If you didn't request this, you can ignore this email.\n\n— The ${b.storeName} team`,
    };
  }

  emailVerification(params: { name: string; link: string }): RenderedEmail {
    const b = this.brand();
    const safeName = escapeHtml(firstName(params.name || ""));
    const content = `
${this.h1(`Verify your email`)}
${this.p(`${safeName ? `Hi ${safeName}, ` : ""}please confirm your email address to activate your ${b.storeName} account.`)}
${this.button(params.link, "Verify my email")}
${this.p(`Or paste this link into your browser:<br/><a href="${params.link}" style="color:${b.primaryColor};word-break:break-all;">${escapeHtml(params.link)}</a>`)}
${this.p(`This link is valid for 24 hours. If you didn't create a ${b.storeName} account, you can ignore this email.`)}
`;
    return {
      subject: `Verify your ${b.storeName} email`,
      html: this.layout(content, `Confirm your email address to finish setting up your account.`),
      text: `Confirm your email by visiting: ${params.link}\n\nValid for 24 hours.`,
    };
  }

  passwordReset(params: { name: string; link: string }): RenderedEmail {
    const b = this.brand();
    const safeName = escapeHtml(firstName(params.name || ""));
    const content = `
${this.h1(`Reset your password`)}
${this.p(`${safeName ? `Hi ${safeName}, ` : ""}we received a request to reset your ${b.storeName} password. Click below to choose a new one.`)}
${this.button(params.link, "Reset password", b.peachColor)}
${this.p(`Or paste this link into your browser:<br/><a href="${params.link}" style="color:${b.primaryColor};word-break:break-all;">${escapeHtml(params.link)}</a>`)}
${this.p(`This link expires in 30 minutes. If you didn't request a password reset, you can safely ignore this email.`)}
`;
    return {
      subject: `Reset your ${b.storeName} password`,
      html: this.layout(content, `Use this link to choose a new password. Valid for 30 minutes.`),
      text: `Reset your password: ${params.link}\n\nValid for 30 minutes. Ignore if you didn't request it.`,
    };
  }
}

function escapeHtml(input: string): string {
  return String(input).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
