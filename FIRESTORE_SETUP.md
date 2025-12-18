# Firestore Setup Guide

## Setting Up Firestore Security Rules

### Step 1: Enable Firestore API

1. **Go to Google Cloud Console**
   - Visit [https://console.cloud.google.com/apis/library/firestore.googleapis.com](https://console.cloud.google.com/apis/library/firestore.googleapis.com)
   - Select your project: `tattoosuev2` (or your project ID)
   - Click "Enable"

### Step 2: Create Firestore Database

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com](https://console.firebase.google.com)
   - Select your project: `tattoosuev2`

2. **Navigate to Firestore Database**
   - Click on "Firestore Database" in the left sidebar
   - Click "Create database"
   - Choose "Start in production mode" (we'll set up rules next)
   - Select a location (choose the same region as your other services, e.g., `us-central`)
   - Click "Enable"

### Step 3: Set Up Security Rules

1. **Navigate to Firestore Rules**
   - In Firebase Console, go to "Firestore Database"
   - Click on the "Rules" tab

2. **Copy the Rules**
   - Copy the rules from `firestore.rules` file in this project
   - Or use the rules below:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Tattoos collection - stores tattoo images with price and duration estimates
    match /tattoos/{tattooId} {
      // Allow authenticated users to read tattoo data
      allow read: if request.auth != null;
      
      // Allow authenticated users to create and update tattoo estimates
      allow create: if request.auth != null 
        && request.resource.data.keys().hasAll(['fileName', 'url', 'estimatedPrice', 'estimatedDuration'])
        && request.resource.data.estimatedPrice is number
        && request.resource.data.estimatedDuration is number;
      
      allow update: if request.auth != null
        && request.resource.data.estimatedPrice is number
        && request.resource.data.estimatedDuration is number;
      
      // Allow authenticated users to delete (optional, for cleanup)
      allow delete: if request.auth != null;
    }
    
    // Deny all other collections by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. **Publish the Rules**
   - Paste the rules into the Firebase Console
   - Click "Publish" to save

### Step 4: Verify Setup

After setting up Firestore:

1. **Test the Rules**
   - Try running the estimation process from the admin page
   - Check that estimates are being saved to Firestore

2. **View Data**
   - In Firebase Console → Firestore Database → Data tab
   - You should see a `tattoos` collection
   - Each document should have:
     - `fileName` (string)
     - `url` (string)
     - `estimatedPrice` (number)
     - `estimatedDuration` (number)
     - `style`, `bodyPart`, `category`, etc.

### Rules Explanation

The rules above:
- **Require authentication**: Only logged-in users can read/write
- **Validate data**: Ensures price and duration are numbers
- **Secure by default**: All other collections are denied
- **Allow CRUD operations**: Create, read, update, and delete for authenticated users

### Alternative: More Permissive Rules (Development Only)

If you need to test without authentication, you can temporarily use:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /tattoos/{tattooId} {
      // WARNING: These rules allow anyone to read/write
      // Only use for development/testing
      allow read, write: if true;
    }
  }
}
```

⚠️ **Never use permissive rules in production!**

### Troubleshooting

**Error: "Missing or insufficient permissions"**
- Make sure you're logged in (check Firebase Auth)
- Verify the rules are published (not just saved)
- Check that the Firestore API is enabled

**Error: "Firestore API has not been used"**
- Enable the Firestore API in Google Cloud Console
- Wait a few minutes for it to propagate

**Data not saving**
- Check browser console for errors
- Verify authentication is working
- Check Firestore rules are published

### Next Steps

Once Firestore is set up:
1. Run the estimation process from the admin page
2. Estimates will be saved to Firestore automatically
3. You can view/edit data in Firebase Console






