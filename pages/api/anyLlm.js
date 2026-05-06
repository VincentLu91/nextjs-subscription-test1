import axios from 'axios';
import { deductUserImageGenerationToken } from '../../utils/useDatabase';

export default async function GET(req, res) {
  const { promptArray, user } = req.query;

  try {
    /*
    let result = await deductUserImageGenerationToken(user, 1);
    if (!result) return res.status(403).json({ error: 'User does not have permission' });
    */

    const prompt = `
You are generating a prompt for an AI image generator.

Return exactly ONE image prompt only.

Rules:
- Do not say "Sure"
- Do not say "Here is"
- Do not give options
- Do not use numbering
- Do not use markdown
- Do not wrap the prompt in quotes
- Do not explain anything
- Start directly with the visual scene description
- Write one polished prompt as a single paragraph

Use these subjects and scene instructions:
${promptArray}
`.trim();

    const resp = await axios.post(
      'https://queue.fal.run/fal-ai/any-llm',
      { prompt },
      {
        headers: {
          Authorization: 'Key ' + process.env['FAL_KEY'],
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(resp.data);
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message;
    res.status(400).json({ error: errorMessage });
  }
}
