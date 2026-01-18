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
   - **OR** use the rules from the `storage.rules` file in this project

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Generated images folder - allow users to upload and read their own images
    match /generated/{userId}/{fileName} {
      // Allow public read access to all generated images
      allow read: if true;
      
      // Allow users to write to their own folder (including anonymous)
      // This allows both authenticated users and anonymous uploads
      allow write: if true;
    }
    
    // All other paths - allow public read, deny writes by default
    match /{path=**} {
      // Allow public read access for all other files
      allow read: if true;
      
      // Deny writes to other paths
      allow write: if false;
    }
  }
}
```

4. **Publish the Rules**
   - Click "Publish" to save the changes

### Rules Explanation

These rules:
- **Allow public read access** to all files (including generated images)
- **Allow writes to the `generated/` folder** (so users can save their generated images)
- **Deny writes to other paths** (for security, prevents unauthorized uploads)
- **Support both authenticated and anonymous users** (files can be saved to `generated/anonymous/` or `generated/{userId}/`)

### Verify Your Setup

After updating the rules:
1. Make sure your images are uploaded to Firebase Storage
2. Check that the file naming convention matches: `style_bodypart.png`
3. Restart your Next.js dev server: `npm run dev`
4. Try generating an image and verify it can be accessed

### Common Issues

- **Still getting errors?** Make sure you've published the rules (not just saved them)
- **Images not showing?** Check the browser console for the exact path being accessed
- **Upload errors?** Make sure the rules allow writes to the `generated/` folder (the rules above do this)
- **Wrong folder?** If your images are in a subfolder, update the path in `app/page.tsx`

