import axios from 'axios';
import { deductUserCaptionToken } from '../../utils/useDatabase';

export default async function handler(req, res) {
  const { prompt, videoLink, user } = req.query;
  let result = await deductUserCaptionToken(user, 1);
  if (user) {
    // should be if (result) but disabling paywall
    // first, make an api call to GENERATE a prediction (HTTP method is POST):
    const resp = await axios.post(
      'https://queue.fal.run/fal-ai/video-understanding',
      {
        video_url: videoLink,
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
  } else {
    res.status(403).json({
      error: 'User doesnothave permission'
    });
  }
}
