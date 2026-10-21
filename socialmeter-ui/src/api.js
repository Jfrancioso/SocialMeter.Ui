async function httpGet(path) {
  const res = await fetch(path); // uses vite proxy
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export function getHome(region = "US", page = 1) {
  const qs = new URLSearchParams({ region, page });
  return httpGet(`/api/home?${qs.toString()}`);
}

export async function getMovieById(id) {
  const res = await fetch(`/api/movies/${id}`);
  if (res.status === 404) throw new Error("404 Not Found");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
