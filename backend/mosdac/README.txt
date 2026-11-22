Put MOSDAC's mdapi.py and your config.json in this folder (download: https://mosdac.gov.in/software/mdapi.zip).
config.json holds your MOSDAC login, so it is git-ignored. Set the download folder inside it to ../data/insat.
Run:  python mdapi.py   (schedule it every 30 minutes with cron or Windows Task Scheduler)
Then open http://localhost:8000/api/insat/inspect to find the dataset names for backend/.env.
