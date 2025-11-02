web: gunicorn --chdir server app:app --bind 0.0.0.0:${PORT:-8000} --workers ${WEB_CONCURRENCY:-4} --timeout 120
assets: npm run build --prefix client
