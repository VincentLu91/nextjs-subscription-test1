const getURL = () => {
  const url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this in production
    process?.env?.VERCEL_URL ?? // Automatically set by Vercel
    'http://localhost:3000';
  return url.includes('http') ? url : `https://${url}`;
};

const postData = ({ url, token, data = {} }) =>
  fetch(url, {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json', token }),
    credentials: 'same-origin',
    body: JSON.stringify(data)
  }).then((res) => res.json());

const toDateTime = (secs) => {
  var t = new Date('1970-01-01T00:30:00Z'); // Unix epoch start.
  t.setSeconds(secs);
  return t;
};

export { getURL, postData, toDateTime };
