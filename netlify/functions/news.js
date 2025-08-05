import fetch from "node-fetch";

export async function handler(event) {
  const API_KEY = process.env.NEWS_API_KEY; // we'll store key in Netlify env vars
  const query = event.queryStringParameters.q || "technology";
  const page = event.queryStringParameters.page || 1;
  const pageSize = 10;

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
    query
  )}&language=en&page=${page}&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error fetching news" }),
    };
  }
}
