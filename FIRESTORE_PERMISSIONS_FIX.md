# Fix Firestore Permission Denied Error

## Problem
You're getting `PERMISSION_DENIED: Missing or insufficient permissions` when trying to save to Firestore using the Admin SDK.

## Root Cause
The service account in `GOOGLE_SERVICE_ACCOUNT_JSON` doesn't have IAM permissions to access Firestore in your Firebase project.

## Solution: Grant IAM Permissions to Service Account

### Step 1: Find Your Service Account Email

1. Check your `.env.local` file for `GOOGLE_SERVICE_ACCOUNT_JSON`
2. Parse the JSON and find the `client_email` field
3. Or check the console logs - it should show the service account email

### Step 2: Grant Permissions in Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your Firebase project: `tattoosuev2` (or your project ID)

2. **Navigate to IAM & Admin**
   - Click on "IAM & Admin" → "IAM" in the left sidebar

3. **Add Service Account**
   - Click "Grant Access" or "Add"
   - In "New principals", paste your service account email (from Step 1)
   - In "Select a role", search for and select one of these:
     - **`Cloud Datastore User`** (recommended - gives Firestore read/write access)
     - **`Firebase Admin SDK Administrator Service Agent`** (full Firebase Admin access)
     - **`Cloud Datastore Owner`** (if you need full control)
   - Click "Save"

### Step 3: Verify

1. Wait 1-2 minutes for permissions to propagate
2. Try running the estimation again
3. Check your Firestore database - data should appear

## Alternative: Use Service Account from Firebase Project

If your service account is from a different project:

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `tattoosuev2`

2. **Go to Project Settings**
   - Click the gear icon → "Project settings"
   - Go to "Service accounts" tab

3. **Generate New Service Account Key**
   - Click "Generate new private key"
   - Download the JSON file
   - Replace `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env.local` with the contents of this file

This service account will automatically have the right permissions for your Firebase project.

## Quick Check: Verify Service Account Project

Run this to see which project your service account belongs to:
```bash
# In Node.js or check your .env.local
# The service account JSON has a "project_id" field
# This should ideally match your Firebase project ID
```

If they don't match, you need to grant the service account access to your Firebase project (Step 2 above).







