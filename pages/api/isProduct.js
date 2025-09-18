import axios from 'axios';

export default async function handler(req, res) {
  const { prompt, imageLink, user } =
    req.method === 'POST' ? req.body : req.query;
  if (user) {
    // first, make an api call to GENERATE a prediction (HTTP method is POST):
    const resp = await axios.post(
      // send prediction to dashboard but it takes time to generate image
      // model: https://replicate.com/yorickvp/llava-13b
      'https://api.replicate.com/v1/predictions',
      {
        version:
          'a0fdc44e4f2e1f20f2bb4e27846899953ac8e66c5886c5878fa1d6b73ce009e5',
        input: {
          image: imageLink,
          top_p: 1,
          prompt: prompt,
          max_tokens: 1024,
          temperature: 0.5
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
  } else {
    res.status(403).json({
      error: 'User doesnothave permission'
    });
  }
}
