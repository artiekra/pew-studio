import requests

cookies = {'session': 'Wu7QqyTH3IUpQqF4E94Lx'}
headers = {'User-Agent': 'Mozilla/5.0'}

# Test 1: name="files" filename="test/manifest.json"
files1 = {
    'files': ('test/manifest.json', '{"name":"test1"}', 'application/json')
}
r1 = requests.post('https://pewpew.live/account/upload-level', cookies=cookies, headers=headers, files=files1)
print("Test 1 (files array):", r1.status_code, r1.text)

# Test 2: name="test/manifest.json" without filename
files2 = {
    'test/manifest.json': (None, '{"name":"test2"}')
}
r2 = requests.post('https://pewpew.live/account/upload-level', cookies=cookies, headers=headers, files=files2)
print("Test 2 (path as name):", r2.status_code, r2.text)

