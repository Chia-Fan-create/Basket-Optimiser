## Basket Optimiser 🛒
**A smart price comparison dashboard for everyday essentials.
Automatically scrapes product prices from Amazon, Target, and Walmart, normalizes units (e.g., oz, count), and calculates per-unit cost.
Visualizes weekly price trends and helps users build optimized shopping lists across platforms.**

This project, **Basket Optimiser**, addresses this transparency issue by building an automated Data Science and Engineering solution to standardize and visualize grocery prices.

The goal of project is to create a reliable, reproducible system that:

- **Standardizes Pricing:** Converts all disparate units of measure (weight, volume, count) into a single, comparable metric (e.g., price per 100g, price per sheet).
- **Automates Data Collection:** Utilizes scheduled web scraping pipelines to collect up-to-date pricing data from major U.S. retailers (Target, Walmart, Amazon).
- **Provides Actionable Insights:** Presents the unit-standardized prices and historical trends on a clean, accessible dashboard, empowering consumers to make the most informed purchasing decisions and combat inflation effectively.


### Background
The modern consumer faces a significant challenge when attempting to make cost-effective purchasing decisions for common household goods. Due to the proliferation of e-commerce platforms like Amazon, Target, and Walmart, the sheer volume of choices is overwhelming.

The core problem, known as price opacity, stems from the lack of standardization in product units:

1. **Inconsistent Units:** A common product, such as paper towels or chicken breast, may be priced per unit (e.g., "12 rolls"), by weight (e.g., "32 oz"), or by count (e.g., "100 sheets") across different retailers and brands.

2. **Difficult Comparison:** Manually calculating the true unit price (e.g., price per sheet, price per ounce) across multiple websites is tedious, time-consuming, and prone to human error.

This lack of standardization creates an information asymmetry, preventing shoppers from efficiently identifying the most cost-effective option and hindering optimal spending habits.

### Project Structure
```
basket-optimiser/
├── README.md
├── pyproject.toml / requirements.txt
├── .env                        # API keys, DB URL, proxies (gitignore)
│   ├── __main__.py
│   ├── config.py               # parameter, constant, store mapping
│   ├── logger.py
│   ├── db/
│   │   ├── __init__.py
│   │   ├── models.py           # PriceHistory, Product, StoreProduct
│   │   └── repository.py
│   ├── scrapers/
│   │   ├── __init__.py
│   │   ├── base_scraper.py     # search(), fetch_product()
│   │   ├── target_scraper.py
│   │   ├── walmart_scraper.py
│   │   └── amazon_scraper.py
│   ├── transformers/
│   │   └── unit_converter.py   # oz -> g, count -> unit 
│   ├── pipelines/
│   │   └── ingest_pipeline.py  # search -> fetch -> normalize -> save
│   └── scheduler/
│       └── run_schedule.py     # cron's entrypoint or airflow DAG wrapper
├── notebooks/                  # advanced analysis / debug
├── scripts/
│   └── run_once.py
├── web/                        # front end dashboard（streamlit / nextjs）
└── infra/
    └── docker/                 # Dockerfile, docker-compose
```

### Tech Stack
**Backend & Scraping:** Apify actors, JSON API ingestion, Python (requests, BeautifulSoup/Selenium), pandas \
**Data Normalization:** Python (pandas, custom unit converter) \
**Data Storage:** PostgreSQL or SQLite (for development) \
**Scheduling:** Cron jobs, optional Airflow integration \
**Frontend:** Streamlit (MVP), Next.js (for production) \
**Deployment:** Docker & docker-compose

### Future Roadmap

- [ ] User-defined grocery tracking list
- [ ] Add more online stores (e.g., Amazon, Costco, iHerb)
- [ ] Historical price forecasting with time-series models
- [ ] Email or push notifications for price drops
- [ ] Chrome extension for on-page unit price comparison
