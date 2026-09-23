import { Opportunity } from "@prisma/client";

interface DigestData {
  userName: string;
  opportunities: Opportunity[];
  totalMatches: number;
  preferencesUrl: string;
  appUrl: string;
}

export function generateDigestHtml(data: DigestData): string {
  const { userName, opportunities, totalMatches, preferencesUrl, appUrl } = data;

  const opportunitiesHtml = opportunities.map(opp => `
    <div style="padding: 15px; border: 1px solid #eaeaea; border-radius: 8px; margin-bottom: 15px;">
      <h3 style="margin: 0 0 5px 0; color: #1a1a1a; font-size: 18px;">${opp.title}</h3>
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">${opp.company} • ${opp.location} • ${opp.jobType}</p>
      <a href="${appUrl}/dashboard?oppId=${opp.id}" style="display: inline-block; padding: 8px 15px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; font-size: 14px; font-weight: bold;">View Details</a>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Daily Remote Job Digest</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #000; margin-bottom: 5px;">Remote Career Management System</h1>
        <p style="color: #666; font-size: 16px; margin-top: 0;">Your Daily Job Digest</p>
      </div>

      <p>Hi ${userName},</p>
      
      <p>We've found <strong>${totalMatches} new remote opportunities</strong> that match your profile today. Here are some of the top matches:</p>

      <div style="margin-top: 30px;">
        ${opportunitiesHtml}
      </div>

      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea;">
        <p style="color: #666; font-size: 14px;">
          Want to see more? <a href="${appUrl}/dashboard" style="color: #0066cc; text-decoration: none;">Go to your dashboard</a>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          You are receiving this email because you opted in to daily digests.<br>
          <a href="${preferencesUrl}" style="color: #999; text-decoration: underline;">Update your email preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;
}
