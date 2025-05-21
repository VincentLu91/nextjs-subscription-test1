import axios from 'axios';
import { deductUserImageGenerationToken } from '../../utils/useDatabase';

export default async function GET(req, res) {
  const { model_image, garment_image, category, user } = req.query;
  try {
    /*let result = await deductUserImageGenerationToken(user, 1);

    if (!result)
      return res.status(403).json({
        error: 'User doesnothave permission'
      });*/

    const resp = await axios.post(
      // send prediction to dashboard but it takes time to generate image
      'https://queue.fal.run/fal-ai/fashn/tryon/v1.5',
      {
        model_image: model_image,
        garment_image: garment_image,
        category: category
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
