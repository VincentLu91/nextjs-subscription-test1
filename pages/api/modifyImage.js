import axios from 'axios';
import { deductUserImageGenerationToken } from '../../utils/useDatabase';

export default async function handler(req, res) {
  const { prompt, image, user } = req.query;
  let result = await deductUserImageGenerationToken(user, 1);
  if (result) {
    // inpainting with input image and mask provided
    const resp = await axios.post(
      // send prediction to dashboard but it takes time to generate image
      'https://api.replicate.com/v1/predictions',
      {
        version:
          'ce02013b285241316db1554f28b583ef5aaaf4ac4f118dc08c460e634b2e3e6b',
        input: {
          seed: -1,
          image,
          steps: 20,
          prompt,
          cfg_scale: 7,
          max_width: 1024,
          max_height: 1024,
          sampler_name: 'DPM++ SDE Karras',
          negative_prompt:
            '(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime, mutated hands and fingers:1.4), (deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, disconnected limbs, mutation, mutated, ugly, disgusting, amputation',
          denoising_strength: 0.75,
          only_masked_padding_pixels: 4
        }
      },
      {
        headers: {
          Authorization: 'Token ebb9f6477f7b0b106b3e7140c141cb35431ba8ce',
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(resp.data.urls);
  } else {
    res.status(403).json({
      error: 'User doesnothave permission'
    });
  }
}
