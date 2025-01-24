import axios from 'axios';
export default async function handler(req, res) {
  const { training_query } = req.query;
  try {
    const resp = await axios.get(training_query, {
      headers: {
        Authorization: 'Key ' + process.env['FAL_KEY']
      }
    });
    console.log('training id response', resp); // this will print all the entire object in the console.
    res.json(resp.data); // resp is an object that contains all other kinds of object AND data you're looking for
    // send back the data
  } catch (error) {
    console.log('error', error); // this will print out error in the console.
    res.status(500).json({ error });
  }
}
