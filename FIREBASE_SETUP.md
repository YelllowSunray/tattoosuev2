# Firebase Storage Setup Guide

## Permission Error Fix

If you're seeing the error: `Firebase Storage: User does not have permission to access`

You need to update your Firebase Storage security rules to allow public read access.

### Steps:

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com](https://console.firebase.google.com)
   - Select your project: `tattoosuev2`

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - Click on the "Rules" tab

3. **Update the Rules**
   - Replace the existing rules with the following:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Allow public read access
      allow read: if true;
      // Deny all writes (for security)
      allow write: if false;
    }
  }
}
```

4. **Publish the Rules**
   - Click "Publish" to save the changes

### Alternative: More Secure Rules (Recommended for Production)

If you want more control, you can restrict to specific file types:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Allow read for image files only
      allow read: if request.resource.contentType.matches('image/.*');
      // Deny all writes
      allow write: if false;
    }
  }
}
```

### Verify Your Setup

After updating the rules:
1. Make sure your images are uploaded to Firebase Storage
2. Check that the file naming convention matches: `style_bodypart.png`
3. Restart your Next.js dev server: `npm run dev`

### Common Issues

- **Still getting errors?** Make sure you've published the rules (not just saved them)
- **Images not showing?** Check the browser console for the exact path being accessed
- **Wrong folder?** If your images are in a subfolder, update the path in `app/page.tsx`

