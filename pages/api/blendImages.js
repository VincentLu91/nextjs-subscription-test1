import axios from 'axios';
import { deductUserImageGenerationToken } from '../../utils/useDatabase';

const BRANDPIX_SUFFIX = `
Use the exact original product from the input image without changing it.
Keep all logos, text, labels, patterns, colors, and shapes exactly the same if they are present. Do not redraw, rewrite, or warp anything on the product and do not add or remove any markings.
Only change the background, environment, and camera view to match the scene described above.
Create a high-quality commercial product photo: realistic lighting, natural shadows, and sharp focus on the product. Make sure the product is clearly visible and correctly proportioned, resting on a surface or being held in a believable way, with a clear contact shadow so it feels grounded in the scene.
Avoid distortions, blurring, extra copies of the product, or any objects that cover or hide the product.
If the product is clothing, shoes, or an accessory: keep the same silhouette and construction (seams, stitching/quilting, zippers, pockets, cuffs/collar). Keep materials and textures consistent.
If an inner lining is visible: it must remain physically attached to the inside of the garment and only appear on inside-facing surfaces (e.g., the inside edges when the garment is open). Do NOT generate the lining as a separate shirt/vest/sweater or any separate garment layer. The base layer underneath must remain whatever clothing the user described.
You may change the camera angle and framing for a better lifestyle composition, as long as the product remains the exact same item with no warping, and all branding/text/patterns remain perfectly readable and undistorted.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, images, user, image_size } = req.body; // Expect 'images' to be an array

  if (!Array.isArray(images)) {
    return res.status(400).json({ error: 'images must be an array of URLs' });
  }

  try {
    // Deduct token before making the API call
    let result = await deductUserImageGenerationToken(user, 1);

    if (!result)
      return res.status(403).json({
        error: 'User doesnothave permission'
      });

    // Append brandpix_suffix to the user's prompt
    const fullPrompt = `${prompt}\n\n${BRANDPIX_SUFFIX}`;

    const resp = await axios.post(
      //'https://queue.fal.run/fal-ai/bytedance/seedream/v4.5/edit', // seedream v4.5
      'https://queue.fal.run/fal-ai/nano-banana-pro/edit', // nano banana pro
      {
        image_urls: images, // Pass the array directly
        prompt: fullPrompt,
        num_images: 1,
        //max_images: 1,
        //enable_safety_checker: true,
        aspect_ratio: image_size // image_size in seedream, aspect_ratio in Nano Banana Pro
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
