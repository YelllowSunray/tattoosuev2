# Fix Service Account Permissions for Firestore

## The Problem
You're getting `PERMISSION_DENIED: Missing or insufficient permissions` because your service account doesn't have access to Firestore in your Firebase project.

## Solution: Grant IAM Role to Service Account

### Step 1: Find Your Service Account Email

1. Open your `.env.local` file
2. Find `GOOGLE_SERVICE_ACCOUNT_JSON`
3. Copy the JSON and find the `client_email` field
   - It looks like: `your-service-account@project-id.iam.gserviceaccount.com`

### Step 2: Grant Cloud Datastore User Role

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/iam-admin/iam
   - Make sure you select your Firebase project: `tattoosuev2`

2. **Add the Service Account**
   - Click "Grant Access" (or "Add" button)
   - In "New principals", paste the service account email from Step 1
   - In "Select a role", search for: **`Cloud Datastore User`**
   - Click "Save"

3. **Wait 1-2 minutes** for permissions to propagate

### Step 3: Verify

Try running the estimation again. The data should now save to Firestore.

## Alternative: Use Firebase-Generated Service Account

If the above doesn't work, use a service account generated directly from Firebase:

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `tattoosuev2`

2. **Go to Project Settings**
   - Click the gear icon → "Project settings"
   - Go to "Service accounts" tab

3. **Generate New Private Key**
   - Click "Generate new private key"
   - Download the JSON file
   - Copy the entire JSON content

4. **Update `.env.local`**
   - Replace `GOOGLE_SERVICE_ACCOUNT_JSON` with the new JSON content
   - Make sure it's all on one line or properly escaped

This service account will automatically have the right permissions for your Firebase project.






