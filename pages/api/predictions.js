import axios from 'axios';
export default async function handler(req, res) {
  const { prompt } = req.query;
  // first, make an api call to GENERATE a prediction (HTTP method is POST):
  const resp = await axios.post(
    // send prediction to dashboard but it takes time to generate image
    'https://api.replicate.com/v1/predictions',
    {
      version:
        'd98c28497f972c7a6a90ee4f9052aab8ede8be5768a6ef42c6c7af5e42bd7608',
      input: {
        prompt
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
  /*{"completed_at":null,"created_at":"2022-12-04T03:27:11.586884Z","error":null,"id":"2vifastvhfgypp5g7hrbibnj3m","input":{"prompt":"a photo of a bicycle"},"logs":null,"metrics":{},"output":null,"started_at":null,"status":"starting","urls":{"get":"https://api.replicate.com/v1/predictions/2vifastvhfgypp5g7hrbibnj3m","cancel":"https://api.replicate.com/v1/predictions/2vifastvhfgypp5g7hrbibnj3m/cancel"},"version":"d98c28497f972c7a6a90ee4f9052aab8ede8be5768a6ef42c6c7af5e42bd7608","webhook_completed":null} */
  // without the image url, how do we get it? We need a second api call:
  // second, take the response object from the first call and get its json object. There we would find the 'urls' key.
  // also, the http method this time is GET
  let output = null;
  let processing = true;
  async function checkImage() {
    output = await axios.get(resp.data.urls.get, {
      // we need to check if status of prev request is finished.
      // without the token, you couldn't get any information from the server. I tried.
      headers: {
        Authorization: 'Token ebb9f6477f7b0b106b3e7140c141cb35431ba8ce',
        'Content-Type': 'application/json'
      }
    });
    processing = output.data.status !== 'succeeded';
    if (processing == true) {
      setTimeout(checkImage, 1000); // after each second if the above expression is true, run checkImage() again,
      //recursion is possible in the event of setTimeout
    } else {
      res.send(output.data.output[0]); // in place of return; this should send in the actual generated image string
      // something I learned: originally it was just output.data, which returned the whole json object when
      // the prediction has finished generating. Then I searched for the key which contained the
      // the string array with the url. It had only 1 element, so I accessed that element that is shown in the
      // res.send() call.
    }
  }
  setTimeout(checkImage, 1000);
}
