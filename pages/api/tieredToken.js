import axios from 'axios';
import { getTieredTokens } from '../../utils/useDatabase';
export default async function handler(req, res) {
  const { user, tokenType } = req.query;
  let result = await getTieredTokens(user, tokenType);
  // Allow 0 as a valid value - only reject if result is false/null/undefined
  if (typeof result === 'number') {
    res.json(result);
  } else {
    res.status(403).json({
      error: 'User does not have permission'
    });
  }
}
