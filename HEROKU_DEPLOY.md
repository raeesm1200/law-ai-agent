# Law Agent AI - Deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/raeesm1200/law-ai-agent)

## Quick Deploy Instructions:
1. Click the "Deploy to Heroku" button above
2. Fill in the required environment variables:
   - `GROQ_API_KEY`: Your Groq API key
   - `QDRANT_URL`: Your Qdrant database URL
   - `QDRANT_API_KEY`: Your Qdrant API key
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret
   - `STRIPE_MONTHLY_PRICE_ID`: Your monthly price ID
   - `STRIPE_YEARLY_PRICE_ID`: Your yearly price ID
   - `FRONTEND_URL`: Your frontend URL
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
3. Click "Deploy app"
4. Wait for the build to complete
5. Your app will be ready!

The PostgreSQL database will be automatically provisioned and configured.
