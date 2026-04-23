# SmartCart

SmartCart compares grocery prices across Amazon, Target, and Walmart by normalizing all listings to a consistent unit price — so you always know the true cost per ounce, roll, or count, regardless of pack size. It also tracks your shopping lists, household inventory, spending trends, and price alerts in one place.

---

## Repository Structure

```
Basket-Optimiser/
├── backend/              # Flask REST API
│   ├── routes/           # Blueprint route handlers (one file per feature)
│   ├── tests/            # Backend unit tests
│   ├── app.py            # App entry point
│   ├── auth.py           # JWT authentication helpers
│   ├── config.py         # Loads environment variables
│   ├── db.py             # MySQL connection pool
│   ├── sql_loader.py     # Utility for loading .sql query files
│   ├── requirements.txt  # Python dependencies
│   └── .env.example      # Environment variable template
├── db/
│   ├── queries/          # SQL query files used by the backend
│   └── schema.sql        # Full database DDL (tables, indexes, views)
├── docs/                 # Project documentation
└── front-end/            # React single-page application
    ├── public/
    └── src/
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18.2, React Router 6.30 |
| Backend | Python 3.9+, Flask 3.1, flask-cors 5.x |
| Database | MySQL 8.0 (hosted on class server) |
| Auth | PyJWT 2.10, bcrypt 4.3 |
| DB Driver | pymysql 1.1, python-dotenv 1.1 |

---

## Setup & Installation

### Prerequisites

- Python 3.9+
- Node.js 18+ — install via [nodejs.org](https://nodejs.org) or `brew install node` (macOS)
- Access to the class MySQL server (Pitt PeopleSoft ID required)

### 1. Clone the Repository

```bash
git clone git@github.com:Chia-Fan-create/Basket-Optimiser.git
cd Basket-Optimiser
```

### 2. Configure the Backend

Copy the environment template and fill in your credentials:

```bash
cd backend
cp .env.example .env
```

Open `.env` and update `DB_USER` and `DB_PASSWORD` with your own values:

```dotenv
DB_HOST=167.71.90.83
DB_PORT=3306
DB_NAME=smartcart
DB_USER=<your_peoplesoft_id>
DB_PASSWORD=<your_db_password>
JWT_SECRET=change-me-to-a-random-string
FLASK_PORT=50123
```

> **Note:** `DB_USER` is your Pitt PeopleSoft ID. `DB_PASSWORD` follows the rule provided by the instructor at the beginning of the semester.

### 3. Install Backend Dependencies

From inside the `backend/` folder:

```bash
python3 -m venv venv
source venv/bin/activate          # macOS / Linux
# venv\Scripts\activate           # Windows
pip install -r requirements.txt
```

### 4. Install Frontend Dependencies

```bash
cd ../front-end
npm install
```

---

## Running the App

### Start the Backend

```bash
cd backend
source venv/bin/activate
python3 app.py 50123          # Runs on http://localhost:50123
```

### Start the Frontend

```bash
cd front-end
npm start              # Runs on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The frontend proxies all `/api/*` requests to the Flask backend on port 50123.

---

## Demo Accounts

All demo accounts use the password `password123`:

| Email | Name |
|-------|------|
| alex.lee@example.com | Alex Lee |
| maria.chen@example.com | Maria Chen |
| sam.patel@example.com | Sam Patel |
| jordan.kim@example.com | Jordan Kim |
| taylor.nguyen@example.com | Taylor Nguyen |

---

## Team

| Role | Name | Folder | Responsibilities |
|------|------|--------|-----------------|
| **Frontend** | Fran Hsu | `front-end/` | React pages, API calls, UI rendering |
| **Backend** | Johnson Jao | `backend/` | Flask routes, JWT authentication, SQL integration, JSON responses |
| **Database** | Allen Jung | `db/` | Schema design, SQL queries, seed data, scraping scripts |
