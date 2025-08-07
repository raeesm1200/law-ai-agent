# 🚀 Deployment Guide for Legal RAG Chatbot

## Free Deployment Options (Recommended: Render.com)

### Option 1: Render.com (Full-Stack) ⭐ RECOMMENDED

**Why Render.com?**
- 750 hours/month free tier (enough for always-on apps)
- Easy Python ML library support
- Automatic SSL certificates
- GitHub integration
- Environment variables support

**Deployment Steps:**

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Sign up at [render.com](https://render.com)**

3. **Create Web Service**
   - Connect your GitHub account
   - Select this repository
   - Configure:
     - **Name**: `legal-rag-chatbot`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn api_server:app --host 0.0.0.0 --port $PORT`

4. **Set Environment Variables**
   ```
   GROQ_API_KEY=your_groq_api_key_here
   QDRANT_URL=your_qdrant_cloud_url
   QDRANT_API_KEY=your_qdrant_api_key
   QDRANT_COLLECTION=law_chunks
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait 5-10 minutes for build completion
   - Your API will be available at: `https://your-app-name.onrender.com`

**Test Your Deployment:**
- Health check: `https://your-app-name.onrender.com/api/health`
- API docs: `https://your-app-name.onrender.com/docs`

---

### Option 2: Railway.app (Alternative)

**Steps:**
1. Sign up at [railway.app](https://railway.app)
2. Connect GitHub repository
3. Add environment variables
4. Deploy automatically

---

### Option 3: Frontend + Backend Split

**Frontend (Vercel/Netlify):**
- Deploy React app on Vercel or Netlify
- Update API base URL to point to backend

**Backend (Render/Railway):**
- Deploy FastAPI on Render or Railway
- Update CORS to allow frontend domain

---

## Environment Variables Needed

```env
# Required for deployment
GROQ_API_KEY=your_groq_api_key
QDRANT_URL=https://your-cluster.qdrant.tech
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=law_chunks

# Optional
PYTHON_VERSION=3.11.13
```

## Important Notes

1. **Free Tier Limitations:**
   - Render.com: 750 hours/month
   - Cold starts after 15 minutes of inactivity
   - Limited CPU/RAM (sufficient for this app)

2. **ML Libraries:**
   - PyTorch and sentence-transformers work on Render
   - First deployment takes longer (downloading models)
   - Models cached after first run

3. **Monitoring:**
   - Check logs for any startup issues
   - Monitor memory usage (upgrade if needed)

## Post-Deployment

1. **Test all endpoints:**
   ```bash
   curl https://your-app.onrender.com/api/health
   curl -X POST https://your-app.onrender.com/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "What is Italian contract law?"}'
   ```

2. **Update frontend:**
   - Change API base URL from localhost to deployed URL
   - Update CORS origins if needed

3. **Custom Domain (Optional):**
   - Add custom domain in Render dashboard
   - Update DNS settings

## Cost Optimization

- **Free tier monitoring**: Watch usage hours
- **Upgrade path**: $7/month for always-on service
- **Alternative**: Use serverless options for lower usage

## Troubleshooting

**Common Issues:**
- Build timeout: Increase build time in settings
- Memory issues: Upgrade to paid tier
- Environment variables: Double-check spelling and values
- CORS errors: Update allowed origins

**Build fails?**
- Check Python version compatibility
- Verify requirements.txt format
- Check build logs for specific errors

## Success Checklist

- [ ] Repository pushed to GitHub
- [ ] Render account created and connected
- [ ] Environment variables configured
- [ ] Service deployed successfully
- [ ] Health check endpoint responding
- [ ] Chat endpoint working
- [ ] Frontend updated with new API URL
- [ ] CORS configured for production

Your app will be live at: `https://your-app-name.onrender.com`
