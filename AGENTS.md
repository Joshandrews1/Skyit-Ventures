# AI Coding Agent Instructions & Reference Specs

## Flutterwave v4 Integration Architecture Guidelines

To ensure secure, modern website payment integrations using Flutterwave v4, adhere strictly to the dual-layer architecture described below. Never expose secret tokens or private keys to the client/frontend.

---

### Core Integration Rules

1. **Backend Decoupling & Initiation**: The Express/Node.js server acts as the secure orchestration layer. It authenticates with Flutterwave's OIDC server, obtains a bearer token, initiates the order/payment, and returns a secure redirect URL to the client.
2. **Frontend Redirection**: The client application triggers the backend endpoint, handles visual status changes, and redirects the user to the returned payment link (never requesting payment directly with Flutterwave from the frontend).
3. **Secure Verification**: When payment is completed, the webhook or callback route on the backend retrieves and verifies the status of the order/transaction directly via the Flutterwave API before dispatching service or confirming the order.
4. **Idempotency & Unique References**: Every checkout event must generate a completely unique transaction reference (`tx_ref`).

---

### Dual-Layer Reference Implementation (Flutterwave v4)

#### 1. Backend Environment Config (`.env.example`)
```env
FLW_PROD_CLIENT_ID=
FLW_PROD_CLIENT_SECRET=
```

#### 2. Backend Integration Template (Node.js / Express with Native Fetch)
```javascript
// Helper function: Authenticates with Flutterwave v4 OIDC server to generate an access token
async function getV4AccessToken() {
  const authUrl = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';
  
  const payload = new URLSearchParams({
    'client_id': process.env.FLW_PROD_CLIENT_ID,         // Your v4 Live Client ID
    'client_secret': process.env.FLW_PROD_CLIENT_SECRET, // Your v4 Live Client Secret
    'grant_type': 'client_credentials'
  });

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to fetch v4 Token: ${errorData}`);
  }

  const data = await response.json();
  return data.access_token; // Short-lived Bearer token
}

// ENDPOINT 1: Initiate Payment & Generate v4 Order Link
app.post('/api/initialize-payment', async (req, res) => {
  try {
    const { amount, email, name, currency } = req.body;
    
    // Fetch a fresh OAuth Bearer token 
    const accessToken = await getV4AccessToken();
    
    // Generate unique reference string and idempotency key
    const uniqueRef = `TX_WEB_${Date.now()}`;

    // Flutterwave v4 Live Base URL for Orchestration
    const response = await fetch('https://f4bexperience.flutterwave.com/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Trace-Id': `trace-${uniqueRef}`, // v4 unique tracking ID
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: parseFloat(amount),
        currency: currency || 'NGN',
        reference: uniqueRef,
        redirect_url: 'http://localhost:3000/payment-callback', // Change to your live URL later
        customer: {
          email: email,
          name: name
        }
      })
    });

    const orderData = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: orderData.message || 'Initialization failed' });
    }

    // Extract the payment link provided in the v4 next_action schema
    const paymentLink = orderData.next_action?.redirect_url?.url || orderData.redirect_url;
    
    res.status(200).json({ paymentLink: paymentLink });

  } catch (error) {
    console.error('Payment Init Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ENDPOINT 2: Secure Callback Verification
app.get('/payment-callback', async (req, res) => {
  // v4 appends order status, your custom reference, and the internal order id to the query
  const { status, tx_ref, order_id } = req.query;

  // Initial string status check 
  if (status === 'completed' || status === 'successful') {
    try {
      const accessToken = await getV4AccessToken();

      // Verify the transaction strictly using the v4 retrieve order endpoint
      const verifyResponse = await fetch(`https://f4bexperience.flutterwave.com/orders/${order_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const orderVerification = await verifyResponse.json();

      // v4 statuses inside the payload return lowercase strings ('completed' or 'failed')
      if (verifyResponse.ok && orderVerification.status === 'completed') {
        // CRITICAL SECURITY: Cross-check the amount and reference with your internal system database here
        console.log(`Payment verified successfully for reference: ${tx_ref}`);
        
        // Give Value / Dispatch services
        return res.send('<h1>Payment Successful! Thank you for your purchase.</h1>');
      }

    } catch (verifyError) {
      console.error('Verification System Error:', verifyError.message);
    }
  }

  // Fallback if verification checks fail
  res.send('<h1>Payment Verification Failed or Cancelled.</h1>');
});
```

#### 3. Frontend Trigger Template (HTML/JS)
```html
<div class="checkout-card">
  <h3>Order Summary</h3>
  <p>Total: <span id="amount">15000</span> NGN</p>
  <button id="pay-button" onclick="triggerCheckout()">Pay Now</button>
</div>

<script>
async function triggerCheckout() {
  const payButton = document.getElementById("pay-button");
  payButton.innerText = "Processing...";
  payButton.disabled = true;

  try {
    // Send request to your secure backend
    const response = await fetch("/api/initialize-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 15000,
        email: "customer@example.com",
        name: "Jane Doe",
        currency: "NGN"
      })
    });

    const data = await response.json();
    
    if (data.paymentLink) {
      // Redirect customer to Flutterwave's secure hosted payment page
      window.location.href = data.paymentLink;
    } else {
      alert("Payment initialization failed.");
      payButton.disabled = false;
      payButton.innerText = "Pay Now";
    }
  } catch (err) {
    console.error(err);
    payButton.disabled = false;
  }
}
</script>
```

---

### Dev Guardrails & Constraints

* **Rule 1**: Never hardcode client secrets or `FLWSECK` strings inside client-side components.
* **Rule 2**: Always generate high-entropy unique reference strings (`tx_ref`) for transaction identification.
* **Rule 3**: In live environments, webhook endpoints are required to capture delayed or asynchronous bank transfers securely.
