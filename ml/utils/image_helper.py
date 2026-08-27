import requests

def fetch_image_bytes(url: str) -> bytes:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    resp = requests.get(url, headers=headers, allow_redirects=True, timeout=15)
    if resp.status_code == 200 and len(resp.content) > 1000:
        return resp.content
    
    # Try direct unsplash source if needed
    if 'unsplash.com' in url and '/photo-' in url:
        photo_id = url.split('/photo-')[1].split('?')[0]
        alt_url = f"https://images.unsplash.com/photo-{photo_id}?fm=jpg&w=600&q=80"
        resp2 = requests.get(alt_url, headers=headers, allow_redirects=True, timeout=15)
        if resp2.status_code == 200 and len(resp2.content) > 1000:
            return resp2.content

    raise ValueError(f"Failed to fetch valid image bytes from '{url}' (Status {resp.status_code}, Bytes {len(resp.content)})")
