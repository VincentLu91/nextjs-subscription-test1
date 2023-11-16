import axios from 'axios';
import { CohereClient } from 'cohere-ai';
export default async function handler(req, res) {
  const { prompt } = req.query;
  try {
    const cohere = new CohereClient({
      token: process.env.NEXT_COHERE_API_KEY
    });
    //cohere.init(process.env.NEXT_COHERE_API_KEY); // This is your trial API key
    (async () => {
      const resp = await cohere.generate({
        model: 'command',
        prompt: prompt,
        max_tokens: 200,
        temperature: 0.9,
        k: 0,
        stop_sequences: [],
        return_likelihoods: 'NONE'
      });
      
      console.log(`output is: ${JSON.stringify(resp.generations[0].text)}`);
      console.log(typeof JSON.stringify(resp.generations[0].text));
      //console.log(resp.generations[0].text, '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<')

      //res.json(JSON.stringify(resp.generations[0].text));
      res.json({ text: resp.generations[0].text })
    })();
  } catch (error) {
    console.log('error', error); // this will print out error in the console.
    res.status(500).json({ error });
  }
}
