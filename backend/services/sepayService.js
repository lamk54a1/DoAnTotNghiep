const crypto = require('node:crypto');

const isSepayConfigured = () => process.env.SEPAY_ENABLED === '1'
  && String(process.env.SEPAY_WEBHOOK_SECRET || '').length >= 24
  && Boolean(process.env.BANK_ID && process.env.BANK_ACCOUNT_NO && process.env.BANK_ACCOUNT_NAME);

const isSepayCheckoutEnabled = () => isSepayConfigured() && process.env.SEPAY_CHECKOUT_ENABLED === '1';

const verifySepaySignature = (headers, rawBody, secret = process.env.SEPAY_WEBHOOK_SECRET, nowSeconds = Math.floor(Date.now() / 1000)) => {
  const timestamp = String(headers['x-sepay-timestamp'] || '');
  const signature = String(headers['x-sepay-signature'] || '');
  if (!Buffer.isBuffer(rawBody) || !/^\d{10}$/.test(timestamp) || Math.abs(nowSeconds - Number(timestamp)) > 300) return false;
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature) || !secret) return false;

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(timestamp).update('.').update(rawBody).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature.toLowerCase()));
};

const normalizeTransfer = (payload) => {
  const transactionId = Number(payload?.id);
  const amount = Number(payload?.transferAmount);
  if (!Number.isSafeInteger(transactionId) || transactionId <= 0 || !Number.isSafeInteger(amount) || amount <= 0) return null;
  return {
    transactionId,
    amount,
    paymentCode: String(payload.code || '').trim().toUpperCase(),
    accountNumber: String(payload.accountNumber || '').trim(),
    transferType: String(payload.transferType || '').trim().toLowerCase(),
  };
};

module.exports = { isSepayConfigured, isSepayCheckoutEnabled, verifySepaySignature, normalizeTransfer };
