import axios from 'axios';
import cohere from 'cohere-ai';
export default async function handler(req, res) {
  const { prompt } = req.query;
  try {
    cohere.init('q9pUdf7PjyyKMPM1Hk2Jhtv4tXJZY41dzEZ19Nuy'); // This is your trial API key
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
      console.log(`${resp.body.generations[0].text}`);
      res.json(resp.body.generations[0].text);
    })();
  } catch (error) {
    console.log('error', error); // this will print out error in the console.
    res.status(500).json({ error });
  }
}
