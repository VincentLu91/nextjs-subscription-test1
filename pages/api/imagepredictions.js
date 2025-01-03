import axios from 'axios';
import { deductUserImageGenerationToken } from '../../utils/useDatabase';

export default async function handler(req, res) {
  const { contentPrompt, imageStyle, version, user } = req.query;
  //let result = await deductUserImageGenerationToken(user, 1);
  if (user) {
    // should be if (result) but disabling paywall
    // first, make an api call to GENERATE a prediction (HTTP method is POST):
    const resp = await axios.post(
      // send prediction to dashboard but it takes time to generate image
      'https://api.replicate.com/v1/predictions',
      {
        version,
        input: {
          prompt: contentPrompt + ' image style: ' + imageStyle,
          negative_prompt:
            '(fruits, deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime, mutated hands and fingers:1.4), (deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, disconnected limbs, mutation, mutated, ugly, disgusting, amputation'
        }
      },
      {
        headers: {
          Authorization: 'Token ebb9f6477f7b0b106b3e7140c141cb35431ba8ce',
          'Content-Type': 'application/json'
        }
      }
    );

    // then, I entered http://localhost:3000/api/predictions?prompt=a photo of a bicycle =>
    // http://localhost:3000/api/predictions?prompt=a%20photo%20of%20a%20bicycle
    // and got a json response i.e.,
    /*{"completed_at":null,"created_at":"2022-12-04T03:27:11.586884Z","error":null,"id":"2vifastvhfgypp5g7hrbibnj3m",
  "input":{"prompt":"a photo of a bicycle"},"logs":null,"metrics":{},"output":null,"started_at":null,"status":"starting",
  "urls":{"get":"https://api.replicate.com/v1/predictions/2vifastvhfgypp5g7hrbibnj3m",
  "cancel":"https://api.replicate.com/v1/predictions/2vifastvhfgypp5g7hrbibnj3m/cancel"},
  "version":"d98c28497f972c7a6a90ee4f9052aab8ede8be5768a6ef42c6c7af5e42bd7608","webhook_completed":null} */
    // without the image url, how do we get it? We need a second api call:
    // second, take the response object from the first call and get its json object. There we would find the 'urls' key.
    // also, the http method this time is GET
    //let output = null;
    //let processing = true;
    res.json(resp.data.urls);
  } else {
    res.status(403).json({
      error: 'User doesnothave permission'
    });
  }
}
