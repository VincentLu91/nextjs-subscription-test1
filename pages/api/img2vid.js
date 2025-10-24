import axios from 'axios';
import { deductUserVideoGenerationToken } from '../../utils/useDatabase';

export default async function POST(req, res) {
  // it's a POST request...
  const { prompt, image, user, aspect_ratio } = req.query;
  try {
    let result = await deductUserVideoGenerationToken(user, 1);

    if (!result)
      return res.status(403).json({
        error: 'User doesnothave permission'
      });

    const resp = await axios.post(
      // send prediction to dashboard but it takes time to generate image
      'https://queue.fal.run/fal-ai/bytedance/seedance/v1/pro/fast/image-to-video',
      {
        image_url: image,
        prompt,
        aspect_ratio: aspect_ratio
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
