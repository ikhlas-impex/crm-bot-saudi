/**
 * Server-side helper to verify Moyasar payment transactions.
 * Uses HTTP Basic Authentication with MOYASAR_SECRET_KEY as the username.
 */

export async function verifyMoyasarPayment(paymentId, expectedAmountInSar) {
  const secretKey = process.env.MOYASAR_SECRET_KEY;

  if (!secretKey) {
    console.error('MOYASAR_SECRET_KEY is not defined in environment variables');
    return {
      verified: false,
      reason: 'Server payment configuration missing (MOYASAR_SECRET_KEY)',
    };
  }

  if (!paymentId) {
    return {
      verified: false,
      reason: 'Payment ID is missing',
    };
  }

  try {
    // Basic Auth username is secretKey, password is empty string
    const authHeader = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');

    const res = await fetch(`https://api.moyasar.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Moyasar API error (${res.status}):`, errText);
      return {
        verified: false,
        reason: `Payment lookup failed on Moyasar gateway (${res.status})`,
      };
    }

    const data = await res.json();

    // Verify status is paid
    if (data.status !== 'paid') {
      return {
        verified: false,
        reason: `Payment status is '${data.status}' (expected 'paid')`,
        payment: data,
      };
    }

    // Verify amount in Halalas (1 SAR = 100 Halalas)
    const expectedHalalas = Math.round(Number(expectedAmountInSar) * 100);
    if (data.amount < expectedHalalas) {
      return {
        verified: false,
        reason: `Paid amount (${data.amount / 100} SAR) is less than required charge (${expectedAmountInSar} SAR)`,
        payment: data,
      };
    }

    // Verify currency is SAR
    if (data.currency && data.currency.toUpperCase() !== 'SAR') {
      return {
        verified: false,
        reason: `Invalid payment currency '${data.currency}' (expected 'SAR')`,
        payment: data,
      };
    }

    return {
      verified: true,
      payment: data,
    };
  } catch (err) {
    console.error('Error verifying Moyasar payment:', err);
    return {
      verified: false,
      reason: `Internal verification error: ${err.message}`,
    };
  }
}
