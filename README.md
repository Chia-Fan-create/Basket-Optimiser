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
BASKET-OPTIMISER/
├── .venv/                      # Python virtual environment for dependency management
├── dataset/                    # Raw outputs from the web scraping process (JSON/CSV)
│   ├── dataset_Amazon-crawler_...
│   ├── dataset_Target-product_...
│   └── dataset_Walmart-product_...
├── db/                         # Data Access Layer and Database Models
│   ├── models.py               # Defines the database schema and data structures
│   └── repository.py           # Handles database interactions (CRUD operations)
├── scripts/                    # Automation and pipeline orchestration scripts
│   └── run_ingest_pipeline.py  # Script to initiate the full data ingestion process
├── transformers/               # Core data engineering and standardization logic
│   ├── cleaner.py              # Functions for data cleaning and pre-processing
│   └── unit_converter.py       # Crucial logic for standardizing product units (e.g., oz to g)
├── web/                        # Web application and front-end files
│   ├── app.py                  # Main script for the web dashboard (e.g., Streamlit/Dash app)
│   └── index.html              # Frontend template or static files (if using Flask/React)
├── .gitignore                  # Specifies files/folders to be ignored by Git
├── .python-version             # Specifies the required Python version (e.g., via pyenv)
└── README.md                   # Project documentation
```

### Tech Stack
**Backend & Scraping:** Apify actors, JSON API ingestion, Python (requests, BeautifulSoup/Selenium), pandas \
**Data Normalization:** Python (pandas, custom unit converter) \
**Data Storage:** PostgreSQL or SQLite (for development) \
**Scheduling:** Cron jobs, optional Airflow integration \
**Frontend:** Streamlit (MVP), Next.js (for production) \
**Deployment:** Docker & docker-compose

### Indexed Data Samples
- toilet paper 
- protein bar 
- paper towel 
- chicken breast


### Future Roadmap

- [ ] User-defined grocery tracking list
- [ ] Add more online stores (e.g., Amazon, Costco, iHerb)
- [ ] Historical price forecasting with time-series models
- [ ] Email or push notifications for price drops
- [ ] Chrome extension for on-page unit price comparison
