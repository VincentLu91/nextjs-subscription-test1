import axios from 'axios';
import { getTokens } from '../../utils/useDatabase';
export default async function handler(req, res) {
  const { user, tokenType } = req.query;
  let result = await getTokens(user, tokenType);
  if (result) {
    //
    res.json(result);
  } else {
    res.status(403).json({
      error: 'User doesnothave permission'
    });
  }
}
