import axios from 'axios';
import { deductUserTrainingToken } from '../../utils/useDatabase';

export default async function handler(req, res) {
  const {
    instance_prompt,
    class_prompt,
    instance_data,
    trainer_version,
    user
  } = req.query;
  // Access environment variable for steps
  const steps = process.env.TRAINING_STEPS || 10; // Default to 10 if not set
  //let result = await deductUserTrainingToken(user, 1);
  if (user) {
    // should be if (result) but disabling paywall
    try {
      const resp = await axios.post(
        // send prediction to dashboard but it takes time to generate image
        //'https://dreambooth-api-experimental.replicate.com/v1/trainings',
        'https://queue.fal.run/fal-ai/flux-lora-fast-training',
        {
          steps: steps,
          create_masks: true,
          trigger_word: instance_prompt,
          images_data_url: instance_data
        },
        {
          headers: {
            Authorization: 'Key ' + process.env['FAL_KEY'],
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('resp', resp); // this will print all the entire object in the console.
      res.json(resp.data); // resp is an object that contains all other kinds of object AND data you're looking for
      // send back the data
    } catch (error) {
      console.log('error', error); // this will print out error in the console.
      res.status(500).json({ error });
    }
  } else {
    res.status(403).json({
      error: 'User doesnothave permission'
    });
  }
}
