# Credit Top-Up System Setup Guide

This guide explains how to set up the credit top-up (one-time payment) system for image_tokens, video_tokens, and caption_tokens.

## Overview

The credit top-up system allows users to purchase additional tokens on top of their existing subscription. These are one-time purchases (not recurring) that immediately add credits to the user's account.

## Files Created/Modified

### New Files:

1. **`pages/buy-credits.js`** - UI page for purchasing credit packages
2. **`pages/api/buy-credits-checkout.js`** - API endpoint for creating Stripe checkout sessions
3. **`CREDIT_TOPUP_SETUP.md`** - This documentation file

### Modified Files:

1. **`pages/api/webhooks.js`** - Added handling for one-time payment webhooks
2. **`utils/useDatabase.js`** - Added `addUserTokens()` function
3. **`pages/dashboard.js`** - Added "Buy Additional Credits" button

## Setup Instructions

### 1. Create Stripe Products and Prices

You need to create products and prices in your Stripe dashboard for each credit package. Here are the recommended packages:

#### Image Token Packages:

- **Image Starter Pack**: 30 tokens - $4.99
- **Image Standard Pack**: 60 tokens - $8.99
- **Image Pro Pack**: 120 tokens - $15.99
- **Image Business Pack**: 300 tokens - $34.99

#### Video Token Packages:

- **Video Starter Pack**: 10 tokens - $4.99
- **Video Standard Pack**: 20 tokens - $8.99
- **Video Pro Pack**: 40 tokens - $15.99
- **Video Business Pack**: 100 tokens - $34.99

#### Caption Token Packages:

- **Caption Starter Pack**: 30 tokens - $4.99
- **Caption Standard Pack**: 60 tokens - $8.99
- **Caption Pro Pack**: 120 tokens - $15.99
- **Caption Business Pack**: 300 tokens - $34.99

**Steps in Stripe Dashboard:**

1. Go to Products → Add Product
2. For each package, create a product with:
   - Name: e.g., "Image Tokens - Starter Pack"
   - Price: One-time payment (not recurring)
   - Amount: Set the dollar amount
3. Copy the Price ID (starts with `price_...`)

### 2. Add Environment Variables

Add the following to your `.env.local` file:

```bash
# Image Token Credit Packages
NEXT_PUBLIC_PRICE_IMAGE_30=price_xxxxxxxxxxxxx
NEXT_PUBLIC_PRICE_IMAGE_60=price_xxxxxxxxxxxxx
NEXT_PUBLIC_PRICE_IMAGE_120=price_xxxxxxxxxxxxx
NEXT_PUBLIC_PRICE_IMAGE_300=price_xxxxxxxxxxxxx

# Video Token Credit Packages
NEXT_PUBLIC_PRICE_VIDEO_10=price_xxxxxxxxxxxxx
NEXT_PUBLIC_PRICE_VIDEO_20=price_xxxxxxxxxxxxx
NEXT_PUBLIC_PRICE_VIDEO_40=price_xxxxxxxxxxxxx
NEXT_PUBLIC_PRICE_VIDEO_100=price_xxxxxxxxxxxxx

# Caption Token Credit Packages
NEXT_PUBLIC_PRICE_CAPTION_30=price_xxxxxxxxxxxxx
NEXT_PUBLIC_PRICE_CAPTION_60=price_xxxxxxxxxxxxx
NEXT_PUBLIC_PRICE_CAPTION_120=price_xxxxxxxxxxxxx
NEXT_PUBLIC_PRICE_CAPTION_300=price_xxxxxxxxxxxxx
```

Replace `price_xxxxxxxxxxxxx` with your actual Stripe Price IDs.

### 3. Verify Webhook Configuration

Make sure your Stripe webhook is configured to listen for these events:

- `checkout.session.completed` (already configured for subscriptions)

The webhook will automatically handle both subscription and one-time payment modes.

**Important:** The webhook handler now checks for `mode === 'payment'` to differentiate between subscription renewals and credit purchases.

### 4. Test the Implementation

#### Local Testing:

1. Start your development server: `npm run dev`
2. Navigate to `/dashboard`
3. Click "💳 Buy Additional Credits"
4. Select a token type (Image, Video, or Caption)
5. Choose a package and click "Purchase"
6. Complete the Stripe checkout (use test card: `4242 4242 4242 4242`)
7. Verify the webhook is called and tokens are added

#### Testing Checklist:

- [ ] Credit purchase page loads correctly
- [ ] Current token balances are displayed
- [ ] All three token types can be selected
- [ ] Stripe checkout session is created successfully
- [ ] After successful payment, tokens are added to account
- [ ] Token balance updates are visible on dashboard
- [ ] Webhook logs show successful credit addition

### 5. Production Deployment

Before deploying to production:

1. **Update environment variables** in your hosting platform (Vercel, etc.)
2. **Test webhook endpoint** with Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks
   stripe trigger checkout.session.completed
   ```
3. **Configure production webhook** in Stripe Dashboard:
   - Go to Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks`
   - Select events: `checkout.session.completed`
   - Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## How It Works

### Purchase Flow:

1. User clicks "Buy Additional Credits" on dashboard
2. User selects token type and package
3. System creates Stripe checkout session with metadata:
   - `token_type`: 'image_tokens', 'video_tokens', or 'caption_tokens'
   - `token_amount`: Number of tokens to add
   - `supabaseUUID`: User ID
4. User completes payment on Stripe checkout page
5. Stripe sends `checkout.session.completed` webhook
6. Webhook handler detects `mode === 'payment'`
7. System extracts metadata and calls `addUserTokens()`
8. Tokens are added to user's account
9. User is redirected back with success message

### Key Features:

- ✅ One-time payments (not recurring)
- ✅ Credits add on top of subscription tokens
- ✅ Credits never expire
- ✅ Works alongside existing subscription system
- ✅ Separate packages for each token type
- ✅ Secure payment processing via Stripe
- ✅ Automatic token addition via webhook

## Customization

### Changing Package Prices/Amounts:

Edit `pages/buy-credits.js` and update the `CREDIT_PACKAGES` object:

```javascript
const CREDIT_PACKAGES = {
  image_tokens: [
    {
      name: 'Custom Pack',
      amount: 50,
      price: 9.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_IMAGE_50
    }
    // ... more packages
  ]
};
```

### Adding New Token Types:

1. Add new token column to `customers` table in Supabase
2. Update `validTokenTypes` array in:
   - `pages/api/buy-credits-checkout.js`
   - `utils/useDatabase.js` (`addUserTokens` function)
3. Add new tab and packages in `pages/buy-credits.js`
4. Create corresponding Stripe products/prices

### Styling:

The buy-credits page uses Tailwind CSS classes matching your dashboard theme. Customize colors and styling in `pages/buy-credits.js`.

## Troubleshooting

### Tokens Not Being Added:

1. Check webhook logs in Stripe Dashboard
2. Verify webhook endpoint is receiving events
3. Check server logs for errors in `addUserTokens` function
4. Ensure metadata is being passed correctly in checkout session

### Checkout Session Not Creating:

1. Verify Price IDs in `.env.local`
2. Check that prices are active in Stripe
3. Ensure customer record exists in database
4. Check API endpoint logs for errors

### Webhook Signature Verification Failed:

1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Ensure webhook endpoint is publicly accessible
3. Check that raw body is being passed to webhook handler

## Support

For issues or questions:

1. Check server logs for detailed error messages
2. Review Stripe Dashboard for payment status
3. Verify database records in Supabase

## Notes

- Credits purchased are **permanent** and do not reset monthly
- Credits are added **on top of** subscription allocations
- The system handles both subscription and credit purchase webhooks
- All transactions are logged for debugging purposes
