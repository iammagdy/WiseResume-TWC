

# Fix Avatar Not Reflecting + Add Crop & AI Professional Headshot

## Issues Identified

### Issue 1: Avatar Not Reflecting on Settings Page
The avatar upload in `EditProfileSheet` works correctly - it uploads the file to Supabase Storage and updates the local `avatarUrl` state. However, **the avatar URL is only saved to the database when the user clicks "Save Changes"**.

The flow currently is:
1. User uploads photo → File goes to storage → Local state updated
2. User closes sheet without saving → Avatar URL is lost
3. Settings page reads from `profile?.avatarUrl` (database) → Shows nothing

**Root cause**: The avatar URL isn't auto-saved after upload. If the user doesn't click "Save Changes", the URL never persists to the database.

### Issue 2: No Crop/Reposition Feature
Currently, the uploaded image is used as-is without any cropping or positioning capabilities.

### Issue 3: No AI Professional Headshot Option
The user wants an AI feature to transform a casual photo into a professional headshot (person in a suit, professional background, etc.).

---

## Solution Overview

### Part 1: Auto-Save Avatar URL After Upload
When the avatar is successfully uploaded, immediately save the URL to the database so it persists even if the user doesn't click "Save Changes".

### Part 2: Add Image Cropper Component
Create a new `AvatarCropSheet` component using the `react-image-crop` library that:
- Opens after the user selects an image
- Provides circular crop area for avatar
- Allows repositioning and resizing
- Generates the cropped image before upload

### Part 3: Add AI Professional Headshot Feature
Create an edge function and UI option to:
- Send the user's photo to Lovable AI (google/gemini-2.5-flash-image)
- Use a prompt to generate a professional headshot version
- Allow the user to preview and accept/reject the result

---

## Implementation Details

### Step 1: Install react-image-crop
Add the library for image cropping functionality.

### Step 2: Create AvatarCropSheet Component
**File:** `src/components/settings/AvatarCropSheet.tsx`

```text
+------------------------------------------+
|           Crop Your Photo                |
|------------------------------------------|
|                                          |
|     +----------------------------+       |
|     |                            |       |
|     |      [Circular Crop        |       |
|     |       Area with            |       |
|     |       Drag/Resize]         |       |
|     |                            |       |
|     +----------------------------+       |
|                                          |
|  [AI Headshot ✨]                        |
|                                          |
|  [Cancel]              [Use This Photo]  |
+------------------------------------------+
```

Key features:
- Accepts the raw image file after selection
- Shows circular crop overlay (circularCrop: true)
- Locked 1:1 aspect ratio for avatar
- "AI Headshot" button to trigger AI transformation
- Generates cropped blob on confirm

### Step 3: Create AI Headshot Edge Function
**File:** `supabase/functions/generate-headshot/index.ts`

Uses the Lovable AI image generation endpoint:
- Model: `google/gemini-2.5-flash-image`
- Input: Base64 encoded user photo
- Prompt: "Transform this photo into a professional corporate headshot. The person should appear in professional business attire (suit/blazer), with a clean neutral background suitable for a resume or LinkedIn profile. Maintain the person's facial features and identity. Professional studio lighting."
- Output: Base64 encoded transformed image

### Step 4: Update EditProfileSheet Flow
**File:** `src/components/settings/EditProfileSheet.tsx`

New flow:
1. User taps camera button → Opens file picker
2. File selected → Opens `AvatarCropSheet` with the image
3. User can:
   a. Crop/reposition the image manually
   b. Tap "AI Headshot" to generate a professional version
4. User confirms → Cropped/AI image uploaded to storage
5. **Auto-save**: Avatar URL immediately saved to database (not waiting for "Save Changes")
6. Local state updated with new URL
7. Settings page reflects the change immediately

### Step 5: Auto-Save Avatar on Upload
In `handleAvatarUpload`, after successful upload:
```typescript
// After getting publicUrl, immediately save to database
await onSave({ avatarUrl: publicUrlWithCacheBust });
```

This ensures the avatar persists even if the user closes the sheet.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/settings/AvatarCropSheet.tsx` | Create | Image cropper with AI headshot option |
| `supabase/functions/generate-headshot/index.ts` | Create | AI image transformation endpoint |
| `src/components/settings/EditProfileSheet.tsx` | Modify | Integrate crop sheet, auto-save avatar |
| `package.json` | Modify | Add react-image-crop dependency |

---

## Technical Details

### react-image-crop Integration
```typescript
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

<ReactCrop
  crop={crop}
  onChange={setCrop}
  circularCrop
  aspect={1}
>
  <img src={imageSrc} ref={imgRef} />
</ReactCrop>
```

### Generating Cropped Image
Use canvas to extract the cropped region:
```typescript
function getCroppedImg(image: HTMLImageElement, crop: Crop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = crop.width;
  canvas.height = crop.height;
  
  ctx.drawImage(
    image,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, crop.width, crop.height
  );
  
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png', 1);
  });
}
```

### AI Headshot API Call
```typescript
// In edge function
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash-image',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Transform this photo into a professional corporate headshot...' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
      ]
    }],
    modalities: ['image', 'text']
  })
});

// Extract generated image
const data = await response.json();
const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
```

---

## User Experience Flow

```text
User taps camera on avatar
         ↓
  File picker opens
         ↓
  User selects photo
         ↓
+------------------------+
| AvatarCropSheet opens  |
|                        |
| - Drag to reposition   |
| - Pinch to zoom        |
| - Circular preview     |
|                        |
| [AI Headshot ✨]       |
|   ↓ (optional)         |
| +--------------------+ |
| | Generating...      | |
| +--------------------+ |
|   ↓                    |
| [Preview AI result]    |
| [Use This] [Retry]     |
|                        |
| [Cancel] [Use Photo]   |
+------------------------+
         ↓
  Upload to storage
         ↓
  Auto-save URL to DB
         ↓
  Settings page updated
```

---

## Expected Outcome

1. **Avatar reflects immediately**: After upload, the avatar appears on the Settings page right away (no need to click Save)
2. **Crop/reposition**: Users can adjust their photo before uploading
3. **AI Professional Headshot**: One-tap option to transform a casual photo into a professional headshot suitable for resumes and LinkedIn

