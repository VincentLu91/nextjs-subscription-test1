import axios from 'axios';

export default async function handler(req, res) {
  const { url } = req.query;

  const output = await axios.get(url, {
    // we need to check if status of prev request is finished.
    // without the token, you couldn't get any information from the server. I tried.
    headers: {
      Authorization: 'Key ' + process.env['FAL_KEY']
    }
  });
  res.json(output.data);
}
