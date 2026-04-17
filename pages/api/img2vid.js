import axios from 'axios';
import { deductUserVideoGenerationToken } from '../../utils/useDatabase';

export default async function POST(req, res) {
  // it's a POST request...
  const {
    user_prompt,
    image,
    user,
    aspect_ratio,
    duration,
    durationValue,
    videoTypePrompt,
    videoLocationSettingPrompt,
    videoMotionTypePrompt
  } = req.query;
  try {
    let result = await deductUserVideoGenerationToken(user, durationValue);

    if (!result)
      return res.status(403).json({
        error: 'User doesnothave permission'
      });

    const fullPrompt = `Create a short ${duration} ecommerce social video from the provided source image.

Source image rules:
- The source image is the visual anchor and source of truth.
- Preserve the main product’s identity, shape, material, color, branding, and overall appearance.
- Do not replace the product with a different item.
- Keep the product as the clear focal point of the video.

Video direction:
- Video type: ${videoTypePrompt}
- Setting: ${videoLocationSettingPrompt}
- Motion style: ${videoMotionTypePrompt}

Creative intent:
Generate a polished short-form social media style video that feels natural, visually appealing, and commercially usable.
${user_prompt}

Output guidance:
- Keep motion coherent and believable.
- Avoid excessive distortion, flicker, warping, or identity drift.
- Keep the scene focused and uncluttered.
- Emphasize the product clearly throughout the clip.`;
    const resp = await axios.post(
      // send prediction to dashboard but it takes time to generate image
      'https://queue.fal.run/fal-ai/veo3.1/lite/image-to-video',
      {
        image_url: image,
        prompt: fullPrompt,
        aspect_ratio: aspect_ratio,
        duration: duration
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
