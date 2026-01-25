# Bug Analysis: Photos Not Storing in Supabase

## Date: January 25, 2026

## Problem

Generated images are no longer being stored in the Supabase `photos` table. API requests are visible in Vercel logs, but database inserts are failing silently.

## Root Cause

**This is NOT a storage quota issue!**

The problem is a **foreign key constraint violation**. The code is using the wrong user ID field when inserting photos.

### The Issue:

```javascript
// INCORRECT - Currently in code
await supabase.from('photos').insert({
  customer_id: user.identities[0].id, // ❌ This is the identity provider ID (Google/GitHub)
  photo_url: data.publicUrl
});
```

### Why This Fails:

1. **Schema Constraint**: The `photos` table has a foreign key constraint:

   ```sql
   FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id")
   ```

2. **Customer Table Constraint**: The `customers` table references:

   ```sql
   FOREIGN KEY ("id") REFERENCES "auth"."users"("id")
   ```

3. **The Problem**:
   - `user.identities[0].id` = Identity provider's user ID (e.g., Google's ID for the user)
   - `user.id` = Supabase auth user ID (the actual UUID in the `customers` table)
4. **Result**: The insert fails silently because there's no customer record with the identity provider's ID, violating the foreign key constraint.

## Solution

Change all instances of `user.identities[0].id` to `user.id` when inserting into the `photos` table.

### Files Affected:

- `pages/ai-studio.js`
- `pages/image-gallery.js`
- `pages/replace-bg.js`
- `pages/generate-apparel.js`
- `pages/pix-blender.js`
- `pages/video-gallery.js` (if applicable)

### Correct Code:

```javascript
// CORRECT
await supabase.from('photos').insert({
  customer_id: user.id, // ✅ This is the Supabase auth user ID
  photo_url: data.publicUrl
});
```

## Why This Worked Before

The code likely worked initially when both IDs happened to match, or the constraint wasn't properly enforced. As the system evolved and authentication providers were integrated, the distinction between `user.id` and `user.identities[0].id` became critical.

## Testing After Fix

After applying the fix, verify:

1. Generate a new image
2. Check Supabase `photos` table for new entries
3. Verify the `customer_id` matches the user's ID in the `customers` table
4. Check browser console and Supabase logs for any errors
