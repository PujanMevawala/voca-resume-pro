# Google Cloud Text-to-Speech Setup Guide

## Overview
Your VocaResume application now uses **Google Cloud TTS** with automatic fallback to browser TTS.

### Benefits:
- ✅ **FREE**: 4 million characters/month (≈800 full resume analyses)
- ✅ **High Quality**: Neural2 voices sound natural
- ✅ **Reliable**: Automatic fallback to browser TTS if quota exceeded
- ✅ **No Breaking**: Works without configuration (uses browser TTS)

---

## Setup Steps (Optional - For Better Quality)

### 1. Create Google Cloud Account
1. Go to https://console.cloud.google.com/
2. Sign up (Free tier includes $300 credit + perpetual free tier)
3. Create a new project or select existing one

### 2. Enable Text-to-Speech API
1. Go to **APIs & Services** > **Library**
2. Search for "Cloud Text-to-Speech API"
3. Click **Enable**

### 3. Create Service Account Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in details:
   - Name: `vocaresume-tts`
   - Role: `Cloud Text-to-Speech User`
4. Click **Done**
5. Click on the created service account
6. Go to **Keys** tab > **Add Key** > **Create new key**
7. Choose **JSON** format
8. Download the JSON file

### 4. Configure Your Application

#### Option A: Using JSON Key File (Recommended for Development)
```bash
# Move downloaded JSON to your project
mv ~/Downloads/your-project-key.json /path/to/vocaresume/google-cloud-key.json

# Add to backend/.env
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/google-cloud-key.json
```

#### Option B: Using Project ID (Recommended for Production)
```bash
# Add to backend/.env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```
Then set up application default credentials:
```bash
gcloud auth application-default login
```

### 5. Install Package
```bash
cd backend
npm install @google-cloud/text-to-speech
```

### 6. Restart Backend
```bash
npm start
```

---

## Testing

### Check TTS Provider
The backend will log which TTS provider is being used:
```
INFO: Google Cloud TTS initialized successfully
```

Or check response headers:
```bash
curl -X POST http://localhost:3000/api/audio/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}' \
  -I | grep "X-TTS-Provider"
```

Expected headers:
- `X-TTS-Provider: google-cloud` - Using Google Cloud TTS ✅
- `X-TTS-Provider: openai` - Using OpenAI TTS
- No header - Using browser fallback

---

## Fallback Behavior

The system tries providers in this order:

1. **Google Cloud TTS** (if configured)
   - 4M chars/month free
   - High-quality Neural2 voices

2. **OpenAI TTS** (if `OPENAI_API_KEY` set)
   - Backup option
   - Costs $0.015 per 1K chars

3. **Browser Web Speech API** (always available)
   - Free, no limits
   - Quality varies by browser
   - No server required

---

## Monitoring Usage

### Check Google Cloud Usage
1. Go to https://console.cloud.google.com/
2. Navigate to **Cloud Text-to-Speech** > **Quotas**
3. View usage: Character count per month

### Free Tier Limits
- **Standard voices**: 4M chars/month free
- **WaveNet/Neural2 voices**: 1M chars/month free (we use Neural2)

Average resume analysis script: ~500 characters
- **Free quota**: ~2,000 analyses/month (Neural2)
- **Beyond quota**: Falls back to browser TTS automatically

---

## Troubleshooting

### Issue: "Google Cloud TTS not configured"
**Solution**: This is normal! Browser TTS will work. To use Google Cloud:
1. Follow setup steps above
2. Ensure `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CLOUD_PROJECT_ID` is set
3. Restart backend

### Issue: "Permission denied" error
**Solution**: 
```bash
# Ensure service account has correct role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:vocaresume-tts@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudtexttospeech.user"
```

### Issue: Quota exceeded
**Solution**: Application automatically falls back to browser TTS. No action needed!

### Issue: Audio not playing
**Solution**: 
1. Check browser console for errors
2. Verify `X-TTS-Provider` header
3. Test with: `curl http://localhost:3000/api/audio/tts -d '{"text":"test"}' --output test.mp3`

---

## Security Best Practices

### ⚠️ Never Commit Credentials
```bash
# Already in .gitignore:
*.json
.env
.env.local
google-cloud-key.json
```

### Production Deployment
For production (Heroku, AWS, Azure, etc.):
1. Use environment variables, not JSON files
2. Set `GOOGLE_CLOUD_PROJECT_ID` in platform config
3. Use platform's secret management:
   - **Heroku**: Config Vars
   - **AWS**: Systems Manager Parameter Store
   - **Azure**: Key Vault
   - **Google Cloud Run**: Already has credentials!

---

## Cost Estimation

### Free Tier (More than enough for most users)
- Neural2 voices: 1M chars/month free
- Average analysis: 500 chars
- **= 2,000 analyses/month FREE**

### Beyond Free Tier
- $16.00 per 1M characters (Neural2)
- $0.000016 per character
- Average analysis: $0.008 (less than 1¢)

**Most users will never exceed free tier!**

---

## Alternative: Keep Browser TTS

If you prefer to keep using browser TTS (no setup required):
- Already working ✅
- Completely free ✅
- No API keys needed ✅
- Quality varies by browser/OS

Just don't configure Google Cloud - the application works perfectly as-is!
