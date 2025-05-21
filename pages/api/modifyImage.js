import axios from 'axios';
import { deductUserImageGenerationToken } from '../../utils/useDatabase';

export default async function GET(req, res) {
  const { prompt, image, user } = req.query;
  try {
    /*let result = await deductUserImageGenerationToken(user, 1);

    if (!result)
      return res.status(403).json({
        error: 'User doesnothave permission'
      });*/

    const resp = await axios.post(
      // send prediction to dashboard but it takes time to generate image
      'https://queue.fal.run/fal-ai/ideogram/v3/replace-background',
      {
        image_url: image,
        prompt: prompt,
        /*ref_image_url:
          'https://storage.googleapis.com/falserverless/bria/bria_product_bg.jpg',*/
        num_results: 1
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
