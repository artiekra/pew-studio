import requests

cookies = {'session': 'Wu7QqyTH3IUpQqF4E94Lx'}
headers = {'User-Agent': 'Mozilla/5.0'}

# Test 3: name="test/manifest.json" filename="manifest.json"
files3 = {
    'test/manifest.json': ('manifest.json', '{"name":"test3"}', 'application/json')
}
r3 = requests.post('https://pewpew.live/account/upload-level', cookies=cookies, headers=headers, files=files3)
print("Test 3 (path as name, with filename):", r3.status_code, r3.text)

# Test 4: name="test/manifest.json" filename="test/manifest.json"
files4 = {
    'test/manifest.json': ('test/manifest.json', '{"name":"test4"}', 'application/json')
}
r4 = requests.post('https://pewpew.live/account/upload-level', cookies=cookies, headers=headers, files=files4)
print("Test 4 (path as name, path as filename):", r4.status_code, r4.text)

