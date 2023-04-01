import axios from 'axios';
export default async function handler(req, res) {
  const { training_id } = req.query;
  try {
    const resp = await axios.get(
      'https://dreambooth-api-experimental.replicate.com/v1/trainings/' +
        training_id,
      {
        headers: {
          Authorization: 'Token ebb9f6477f7b0b106b3e7140c141cb35431ba8ce'
        }
      }
    );
    console.log('training id response', resp); // this will print all the entire object in the console.
    res.json(resp.data); // resp is an object that contains all other kinds of object AND data you're looking for
    // send back the data
  } catch (error) {
    console.log('error', error); // this will print out error in the console.
    res.status(500).json({ error });
  }
}
