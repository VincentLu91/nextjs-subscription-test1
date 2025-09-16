import axios from 'axios';
import { deductUserVideoGenerationToken } from '../../utils/useDatabase';

export default async function POST(req, res) {
  // it's a POST request...
  const { prompt, image, user } = req.query;
  try {
    let result = await deductUserVideoGenerationToken(user, 1);

    if (!result)
      return res.status(403).json({
        error: 'User doesnothave permission'
      });

    const resp = await axios.post(
      // send prediction to dashboard but it takes time to generate image
      'https://queue.fal.run/fal-ai/veo3/fast/image-to-video',
      {
        image_url: image,
        prompt,
        aspect_ratio: 'auto',
        duration: '8s', // only value by default, unfortunately. That's $1.20 per video. Expensive
        generate_audio: false, // for some reason, there's always a narrator when audio set to true.
        resolution: '720p'
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
