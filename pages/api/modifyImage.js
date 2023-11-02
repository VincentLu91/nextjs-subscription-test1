import axios from 'axios';
export default async function handler(req, res) {
  const { prompt, image, mask } = req.query;
  // inpainting with input image and mask provided
  const resp = await axios.post(
    // send prediction to dashboard but it takes time to generate image
    'https://api.replicate.com/v1/predictions',
    {
      // Stable Diffusion Inpainting
      // https://replicate.com/stability-ai/stable-diffusion-inpainting
      version:
        'c11bac58203367db93a3c552bd49a25a5418458ddffb7e90dae55780765e26d6',
      input: {
        prompt,
        mask,
        //seed: 32,
        image,
        width: 1024,
        height: 1024,
        //refine: 'base_image_refiner',
        scheduler: 'DPMSolverMultistep', //'KarrasDPM',
        //lora_scale: 0.6,
        num_outputs: 1,
        guidance_scale: 7.5,
        //apply_watermark: false,
        //high_noise_frac: 0.8,
        negative_prompt: 'low resolution, ugly',
        //prompt_strength: 0.8,
        num_inference_steps: 25
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
}
