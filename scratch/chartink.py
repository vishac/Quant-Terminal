import requests
from bs4 import BeautifulSoup

def get_chartink_scan(condition):
    with requests.Session() as s:
        # Get CSRF token
        r = s.get('https://chartink.com/screener/dynamic-zones-scanner-1')
        soup = BeautifulSoup(r.text, 'html.parser')
        csrf_token = soup.select_one('meta[name="csrf-token"]')['content']
        
        # Prepare headers
        headers = {
            'X-CSRF-TOKEN': csrf_token,
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
        
        # Execute scan (using a simple condition just to test the API)
        payload = {'scan_clause': condition}
        res = s.post('https://chartink.com/screener/process', headers=headers, data=payload)
        return res.json()

if __name__ == '__main__':
    # Test condition: close > 200 SMA
    cond = "( {33489} ( latest close > latest sma( latest close , 200 ) ) )"
    try:
        print(get_chartink_scan(cond))
    except Exception as e:
        print("Error:", e)
