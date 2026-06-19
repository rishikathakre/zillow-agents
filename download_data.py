import requests, os
os.makedirs("data", exist_ok=True)

files = {
    "data/zillow_prices.csv": "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    "data/zillow_rent.csv": "https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_uc_sfrcondomfr_sm_month.csv",
}
for path, url in files.items():
    print(f"Downloading {path}...")
    r = requests.get(url, timeout=60)
    with open(path, "wb") as f:
        f.write(r.content)
    print(f"Done - {len(r.content)//1024}KB")
