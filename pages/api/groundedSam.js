import axios from 'axios';
export default async function handler(req, res) {
  const { image, mask_prompt, negative_mask_prompt } = req.query;
  // first, make an api call to GENERATE a prediction (HTTP method is POST):
  const resp = await axios.post(
    // send prediction to dashboard but it takes time to generate image
    'https://api.replicate.com/v1/predictions',
    {
      version:
        'ee871c19efb1941f55f66a3d7d960428c8a5afcb77449547fe8e5a3ab9ebc21c',
      input: {
        image,
        mask_prompt,
        adjustment_factor: -15,
        negative_mask_prompt
      }
    },
    {
      headers: {
        Authorization: 'Token ebb9f6477f7b0b106b3e7140c141cb35431ba8ce',
        'Content-Type': 'application/json'
      }
    }
  );
  res.json(resp.data);
}
