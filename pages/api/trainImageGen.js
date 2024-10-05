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
  let result = await deductUserTrainingToken(user, 1);
  if (result) {
    try {
      const resp = await axios.post(
        // send prediction to dashboard but it takes time to generate image
        //'https://dreambooth-api-experimental.replicate.com/v1/trainings',
        'https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/' +
          trainer_version +
          '/trainings',
        {
          destination: 'vincentlu91/flux-tuning',
          input: {
            trigger_word: instance_prompt,
            learning_rate: 0.0004,
            input_images: instance_data,
            autocaption_prefix: `a photo of a ${instance_prompt} ${class_prompt}`,
            lora_rank: 16,
            steps: parseInt(steps) // Use the environment variable for steps
          }
          //model: 'vincentlu91/vincelubooth',
          //trainer_version,
          //webhook_completed: 'https://example.com/dreambooth-webhook'
        },
        {
          headers: {
            Authorization: 'Token ebb9f6477f7b0b106b3e7140c141cb35431ba8ce',
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
