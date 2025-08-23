// Use direct Paystack initialization instead of the paystack-api package
const paystackClient = {
  initializeTransaction: async (params: {
    amount: number;
    email: string;
    currency: string;
    reference: string;
    metadata?: any;
  }) => {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`Paystack error: ${response.statusText}`);
    }

    return response.json();
  }
};

export default paystackClient;