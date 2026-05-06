import axios from 'axios';
import { deductUserImageGenerationToken } from '../../utils/useDatabase';

const BRANDPIX_SUFFIX = `
Edit the provided photo(s).

KEEP EACH INPUT PRODUCT EXACTLY THE SAME (highest priority):
- For every product shown in the input images, keep that product exactly the same.
- Do not redraw or alter any bottle or label in any way (no changes to text, fonts, logo, colors, shapes, patterns, materials, or markings).
- Do not retouch, re-render, “clean up”, enhance, or sharpen the label/text.
- Do not generate any new text.
- Do not swap details between products. Each product must keep its own original label/color/design.

ONLY CHANGE:
- Only change the background, surface, environment, props, and scene lighting to match the requested scene.
- Keep the products’ perspective/camera angle the same unless the scene explicitly requests tilt/angle.

COMPOSITION:
- Keep all products fully visible and unobstructed. No covering the labels.
- No extra products/duplicates.

APPAREL (only if applicable):
- If the product is clothing/shoes/accessories, keep the same silhouette and construction (seams, stitching, zippers, pockets, cuffs/collar). No added layers.
`;

const REFERENCE_HANDLING = `
Reference handling:
- The main product image is the source of truth for the product.
- Preserve the product exactly.
- If no scene/style/composition reference images are provided, follow the style preset strongly.
- If scene/style/composition reference images are provided, use them as primary visual guidance and use the style preset only as secondary guidance.
- If additional images are product or person references, use them only for subject/content guidance, not to override the overall preset unless explicitly requested.
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    prompt,
    images,
    productImageUrls = [],
    productImageUrl,
    referenceImageUrls = [],
    user,
    image_size,
    stylePrompt
  } = req.body;

  const hasMultiProductUrls =
    Array.isArray(productImageUrls) && productImageUrls.length > 0;

  const imageUrlsForEdit = hasMultiProductUrls
    ? [...productImageUrls, ...referenceImageUrls]
    : productImageUrl
      ? [productImageUrl, ...referenceImageUrls]
      : images;

  console.log('BrandPix image roles:', {
    productImageCount: hasMultiProductUrls
      ? productImageUrls.length
      : productImageUrl
        ? 1
        : 0,
    referenceImageCount: referenceImageUrls.length,
    totalImageUrlsForEdit: imageUrlsForEdit?.length || 0
  });

  if (!Array.isArray(imageUrlsForEdit) || imageUrlsForEdit.length === 0) {
    return res
      .status(400)
      .json({ error: 'imageUrlsForEdit must be an array of URLs' });
  }

  try {
    // Deduct token before making the API call
    let result = await deductUserImageGenerationToken(user, 1);

    if (!result)
      return res.status(403).json({
        error: 'User doesnothave permission'
      });

    // Append brandpix_suffix to the user's prompt
    //const fullPrompt = `${prompt}\n\n${BRANDPIX_SUFFIX}`;
    const fullPrompt = `User request: ${prompt}\n\n${stylePrompt}\n\n${REFERENCE_HANDLING}`;

    const resp = await axios.post(
      //'https://queue.fal.run/fal-ai/bytedance/seedream/v5/lite/edit', // seedream v5 lite
      'https://queue.fal.run/fal-ai/nano-banana-2/edit', // nano banana pro
      {
        image_urls: imageUrlsForEdit, // Pass the array directly
        prompt: fullPrompt,
        num_images: 1,
        //max_images: 1,
        //enable_safety_checker: true,
        image_size: image_size // image_size in seedream, aspect_ratio in Nano Banana Pro
      },
      {
        headers: {
          Authorization: 'Key ' + process.env['FAL_KEY'],
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(resp.data);
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message;
    res.status(400).json({
      error: errorMessage
    });
  }
}
