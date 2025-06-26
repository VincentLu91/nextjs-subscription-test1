import axios from 'axios';
import { deductUserImageGenerationToken } from '../../utils/useDatabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, images, user } = req.body; // Expect 'images' to be an array

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

    const resp = await axios.post(
      'https://queue.fal.run/fal-ai/uno',
      {
        input_image_urls: images, // Pass the array directly
        prompt
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
